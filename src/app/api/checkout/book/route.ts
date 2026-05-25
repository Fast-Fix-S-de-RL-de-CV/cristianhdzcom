import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { basePrice } from "@/lib/book-bumps";
import {
  getStripe,
  siteUrl,
  isStripeConfigured,
  finalizeCheckoutSession,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/checkout/book — Stripe Checkout Session para LIBROS.
 *
 * Devuelve `{ url }` con el destino de Stripe Checkout. La orden se crea
 * por el webhook cuando se confirma el pago. Fallback demo si no hay
 * Stripe configurado.
 */
const BumpItem = z.object({
  productSlug: z.string().min(2).max(80),
  variant: z.enum(["digital", "physical", "bundle"]),
  priceUsd: z.number().int().min(0).max(99999),
});

const ShippingAddress = z.object({
  fullName: z.string().min(2).max(200),
  line1: z.string().min(2).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  postalCode: z.string().max(40),
  country: z.string().min(2).max(80),
  phone: z.string().max(40).optional(),
});

const Body = z.object({
  slug: z.string().min(2).max(80),
  format: z.enum(["digital", "physical", "bundle"]),
  buyer: z.object({
    name: z.string().min(2).max(200),
    email: z.string().email().toLowerCase().trim(),
  }),
  shipping: ShippingAddress.optional(),
  bumps: z.array(BumpItem).max(5).default([]),
});

export async function POST(req: Request) {
  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 1. Producto principal
  const [product] = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.slug, data.slug))
    .limit(1);
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 2. Formato válido
  const validFormat =
    (data.format === "digital" && product.hasDigital) ||
    (data.format === "physical" && product.hasPhysical) ||
    (data.format === "bundle" && product.isBundle);
  if (!validFormat) {
    return NextResponse.json({ error: "format_not_available" }, { status: 400 });
  }

  // 3. Shipping requerido para físicos y bundles que incluyen físico
  const needsShipping =
    data.format === "physical" || (data.format === "bundle" && product.hasPhysical);
  if (needsShipping && !data.shipping) {
    return NextResponse.json({ error: "shipping_required" }, { status: 400 });
  }

  // 4. Stock check
  if (data.format === "physical" && product.stockPhysical != null && product.stockPhysical <= 0) {
    return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
  }

  // 5. Validar y enriquecer bumps con título (un solo query por slugs)
  const bumpSlugs = data.bumps.map((b) => b.productSlug);
  const bumpProducts = bumpSlugs.length > 0
    ? await db.select().from(schema.books).where(inArray(schema.books.slug, bumpSlugs))
    : [];

  const validatedBumps: { slug: string; variant: "digital" | "physical" | "bundle"; priceUsd: number; title: string }[] = [];
  for (const b of data.bumps) {
    const prod = bumpProducts.find((p) => p.slug === b.productSlug);
    if (!prod || !prod.isActive) continue;
    const variantOk =
      (b.variant === "digital" && prod.hasDigital) ||
      (b.variant === "physical" && prod.hasPhysical) ||
      (b.variant === "bundle" && prod.isBundle);
    if (!variantOk) continue;
    validatedBumps.push({
      slug: prod.slug,
      variant: b.variant,
      priceUsd: b.priceUsd,
      title: `${prod.title} (${b.variant})`,
    });
  }

  const baseUsd = basePrice(product, data.format);

  // ── MODO DEMO ──
  if (!isStripeConfigured()) {
    const fake = {
      id: `demo_${Date.now()}`,
      payment_status: "paid",
      mode: "payment",
      payment_intent: null,
      customer: null,
      subscription: null,
      metadata: {
        kind: "book",
        bookSlug: product.slug,
        bookTitle: product.title,
        format: data.format,
        buyerName: data.buyer.name,
        buyerEmail: data.buyer.email,
        shippingJson: data.shipping ? JSON.stringify(data.shipping) : "",
        bumpsJson: JSON.stringify(validatedBumps),
      },
    } as unknown as import("stripe").Stripe.Checkout.Session;
    const result = await finalizeCheckoutSession(fake);
    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      createdNewAccount: result.createdNewAccount,
      demo: true,
      redirectTo: `/checkout/libro/${product.slug}/confirmacion?order=${result.orderId}${result.createdNewAccount ? "&new=1" : ""}`,
    });
  }

  // ── MODO STRIPE ──
  const stripe = getStripe();
  const line_items: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: baseUsd * 100,
        product_data: {
          name: product.title + (data.format === "physical" ? " (Físico firmado)" : data.format === "bundle" ? " (Bundle)" : " (Digital)"),
          description: product.subtitle ?? undefined,
          images: product.coverUrl ? [product.coverUrl] : undefined,
        },
      },
    },
    ...validatedBumps.map((b) => ({
      quantity: 1,
      price_data: {
        currency: "usd" as const,
        unit_amount: b.priceUsd * 100,
        product_data: { name: b.title },
      },
    })),
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items,
    customer_email: data.buyer.email,
    shipping_address_collection: needsShipping
      ? { allowed_countries: ["MX", "US", "CA", "ES", "AR", "CO", "PE", "CL", "BR", "EC", "GT", "DO", "BO", "UY", "VE", "PA", "CR", "HN", "SV", "NI", "PY"] }
      : undefined,
    success_url: `${siteUrl()}/checkout/libro/${product.slug}/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/checkout/libro/${product.slug}?cancelled=1`,
    metadata: {
      kind: "book",
      bookSlug: product.slug,
      bookTitle: product.title,
      format: data.format,
      buyerName: data.buyer.name,
      buyerEmail: data.buyer.email,
      shippingJson: data.shipping ? JSON.stringify(data.shipping) : "",
      bumpsJson: JSON.stringify(validatedBumps),
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    url: session.url,
  });
}
