/**
 * POST /api/stripe/webhook
 *
 * Endpoint que recibe eventos de Stripe (configurar en Stripe Dashboard →
 * Developers → Webhooks → Add endpoint).
 *
 * Eventos que procesamos:
 *  - `checkout.session.completed` → finalizar order/membership.
 *  - `invoice.paid` → renovación de membresía (acumular crédito + extender
 *    currentPeriodEnd).
 *  - `customer.subscription.deleted` → marcar membresía cancelada cuando
 *    Stripe la termina al final del periodo.
 *  - `customer.subscription.updated` → sincronizar cancel_at_period_end y
 *    currentPeriodEnd.
 *
 * IMPORTANTE: la verificación de firma usa `STRIPE_WEBHOOK_SECRET` del .env.
 * Si no está configurado, retornamos 503 para evitar procesar eventos
 * falsos.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getStripe, finalizeCheckoutSession } from "@/lib/stripe";
import { accrueCredit, type PlanSlug } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe.webhook] STRIPE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "webhook_secret_missing" }, { status: 503 });
  }

  const h = await headers();
  const signature = h.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe.webhook] firma inválida:", (e as Error).message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Para mode=subscription, expandir subscription para obtener
        // current_period_end y guardar metadata desde el cliente.
        let full: Stripe.Checkout.Session = session;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          full = await getStripe().checkout.sessions.retrieve(session.id, {
            expand: ["subscription"],
          });
        }
        await finalizeCheckoutSession(full);
        break;
      }
      case "invoice.paid": {
        // Renovación periódica de suscripción. Sumar crédito + extender
        // periodo. Ignoramos la primera factura (esa la maneja
        // checkout.session.completed → finalizeMembershipOrder).
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;
        if (!subId) break;
        if (invoice.billing_reason === "subscription_create") break; // ya manejado

        await handleSubscriptionRenewal(subId, invoice.amount_paid);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionState(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(schema.memberships)
          .set({
            status: "canceled",
            cancelAtPeriodEnd: true,
            canceledAt: new Date(),
          })
          .where(sql`${schema.memberships.userId} IN (
            SELECT user_id FROM orders WHERE metadata->>'stripeSubscriptionId' = ${sub.id} LIMIT 1
          )`);
        break;
      }
      default:
        // Otros eventos los ignoramos por ahora.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(`[stripe.webhook] error procesando ${event.type}:`, e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

/** Renovación de suscripción: encuentra membership por stripeSubscriptionId
 *  guardado en el order original, acumula crédito y extiende periodo. */
async function handleSubscriptionRenewal(stripeSubId: string, amountPaidCents: number) {
  // Buscar order original con este subscription id
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(sql`${schema.orders.metadata}->>'stripeSubscriptionId' = ${stripeSubId}`)
    .orderBy(sql`${schema.orders.createdAt} DESC`)
    .limit(1);
  if (!order || !order.userId) {
    console.warn("[stripe.webhook] renewal: no order para sub", stripeSubId);
    return;
  }

  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, order.userId), eq(schema.memberships.status, "active")))
    .limit(1);
  if (!m) return;

  // Extender currentPeriodEnd desde Stripe (verdad canónica)
  const sub = await getStripe().subscriptions.retrieve(stripeSubId);
  await db
    .update(schema.memberships)
    .set({
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      status: "active",
    })
    .where(eq(schema.memberships.id, m.id));

  // Acumular crédito sobre el monto pagado real
  const [plan] = await db
    .select()
    .from(schema.membershipPlans)
    .where(eq(schema.membershipPlans.slug, m.planSlug))
    .limit(1);
  if (plan) {
    await accrueCredit({
      userId: order.userId,
      amountPaidCents,
      membershipId: m.id,
      accrualPercent: plan.creditAccrualPercent,
      note: `Renovación ${plan.label} ${m.billingCycle}`,
    }).catch((e) => console.error("[stripe.webhook] accrue renewal:", e));
  }

  // Log audit order
  await db
    .insert(schema.orders)
    .values({
      userId: order.userId,
      email: order.email,
      name: order.name,
      status: "succeeded",
      subtotalCents: amountPaidCents,
      totalCents: amountPaidCents,
      currency: "usd",
      paymentMethod: "card",
      metadata: {
        kind: "membership",
        stripeSubscriptionId: stripeSubId,
        planSlug: m.planSlug as PlanSlug,
        billingCycle: m.billingCycle,
        renewal: true,
      } as Record<string, unknown>,
      paidAt: new Date(),
    })
    .catch((e) => console.error("[stripe.webhook] audit order renewal:", e));
}

async function syncSubscriptionState(sub: Stripe.Subscription) {
  await db
    .update(schema.memberships)
    .set({
      status: sub.status === "active" || sub.status === "trialing" ? "active" : "canceled",
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    })
    .where(sql`${schema.memberships.userId} IN (
      SELECT user_id FROM orders WHERE metadata->>'stripeSubscriptionId' = ${sub.id} LIMIT 1
    )`);
}
