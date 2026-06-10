import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getStripe, siteUrl, isStripeConfigured, finalizeCheckoutSession } from "@/lib/stripe";
import { usdToMxnCents, MXN_PER_USD } from "@/lib/fx";
import { resolveProgramBumps } from "@/lib/program-bumps";

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
  // Solo el id del bump: título y precio se resuelven server-side contra
  // el catálogo de lib/program-bumps (el precio del cliente se ignora).
  bumps: z.array(z.object({ id: z.string().min(1).max(40) })).default([]),
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

    // Resolver bumps por id contra el catálogo server-side. Id desconocido
    // → 400 (el precio nunca viene del cliente).
    const bumps = resolveProgramBumps(data.bumps.map((b) => b.id));
    if (!bumps) return NextResponse.json({ error: "invalid_bump" }, { status: 400 });

    // ── MODO DEMO si no hay Stripe configurado ──
    if (!isStripeConfigured()) {
      return demoFlow(data, program, bumps);
    }

    // ── MODO STRIPE: crear Checkout Session en MXN ──
    // OXXO + SPEI sólo se activan con currency=mxn. Convertimos USD→MXN con
    // tasa fija (ver lib/fx.ts) y mantenemos el USD original en metadata
    // para que la DB siga en USD.
    const stripe = getStripe();

    // Resolver descuento del cupón antes de armar line items.
    let couponDiscountUsdCents = 0;
    if (data.couponCode) {
      const [coupon] = await db
        .select()
        .from(schema.coupons)
        .where(eq(schema.coupons.code, data.couponCode.toUpperCase()))
        .limit(1);
      // Solo aplica si está activo Y todavía tiene canjes (null = ilimitado).
      const hasUsesLeft = coupon?.usesLeft == null || coupon.usesLeft > 0;
      if (coupon?.active && hasUsesLeft) {
        const subtotalUsdCents = program.priceUsd * 100 + bumps.reduce((s, b) => s + b.priceCents, 0);
        couponDiscountUsdCents =
          coupon.kind === "amount" ? coupon.value : Math.round((subtotalUsdCents * coupon.value) / 100);
      }
    }
    const couponDiscountMxnCents = Math.ceil(couponDiscountUsdCents * MXN_PER_USD);

    const line_items: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: usdToMxnCents(program.priceUsd),
          product_data: {
            name: program.title,
            description: program.subtitle ?? undefined,
            images: program.coverUrl ? [program.coverUrl] : undefined,
          },
        },
      },
      ...bumps.map((b) => ({
        quantity: 1,
        price_data: {
          currency: "mxn" as const,
          unit_amount: Math.ceil(b.priceCents * MXN_PER_USD),
          product_data: { name: b.title },
        },
      })),
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Sin payment_method_types: Stripe muestra todos los activados en
      // Dashboard → Settings → Payment methods que apliquen a la moneda
      // (MXN). Cuando actives PayPal/OXXO/SPEI ahí, aparecen solos.
      line_items,
      customer_email: data.email,
      discounts: couponDiscountMxnCents > 0
        ? [{
            coupon: (await stripe.coupons.create({
              amount_off: couponDiscountMxnCents,
              currency: "mxn",
              duration: "once",
              name: `Cupón ${data.couponCode ?? ""}`.trim(),
            })).id,
          }]
        : undefined,
      // Pasamos por /api/checkout/finish (Route Handler): finaliza la orden
      // y abre la sesión web del comprador antes de mostrar la confirmación.
      success_url: `${siteUrl()}/api/checkout/finish?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(`/checkout/${program.slug}/confirmacion`)}`,
      cancel_url: `${siteUrl()}/checkout/${program.slug}?cancelled=1`,
      metadata: {
        kind: "program",
        programId: program.id,
        buyerName: data.name,
        buyerEmail: data.email,
        country: data.country ?? "",
        phone: data.phone ?? "",
        bumpsJson: JSON.stringify(bumps),
        couponCode: data.couponCode ?? "",
        fxRate: String(MXN_PER_USD),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error("[checkout program]", e);
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}

/** Fallback demo: si STRIPE_SECRET_KEY no está set, completa la orden
 *  directo en DB usando el mismo flujo del webhook. Útil para staging. */
async function demoFlow(
  data: z.infer<typeof body>,
  _program: typeof schema.programs.$inferSelect,
  bumps: { id: string; title: string; priceCents: number }[],
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
      bumpsJson: JSON.stringify(bumps),
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
