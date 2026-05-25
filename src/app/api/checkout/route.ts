import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getStripe, siteUrl, isStripeConfigured, finalizeCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout — Stripe Checkout Session para PROGRAMAS.
 *
 * Crea una Session con line_items (programa + bumps) y devuelve `{ url }`
 * para que el frontend redirija a Stripe. La orden se crea por el webhook
 * cuando Stripe confirma el pago.
 *
 * Si Stripe no está configurado (sin secret key), funciona en MODO DEMO:
 * crea la orden directamente con status=succeeded (útil para staging).
 */
const body = z.object({
  programId: z.string().uuid(),
  name: z.string().min(2).max(200),
  email: z.string().email().toLowerCase().trim(),
  country: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  paymentMethod: z.enum(["card", "paypal", "spei", "oxxo"]).default("card"),
  bumps: z
    .array(z.object({ id: z.string(), title: z.string(), priceCents: z.number().int().nonnegative() }))
    .default([]),
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const data = body.parse(await req.json());
    const [program] = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.id, data.programId))
      .limit(1);
    if (!program) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

    // ── MODO DEMO si no hay Stripe configurado ──
    if (!isStripeConfigured()) {
      return demoFlow(data, program);
    }

    // ── MODO STRIPE: crear Checkout Session ──
    const stripe = getStripe();

    // Resolver descuento del cupón antes de armar line items.
    let couponDiscountCents = 0;
    if (data.couponCode) {
      const [coupon] = await db
        .select()
        .from(schema.coupons)
        .where(eq(schema.coupons.code, data.couponCode.toUpperCase()))
        .limit(1);
      if (coupon?.active) {
        const subtotal = program.priceUsd * 100 + data.bumps.reduce((s, b) => s + b.priceCents, 0);
        couponDiscountCents =
          coupon.kind === "amount" ? coupon.value : Math.round((subtotal * coupon.value) / 100);
      }
    }

    const line_items: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: program.priceUsd * 100,
          product_data: {
            name: program.title,
            description: program.subtitle ?? undefined,
            images: program.coverUrl ? [program.coverUrl] : undefined,
          },
        },
      },
      ...data.bumps.map((b) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: b.priceCents,
          product_data: { name: b.title },
        },
      })),
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: data.email,
      // Stripe aplica el descuento como `discounts` (coupon o promotion code).
      // Para mantenerlo simple usamos un coupon one-shot inline.
      discounts: couponDiscountCents > 0
        ? [{
            coupon: (await stripe.coupons.create({
              amount_off: couponDiscountCents,
              currency: "usd",
              duration: "once",
              name: `Cupón ${data.couponCode ?? ""}`.trim(),
            })).id,
          }]
        : undefined,
      success_url: `${siteUrl()}/checkout/${program.slug}/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/checkout/${program.slug}?cancelled=1`,
      metadata: {
        kind: "program",
        programId: program.id,
        buyerName: data.name,
        buyerEmail: data.email,
        country: data.country ?? "",
        phone: data.phone ?? "",
        bumpsJson: JSON.stringify(data.bumps),
        couponCode: data.couponCode ?? "",
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    console.error("[checkout program]", e);
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}

/** Fallback demo: si STRIPE_SECRET_KEY no está set, completa la orden
 *  directo en DB usando el mismo flujo del webhook. Útil para staging. */
async function demoFlow(
  data: z.infer<typeof body>,
  _program: typeof schema.programs.$inferSelect,
) {
  // Simulamos una session con metadata equivalente y la pasamos al finalizer.
  const fake = {
    id: `demo_${Date.now()}`,
    payment_status: "paid",
    mode: "payment",
    payment_intent: null,
    customer: null,
    subscription: null,
    metadata: {
      kind: "program",
      programId: data.programId,
      buyerName: data.name,
      buyerEmail: data.email,
      country: data.country ?? "",
      phone: data.phone ?? "",
      bumpsJson: JSON.stringify(data.bumps),
      couponCode: data.couponCode ?? "",
    },
  } as unknown as import("stripe").Stripe.Checkout.Session;
  const result = await finalizeCheckoutSession(fake);
  return NextResponse.json({
    orderId: result.orderId,
    status: "succeeded",
    demo: true,
    redirectTo: `/checkout/${_program.slug}/confirmacion?order=${result.orderId}`,
  });
}
