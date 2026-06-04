import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/membership/cancel
 *
 * Programa la cancelación al final del periodo:
 *   1. En Stripe: subscription.update(cancel_at_period_end=true) — DEJA DE
 *      cobrar al siguiente ciclo. (Si Stripe no está configurado → modo demo,
 *      solo se hace el cambio local.)
 *   2. En DB: marca cancelAtPeriodEnd=true. La membresía sigue activa hasta
 *      currentPeriodEnd; cuando Stripe emite customer.subscription.deleted al
 *      cierre del periodo, el webhook la pasa a status='canceled'.
 *
 * No emite reembolso. El crédito acumulado entra en grace de 90 días.
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

  // Resolver el subscription id de Stripe desde el order de membresía.
  const subId = await findStripeSubscriptionId(me.id);

  // 1) Stripe — programar cancelación al final del periodo (best-effort).
  if (subId && isStripeConfigured()) {
    try {
      await getStripe().subscriptions.update(subId, { cancel_at_period_end: true });
    } catch (e) {
      console.error("[membership/cancel] stripe update failed:", (e as Error).message);
      // Seguimos con el cambio local; el webhook reconciliará.
    }
  }

  // 2) DB
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
    stripeScheduled: !!(subId && isStripeConfigured()),
  });
}

/** Busca el stripeSubscriptionId guardado en metadata de los orders de
 *  membresía del usuario (el más reciente que lo tenga). */
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
