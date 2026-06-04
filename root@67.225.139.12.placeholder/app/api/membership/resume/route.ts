import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/membership/resume
 *
 * Revierte la cancelación programada:
 *   1. En Stripe: subscription.update(cancel_at_period_end=false) — vuelve a
 *      cobrar al siguiente ciclo.
 *   2. En DB: cancelAtPeriodEnd=false.
 * Solo aplica si la membresía sigue activa (no expiró aún).
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

  // Resolver subscription id de Stripe y reactivar el cobro recurrente.
  const subId = await findStripeSubscriptionId(me.id);
  if (subId && isStripeConfigured()) {
    try {
      await getStripe().subscriptions.update(subId, { cancel_at_period_end: false });
    } catch (e) {
      console.error("[membership/resume] stripe update failed:", (e as Error).message);
    }
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

async function findStripeSubscriptionId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ subId: sql<string | null>`${schema.orders.metadata}->>'stripeSubscriptionId'` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.userId, userId),
        sql`${schema.orders.metadata}->>'stripeSubscriptionId' IS NOT NULL`,
      ),
    )
    .orderBy(sql`${schema.orders.createdAt} DESC`)
    .limit(1);
  return row?.subId ?? null;
}
