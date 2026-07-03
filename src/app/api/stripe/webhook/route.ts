/**
 * POST /api/stripe/webhook — POR TENANT.
 *
 * Cada tenant configura su endpoint en SU Stripe Dashboard apuntando a
 * `mimarca.app/{slug}/api/stripe/webhook` o `sudominio.com/api/stripe/webhook`
 * (el middleware setea x-tenant-key y aquí resolvemos el tenant con
 * getTenantCtx). La firma se verifica con el webhookSecret DEL TENANT
 * (payment_settings; fallback env solo para el tenant seed cristianhdz).
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
 * IMPORTANTE: si el tenant no tiene webhookSecret configurado, retornamos
 * 503 para evitar procesar eventos falsos.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getStripeForTenant, finalizeCheckoutSession } from "@/lib/stripe";
import { getTenantCtx } from "@/lib/tenant";
import { accrueCredit, type PlanSlug } from "@/lib/membership";
import { MXN_PER_USD } from "@/lib/fx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const tenantId = ctx.tenant.id;

  const { stripe, webhookSecret } = await getStripeForTenant(tenantId);
  if (!stripe || !webhookSecret) {
    console.error(`[stripe.webhook] tenant ${ctx.tenant.slug}: webhook secret no configurado`);
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
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("[stripe.webhook] firma inválida:", (e as Error).message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // ── Idempotencia ── Insertamos el id del evento (con su tenant); si ya
  // existe (reentrega o duplicado de Stripe), salimos con 200 sin reprocesar.
  // La PK hace el trabajo atómico: onConflictDoNothing devuelve 0 filas si ya
  // estaba. (Los event id de Stripe son únicos por cuenta, y cada tenant usa
  // su propia cuenta.)
  try {
    const inserted = await db
      .insert(schema.stripeEvents)
      .values({ id: event.id, tenantId, type: event.type })
      .onConflictDoNothing()
      .returning({ id: schema.stripeEvents.id });
    if (inserted.length === 0) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (e) {
    // Si la tabla de idempotencia falla, preferimos procesar (no perder el
    // evento) a bloquear ingresos — pero lo logueamos.
    console.error("[stripe.webhook] idempotency insert failed:", (e as Error).message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Para mode=subscription, expandir subscription para obtener
        // current_period_end y guardar metadata desde el cliente.
        let full: Stripe.Checkout.Session = session;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["subscription"],
          });
        }
        await finalizeCheckoutSession(full, tenantId);
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

        // Las suscripciones se cobran en MXN (ver checkout/membership). La
        // DB guarda orders/crédito en centavos USD (convención de lib/fx),
        // así que convertimos antes de acreditar.
        const amountUsdCents =
          invoice.currency?.toLowerCase() === "mxn"
            ? Math.round(invoice.amount_paid / MXN_PER_USD)
            : invoice.amount_paid;
        await handleSubscriptionRenewal(stripe, tenantId, subId, amountUsdCents);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionState(tenantId, sub);
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
          .where(
            and(
              eq(schema.memberships.tenantId, tenantId),
              sql`${schema.memberships.userId} IN (
                SELECT user_id FROM orders
                WHERE metadata->>'stripeSubscriptionId' = ${sub.id}
                  AND tenant_id = ${tenantId}
                LIMIT 1
              )`,
            ),
          );
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
 *  guardado en el order original (del tenant), acumula crédito y extiende
 *  periodo. `amountPaidCents` viene YA convertido a centavos USD por el
 *  caller. */
async function handleSubscriptionRenewal(
  stripe: Stripe,
  tenantId: string,
  stripeSubId: string,
  amountPaidCents: number,
) {
  // Buscar order original con este subscription id (scoped al tenant)
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        sql`${schema.orders.metadata}->>'stripeSubscriptionId' = ${stripeSubId}`,
        eq(schema.orders.tenantId, tenantId),
      ),
    )
    .orderBy(sql`${schema.orders.createdAt} DESC`)
    .limit(1);
  if (!order || !order.userId) {
    console.warn("[stripe.webhook] renewal: no order para sub", stripeSubId);
    return;
  }

  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, order.userId),
        eq(schema.memberships.status, "active"),
        eq(schema.memberships.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!m) return;

  // Extender currentPeriodEnd desde Stripe (verdad canónica)
  const sub = await stripe.subscriptions.retrieve(stripeSubId);
  await db
    .update(schema.memberships)
    .set({
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      status: "active",
    })
    .where(and(eq(schema.memberships.id, m.id), eq(schema.memberships.tenantId, tenantId)));

  // Acumular crédito sobre el monto pagado real
  const [plan] = await db
    .select()
    .from(schema.membershipPlans)
    .where(and(eq(schema.membershipPlans.slug, m.planSlug), eq(schema.membershipPlans.tenantId, tenantId)))
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
      tenantId,
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

async function syncSubscriptionState(tenantId: string, sub: Stripe.Subscription) {
  await db
    .update(schema.memberships)
    .set({
      status: sub.status === "active" || sub.status === "trialing" ? "active" : "canceled",
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    })
    .where(
      and(
        eq(schema.memberships.tenantId, tenantId),
        sql`${schema.memberships.userId} IN (
          SELECT user_id FROM orders
          WHERE metadata->>'stripeSubscriptionId' = ${sub.id}
            AND tenant_id = ${tenantId}
          LIMIT 1
        )`,
      ),
    );
}
