import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/membership/resume
 *
 * Revierte la cancelación pending (cancel_at_period_end=false). La
 * suscripción continúa al siguiente periodo. Solo aplica si la membresía
 * todavía está activa (no expiró aún).
 */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [active] = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, me.id),
        eq(schema.memberships.status, "active"),
        eq(schema.memberships.cancelAtPeriodEnd, true),
      ),
    )
    .limit(1);
  if (!active) {
    return NextResponse.json({ error: "no_pending_cancellation" }, { status: 404 });
  }

  await db
    .update(schema.memberships)
    .set({
      cancelAtPeriodEnd: false,
      canceledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.memberships.id, active.id));

  // Crédito ya no caduca mientras la membresía esté activa
  await db
    .update(schema.membershipCredits)
    .set({ expiresAt: null })
    .where(eq(schema.membershipCredits.userId, me.id));

  return NextResponse.json({ ok: true });
}
