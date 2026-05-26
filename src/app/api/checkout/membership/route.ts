import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getStripe, siteUrl, isStripeConfigured, finalizeCheckoutSession } from "@/lib/stripe";
import { usdToMxnCents, MXN_PER_USD } from "@/lib/fx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/checkout/membership — Stripe Checkout Session (mode=subscription).
 *
 * Devuelve `{ url }` con el destino de Stripe Checkout (Billing). El webhook
 * `checkout.session.completed` crea la Membership local. Fallback demo si
 * no hay Stripe configurado.
 */
const Body = z.object({
  planSlug: z.enum(["silver", "gold", "black"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  buyer: z.object({
    name: z.string().min(2).max(200),
    email: z.string().email().toLowerCase().trim(),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const { planSlug, billingCycle, buyer } = parsed.data;

  // 1. Cargar plan
  const [plan] = await db
    .select()
    .from(schema.membershipPlans)
    .where(and(eq(schema.membershipPlans.slug, planSlug), eq(schema.membershipPlans.isActive, true)))
    .limit(1);
  if (!plan) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

  // 2. Validar cupo
  if (plan.maxSeats != null && plan.activeMembers >= plan.maxSeats) {
    return NextResponse.json(
      {
        error: "seats_full",
        message: `Cupo agotado en ${plan.label} (${plan.maxSeats} miembros). Únete a la lista de espera.`,
      },
      { status: 409 },
    );
  }

  // 3. ¿Ya tiene suscripción activa? Bloquear antes de mandarlo a Stripe.
  const lower = buyer.email.toLowerCase();
  const [existingUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, lower))
    .limit(1);
  if (existingUser) {
    const [activeMembership] = await db
      .select()
      .from(schema.memberships)
      .where(
        and(eq(schema.memberships.userId, existingUser.id), eq(schema.memberships.status, "active")),
      )
      .limit(1);
    if (activeMembership) {
      return NextResponse.json(
        {
          error: "already_subscribed",
          message: `Ya tienes una suscripción activa de ${activeMembership.planSlug}. Cancela primero desde /cuenta/membresia.`,
        },
        { status: 409 },
      );
    }
  }

  const priceUsd =
    billingCycle === "yearly" && plan.priceUsdYearly ? plan.priceUsdYearly : plan.priceUsdMonthly;

  // ── MODO DEMO ──
  if (!isStripeConfigured()) {
    const fake = {
      id: `demo_${Date.now()}`,
      payment_status: "paid",
      mode: "subscription",
      payment_intent: null,
      customer: null,
      subscription: null,
      metadata: {
        kind: "membership",
        planSlug,
        billingCycle,
        buyerName: buyer.name,
        buyerEmail: lower,
      },
    } as unknown as import("stripe").Stripe.Checkout.Session;
    const result = await finalizeCheckoutSession(fake);
    return NextResponse.json({
      ok: true,
      membershipId: null,
      orderId: result.orderId,
      createdNewAccount: result.createdNewAccount,
      demo: true,
      redirectTo: `/cuenta/membresia?welcome=${planSlug}${result.createdNewAccount ? "&new=1" : ""}`,
    });
  }

  // ── MODO STRIPE BILLING (mode=subscription) ──
  // Sesión en MXN para soporte LATAM + PayPal en suscripción.
  // OXXO/SPEI no se permiten en suscripciones (limitación de Stripe).
  const stripe = getStripe();

  const interval = billingCycle === "yearly" ? "year" : "month";
  const lookupKey = `chdz-${planSlug}-${billingCycle}-mxn`;

  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  let priceId: string;
  if (existingPrices.data.length > 0) {
    priceId = existingPrices.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: `${plan.label} ${billingCycle === "yearly" ? "anual" : "mensual"}`,
      description: plan.tagline ?? undefined,
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: usdToMxnCents(priceUsd),
      currency: "mxn",
      recurring: { interval },
      lookup_key: lookupKey,
    });
    priceId = price.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Sin payment_method_types: Stripe usa los activados que soporten
    // suscripción (card + Link + PayPal cuando esté activado).
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: lower,
    success_url: `${siteUrl()}/cuenta/membresia?welcome=${planSlug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/membresia?cancelled=1`,
    metadata: {
      kind: "membership",
      planSlug,
      billingCycle,
      buyerName: buyer.name,
      buyerEmail: lower,
      fxRate: String(MXN_PER_USD),
    },
    subscription_data: {
      metadata: {
        kind: "membership",
        planSlug,
        billingCycle,
        buyerEmail: lower,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    url: session.url,
  });
}
