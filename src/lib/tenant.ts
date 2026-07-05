import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { TenantBranding } from "@/db/schema";
import { tenantOperative } from "@/lib/plans";

/**
 * Resolución de tenant por request (ver ARCHITECTURE_SAAS.md).
 * El middleware setea:
 *   x-tenant-key:  "slug:{slug}" | "domain:{host}"   (ausente = realm plataforma)
 *   x-tenant-base: "/{slug}" | ""                     (prefijo para links/fetch)
 */

export type TenantRow = typeof schema.tenants.$inferSelect;

export type TenantCtx = {
  tenant: TenantRow;
  /** Prefijo de rutas públicas de este request ("/cristianhdz" o "" en dominio propio). */
  basePath: string;
  branding: ResolvedBranding;
  /** Prefija un path interno: tp("/login") → "/cristianhdz/login" o "/login". */
  tp: (path: string) => string;
  /** true si el tenant está suspendido / trial vencido (se muestra aviso, no el sitio). */
  operative: boolean;
};

export type ResolvedBranding = Required<
  Pick<TenantBranding, "siteName" | "accent" | "ink" | "bg" | "navBg" | "navText" | "buttonText" | "footerText">
> &
  Omit<TenantBranding, "siteName" | "accent" | "ink" | "bg" | "navBg" | "navText" | "buttonText" | "footerText">;

export const BRANDING_DEFAULTS = {
  accent: "#C8A951",
  ink: "#0A1E3A",
  bg: "#FBFAF5",
  navBg: "#0B2548",
  navText: "#FFFFFF",
  buttonText: "#0A1E3A",
  footerText: "",
} as const;

export function resolveBranding(t: TenantRow): ResolvedBranding {
  const b = (t.branding ?? {}) as TenantBranding;
  return {
    ...b,
    siteName: b.siteName || t.name,
    accent: b.accent || BRANDING_DEFAULTS.accent,
    ink: b.ink || BRANDING_DEFAULTS.ink,
    bg: b.bg || BRANDING_DEFAULTS.bg,
    navBg: b.navBg || BRANDING_DEFAULTS.navBg,
    navText: b.navText || BRANDING_DEFAULTS.navText,
    buttonText: b.buttonText || BRANDING_DEFAULTS.buttonText,
    footerText: b.footerText ?? "",
  };
}

function normHost(host: string): string {
  let h = host.toLowerCase().trim();
  if (h.endsWith(".")) h = h.slice(0, -1);
  h = h.replace(/:\d+$/, "");
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

/**
 * Tenant del request actual (cacheado por request). null = realm plataforma
 * (mimarca.app raíz: landing, /crear, /superadmin) o tenant inexistente.
 */
export const getTenantCtx = cache(async (): Promise<TenantCtx | null> => {
  const h = await headers();
  const key = h.get("x-tenant-key");
  if (!key) return null;

  let row: TenantRow | undefined;
  if (key.startsWith("slug:")) {
    const slug = key.slice(5).toLowerCase();
    [row] = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug)).limit(1);
  } else if (key.startsWith("domain:")) {
    const domain = normHost(key.slice(7));
    [row] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.customDomain, domain))
      .limit(1);
  }
  if (!row) return null;

  const basePath = h.get("x-tenant-base") ?? "";
  const tp = (path: string) => {
    if (!basePath) return path;
    if (!path.startsWith("/")) return path; // externas / relativas: no tocar
    return path === "/" ? basePath : `${basePath}${path}`;
  };

  return {
    tenant: row,
    basePath,
    branding: resolveBranding(row),
    tp,
    operative: tenantOperative(row),
  };
});

/** Igual que getTenantCtx pero lanza 404-able si no hay tenant en el request. */
export async function requireTenantCtx(): Promise<TenantCtx> {
  const ctx = await getTenantCtx();
  if (!ctx) throw new Error("tenant_not_found");
  return ctx;
}

/** Para API routes: contexto o respuesta 404 JSON estándar. */
export async function tenantOr404(): Promise<TenantCtx | null> {
  return getTenantCtx();
}

/** ¿Este request es del realm plataforma (mimarca.app raíz)? */
export async function isPlatformRealm(): Promise<boolean> {
  const h = await headers();
  return !h.get("x-tenant-key");
}
