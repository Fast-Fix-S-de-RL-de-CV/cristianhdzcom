import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/membership/cancel
 *
 * Marca la membresía activa con cancelAtPeriodEnd=true. Sigue funcionando
 * hasta currentPeriodEnd. No emite reembolso.
 *
 * El cron mensual (TODO) verá cancel_at_period_end=true al renovar y la
 * dejará en status='expired'.
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
      ),
    )
    .limit(1);
  if (!active) return NextResponse.json({ error: "no_active_membership" }, { status: 404 });

  await db
    .update(schema.memberships)
    .set({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.memberships.id, active.id));

  // Iniciar el grace period del crédito: 90 días para usarlo o se pierde.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);
  await db
    .update(schema.membershipCredits)
    .set({ expiresAt })
    .where(eq(schema.membershipCredits.userId, me.id));

  return NextResponse.json({
    ok: true,
    accessUntil: active.currentPeriodEnd.toISOString(),
    creditExpiresAt: expiresAt.toISOString(),
  });
}
