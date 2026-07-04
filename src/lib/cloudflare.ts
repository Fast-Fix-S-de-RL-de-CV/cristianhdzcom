import "server-only";

/**
 * Helpers de Cloudflare para dominios personalizados de tenants
 * (patrón rifabase EXACTO — ver ARCHITECTURE_SAAS.md "Dominios personalizados").
 *
 * Flujo: el admin del tenant agrega su dominio → creamos/reusamos la zona CF,
 * SSL full, CNAME @/www → mimarca.app (proxied) y worker routes al worker
 * `mimarca-proxy`. El cliente solo cambia los nameservers en su registrador.
 *
 * Env:
 *   CLOUDFLARE_API_TOKEN   — token con permisos Zone.Zone, Zone.DNS, Zone.Workers Routes
 *   CLOUDFLARE_WORKER_NAME — nombre del worker (default "miapp-worker")
 */

const CF_API = "https://api.cloudflare.com/client/v4";

type CfError = { code: number; message: string };

type CfResponse<T> = {
  success: boolean;
  errors?: CfError[];
  result: T | null;
};

export class CloudflareError extends Error {
  errors: CfError[];
  constructor(message: string, errors?: CfError[]) {
    super(message);
    this.name = "CloudflareError";
    this.errors = errors ?? [];
  }
}

export function cloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN);
}

function cfHeaders(): Record<string, string> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new CloudflareError("CLOUDFLARE_API_TOKEN no configurado en el servidor");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<CfResponse<T>> {
  const res = await fetch(`${CF_API}${path}`, { ...init, headers: cfHeaders() });
  return (await res.json()) as CfResponse<T>;
}

/** ¿Alguno de los errores CF trae este código? (para ignorar "ya existe"). */
function hasCode(errors: CfError[] | undefined, code: number): boolean {
  return Boolean(errors?.some((e) => e.code === code));
}

/**
 * Normaliza un dominio capturado por el usuario (quita protocolo, path,
 * puerto, punto final y "www."). Devuelve null si el formato es inválido.
 */
export function normalizeDomain(input: string): string | null {
  let d = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (d.endsWith(".")) d = d.slice(0, -1);
  if (d.startsWith("www.")) d = d.slice(4);
  if (d.length < 4 || d.length > 140) return null;
  if (d.includes("..")) return null;
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(d)) return null;
  return d;
}

type CfZone = { id: string; status?: string; name_servers?: string[] };

/**
 * Busca la zona por nombre (idempotencia) o la crea.
 * Devuelve zoneId + nameservers que el cliente debe poner en su registrador.
 */
export async function ensureZone(domain: string): Promise<{ zoneId: string; nameservers: string[] }> {
  const existing = await cfFetch<CfZone[]>(`/zones?name=${encodeURIComponent(domain)}`);
  const zone = existing.result?.[0];
  if (zone) {
    console.log(`[Domain] Zona existente reutilizada para ${domain}: ${zone.id}`);
    return { zoneId: zone.id, nameservers: zone.name_servers ?? [] };
  }

  const created = await cfFetch<CfZone>("/zones", {
    method: "POST",
    body: JSON.stringify({ name: domain, jump_start: false }),
  });
  if (!created.success || !created.result) {
    console.error("[Domain] Error creando zona CF:", created.errors);
    throw new CloudflareError("No se pudo crear la zona en Cloudflare", created.errors);
  }
  console.log(`[Domain] Zona creada para ${domain}: ${created.result.id}`);
  return { zoneId: created.result.id, nameservers: created.result.name_servers ?? [] };
}

/** SSL en modo "full" (el origen mimarca.app ya tiene HTTPS). No fatal si falla. */
export async function setSslFull(zoneId: string): Promise<void> {
  const data = await cfFetch<unknown>(`/zones/${zoneId}/settings/ssl`, {
    method: "PATCH",
    body: JSON.stringify({ value: "full" }),
  });
  if (!data.success) console.error("[Domain] Error SSL:", data.errors);
}

/** CNAME @ y www → target (proxied). Ignora 81057 = record already exists. */
export async function upsertCnames(zoneId: string, target = "mimarca.app"): Promise<void> {
  for (const name of ["@", "www"]) {
    const data = await cfFetch<unknown>(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({ type: "CNAME", name, content: target, proxied: true }),
    });
    if (!data.success && !hasCode(data.errors, 81057)) {
      console.error(`[Domain] Error CNAME ${name}:`, data.errors);
    }
  }
}

/**
 * Worker routes (3 patrones, como rifabase) → worker proxy.
 * Ignora 10020 = route already exists.
 */
export async function addWorkerRoutes(
  zoneId: string,
  domain: string,
  script = process.env.CLOUDFLARE_WORKER_NAME || "miapp-worker",
): Promise<void> {
  for (const pattern of [domain, `${domain}/*`, `*.${domain}/*`]) {
    const data = await cfFetch<unknown>(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: JSON.stringify({ pattern, script }),
    });
    if (!data.success && !hasCode(data.errors, 10020)) {
      console.error(`[Domain] Error Worker Route ${pattern}:`, data.errors);
    }
  }
}

type CfRoute = { id: string; pattern: string; script?: string };

/**
 * Borra las worker routes de este dominio (teardown al desvincular).
 * NO borra la zona: si el cliente reconecta el dominio, `ensureZone` la
 * reutiliza y `addWorkerRoutes` las vuelve a crear.
 */
export async function removeWorkerRoutes(zoneId: string, domain: string): Promise<void> {
  const list = await cfFetch<CfRoute[]>(`/zones/${zoneId}/workers/routes`);
  const targets = new Set([domain, `${domain}/*`, `*.${domain}/*`]);
  for (const route of list.result ?? []) {
    if (!targets.has(route.pattern)) continue;
    const data = await cfFetch<unknown>(`/zones/${zoneId}/workers/routes/${route.id}`, {
      method: "DELETE",
    });
    if (!data.success) {
      console.error(`[Domain] Error borrando Worker Route ${route.pattern}:`, data.errors);
    }
  }
}

/**
 * Estado de la zona: "pending" (nameservers sin cambiar aún) | "active" | etc.
 * "active" = el dominio ya está verificado.
 */
export async function getZoneStatus(zoneId: string): Promise<string> {
  const data = await cfFetch<CfZone>(`/zones/${zoneId}`);
  return data.result?.status ?? "unknown";
}
