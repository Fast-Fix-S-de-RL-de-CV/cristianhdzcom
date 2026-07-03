import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getStripeForTenant } from "@/lib/stripe";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/membership/cancel
 *
 * Programa la cancelación al final del periodo:
 *   1. En Stripe (del tenant): subscription.update(cancel_at_period_end=true)
 *      — DEJA DE cobrar al siguiente ciclo. (Si el tenant no tiene Stripe
 *      configurado → solo se hace el cambio local.)
 *   2. En DB: marca cancelAtPeriodEnd=true. La membresía sigue activa hasta
 *      currentPeriodEnd; cuando Stripe emite customer.subscription.deleted al
 *      cierre del periodo, el webhook la pasa a status='canceled'.
 *
 * No emite reembolso. El crédito acumulado entra en grace de 90 días.
 */
export async function POST() {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [active] = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, me.id),
        eq(schema.memberships.status, "active"),
        eq(schema.memberships.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!active) return NextResponse.json({ error: "no_active_membership" }, { status: 404 });

  // Resolver el subscription id de Stripe desde el order de membresía.
  const subId = await findStripeSubscriptionId(me.id, ctx.tenant.id);

  // 1) Stripe del tenant — programar cancelación al final del periodo (best-effort).
  const { stripe } = await getStripeForTenant(ctx.tenant.id);
  if (subId && stripe) {
    try {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
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
    .where(and(eq(schema.memberships.id, active.id), eq(schema.memberships.tenantId, ctx.tenant.id)));

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
    stripeScheduled: !!(subId && stripe),
  });
}

/** Busca el stripeSubscriptionId guardado en metadata de los orders de
 *  membresía del usuario (el más reciente que lo tenga), scoped al tenant. */
async function findStripeSubscriptionId(userId: string, tenantId: string): Promise<string | null> {
  const [row] = await db
    .select({ subId: sql<string | null>`${schema.orders.metadata}->>'stripeSubscriptionId'` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.userId, userId),
        eq(schema.orders.tenantId, tenantId),
        sql`${schema.orders.metadata}->>'stripeSubscriptionId' IS NOT NULL`,
      ),
    )
    .orderBy(sql`${schema.orders.createdAt} DESC`)
    .limit(1);
  return row?.subId ?? null;
}
