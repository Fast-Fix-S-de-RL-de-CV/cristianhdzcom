import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { backfillAllTiers } from "@/lib/experience";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/tiers/backfill
 *
 * Recalcula el `tier` + `tierScore` + `lifetimeSpendCents` de TODOS los users
 * desde sus orders pagadas. Se llama una vez al activar el sistema, después
 * de cada cambio masivo de orders (refunds masivos, importación, etc.), o
 * cuando el admin quiera reconciliar.
 *
 * No requiere body. Devuelve { processed, byTier }.
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await backfillAllTiers();
  return NextResponse.json({ ok: true, ...result });
}
