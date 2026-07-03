import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { recomputeUserTier, type Tier } from "@/lib/experience";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/tiers/backfill
 *
 * Recalcula el `tier` + `tierScore` + `lifetimeSpendCents` de TODOS los users
 * DEL TENANT actual desde sus orders pagadas. Se llama una vez al activar el
 * sistema, después de cada cambio masivo de orders (refunds masivos,
 * importación, etc.), o cuando el admin quiera reconciliar.
 *
 * No requiere body. Devuelve { processed, byTier }.
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  // Igual que backfillAllTiers() pero SOLO usuarios del tenant del request.
  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.tenantId, ctx.tenant.id));

  const byTier: Record<Tier, number> = {
    visitor: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
    black: 0,
  };
  let processed = 0;
  for (const u of users) {
    const { newTier } = await recomputeUserTier(u.id, { reason: "backfill" });
    byTier[newTier]++;
    processed++;
  }

  return NextResponse.json({ ok: true, processed, byTier });
}
