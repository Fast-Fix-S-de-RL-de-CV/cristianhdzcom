import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { canUseCustomDomain } from "@/lib/plans";
import {
  CloudflareError,
  addWorkerRoutes,
  cloudflareConfigured,
  ensureZone,
  getZoneStatus,
  normalizeDomain,
  removeWorkerRoutes,
  setSslFull,
  upsertCnames,
} from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

/**
 * Dominio personalizado del tenant (patrón rifabase vía Cloudflare).
 *
 * POST   {domain} — plan pro: crea/reusa zona CF, SSL full, CNAMEs y worker
 *                   routes; guarda customDomain + zoneId + nameservers.
 * GET             — estado actual; si la zona ya está "active" marca
 *                   domainVerified=true. Devuelve {domain, verified, nameservers}.
 * DELETE          — desvincula el dominio (NO borra la zona en Cloudflare).
 */

const postBody = z.object({
  domain: z.string().min(4).max(200),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let data;
  try {
    data = postBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const domain = normalizeDomain(data.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "invalid_domain", message: "Formato de dominio inválido (ej: tumarca.com)" },
      { status: 400 },
    );
  }
  // Nunca permitir el dominio de la plataforma como "custom".
  if (domain === "mimarca.app" || domain.endsWith(".mimarca.app")) {
    return NextResponse.json(
      { error: "invalid_domain", message: "Ese dominio pertenece a la plataforma" },
      { status: 400 },
    );
  }

  // Gate de plan: dominio propio solo en plan pro.
  if (!canUseCustomDomain(ctx.tenant)) {
    return NextResponse.json({ error: "plan_upgrade_required" }, { status: 403 });
  }

  // Unicidad: ningún otro tenant puede tener ese dominio.
  const [conflict] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(and(eq(schema.tenants.customDomain, domain), ne(schema.tenants.id, ctx.tenant.id)))
    .limit(1);
  if (conflict) {
    return NextResponse.json(
      { error: "domain_in_use", message: "Ese dominio ya está vinculado a otra plataforma" },
      { status: 409 },
    );
  }

  if (!cloudflareConfigured()) {
    return NextResponse.json(
      { error: "cloudflare_not_configured", message: "CLOUDFLARE_API_TOKEN no configurado en el servidor" },
      { status: 500 },
    );
  }

  try {
    const { zoneId, nameservers } = await ensureZone(domain);
    await setSslFull(zoneId);
    await upsertCnames(zoneId, "mimarca.app");
    await addWorkerRoutes(zoneId, domain);

    await db
      .update(schema.tenants)
      .set({
        customDomain: domain,
        cloudflareZoneId: zoneId,
        cloudflareNameservers: nameservers,
        domainVerified: false,
      })
      .where(eq(schema.tenants.id, ctx.tenant.id));

    console.log(`[Domain] ${domain} configurado para tenant ${ctx.tenant.slug}`);
    return NextResponse.json({ domain, nameservers });
  } catch (e) {
    console.error("[Domain] Error al configurar dominio:", e);
    const message =
      e instanceof CloudflareError ? e.message : "Error interno al configurar el dominio";
    return NextResponse.json({ error: "cloudflare_error", message }, { status: 502 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const t = ctx.tenant;
  if (!t.customDomain) {
    return NextResponse.json({ domain: null, verified: false, nameservers: [] });
  }

  let verified = t.domainVerified;
  if (t.cloudflareZoneId && !verified && cloudflareConfigured()) {
    try {
      const status = await getZoneStatus(t.cloudflareZoneId);
      if (status === "active") {
        verified = true;
        await db
          .update(schema.tenants)
          .set({ domainVerified: true })
          .where(eq(schema.tenants.id, t.id));
      }
    } catch (e) {
      // Cloudflare caído: reporta el estado guardado sin romper el admin.
      console.error("[Domain] Error consultando estado de zona:", e);
    }
  }

  return NextResponse.json({
    domain: t.customDomain,
    verified,
    nameservers: t.cloudflareNameservers ?? [],
  });
}

export async function DELETE() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const t = ctx.tenant;

  // Teardown en Cloudflare: quita las worker routes para que el worker deje de
  // proxyar este dominio (el check-domain ya devolvería 404, pero además
  // limpiamos las rutas). La zona se conserva por si lo reconecta.
  if (t.customDomain && t.cloudflareZoneId && cloudflareConfigured()) {
    try {
      await removeWorkerRoutes(t.cloudflareZoneId, t.customDomain);
    } catch (e) {
      console.error("[Domain] Error al quitar worker routes:", e);
    }
  }

  // Solo desvincula: la zona CF se conserva (idempotencia si vuelve a agregarla).
  await db
    .update(schema.tenants)
    .set({ customDomain: null, domainVerified: false })
    .where(eq(schema.tenants.id, t.id));

  return NextResponse.json({ ok: true });
}
