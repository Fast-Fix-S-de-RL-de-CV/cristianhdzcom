import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { basePrice } from "@/lib/book-bumps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/checkout/book
 *
 * Crea una orden por la compra de un libro o bundle del catálogo `books`.
 * No requiere cuenta — si el comprador no está logueado, capturamos su
 * email + nombre y se le crea una orden anónima que se enlaza por email
 * (igual que el checkout de programas en modo demo).
 *
 * Flow:
 *   1. Validar producto principal (existe, active, formato soportado).
 *   2. Validar order bumps (cada uno apunta a un producto/variant válido).
 *   3. Calcular subtotal + bumps total.
 *   4. Si el producto tiene shipping (físico), validar dirección.
 *   5. Decrementar stockPhysical donde aplique.
 *   6. Crear order con status='succeeded' (modo demo) — futuro: Stripe PI.
 *   7. Devolver { orderId, redirectTo: "/checkout/libro/[slug]/confirmacion" }.
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

  // 2. Formato válido para este producto
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

  // 4. Stock check para físico individual
  if (data.format === "physical" && product.stockPhysical != null && product.stockPhysical <= 0) {
    return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
  }

  // 5. Validar bumps: cada uno debe existir y tener su formato disponible
  const bumpSlugs = data.bumps.map((b) => b.productSlug);
  const bumpProducts =
    bumpSlugs.length > 0
      ? await db.select().from(schema.books).where(sql`${schema.books.slug} = ANY(${bumpSlugs})`)
      : [];
  const validatedBumps: { slug: string; variant: string; priceUsd: number; title: string }[] = [];
  for (const b of data.bumps) {
    const prod = bumpProducts.find((p) => p.slug === b.productSlug);
    if (!prod || !prod.isActive) continue;
    const variantOk =
      (b.variant === "digital" && prod.hasDigital) ||
      (b.variant === "physical" && prod.hasPhysical) ||
      (b.variant === "bundle" && prod.isBundle);
    if (!variantOk) continue;
    // Trust the priceUsd from client (it came from server-computed bumps).
    // For production: re-compute server-side and compare.
    validatedBumps.push({
      slug: prod.slug,
      variant: b.variant,
      priceUsd: b.priceUsd,
      title: `${prod.title} (${b.variant})`,
    });
  }

  // 6. Calcular totales
  const baseUsd = basePrice(product, data.format);
  const bumpsUsd = validatedBumps.reduce((sum, b) => sum + b.priceUsd, 0);
  const totalUsd = baseUsd + bumpsUsd;
  const totalCents = totalUsd * 100;

  // 7. Resolver user_id si el comprador ya tiene cuenta
  const me = await getCurrentUser();
  let userId: string | null = me?.id ?? null;
  if (!userId) {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${data.buyer.email}`)
      .limit(1);
    if (existingUser) userId = existingUser.id;
  }

  // 8. Decrementar stock físico (best-effort, no transaccional)
  if (data.format === "physical" && product.stockPhysical != null) {
    await db
      .update(schema.books)
      .set({ stockPhysical: sql`GREATEST(${schema.books.stockPhysical} - 1, 0)` })
      .where(eq(schema.books.id, product.id));
  }
  for (const bump of validatedBumps) {
    if (bump.variant === "physical") {
      await db
        .update(schema.books)
        .set({ stockPhysical: sql`GREATEST(${schema.books.stockPhysical} - 1, 0)` })
        .where(eq(schema.books.slug, bump.slug));
    }
  }

  // 9. Crear orden — status succeeded en modo demo (sin Stripe live)
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      email: data.buyer.email,
      name: data.buyer.name,
      programId: null, // este order no es de programa
      status: "succeeded",
      subtotalCents: baseUsd * 100,
      discountCents: 0,
      bumpsCents: bumpsUsd * 100,
      taxCents: 0,
      totalCents,
      currency: "usd",
      paymentMethod: "card",
      bumps: validatedBumps.map((b) => ({
        id: `${b.slug}-${b.variant}`,
        title: b.title,
        priceCents: b.priceUsd * 100,
      })),
      metadata: {
        kind: "book",
        bookSlug: product.slug,
        bookTitle: product.title,
        format: data.format,
        isBundle: product.isBundle,
        shipping: data.shipping ?? null,
      } as Record<string, unknown>,
      paidAt: new Date(),
    })
    .returning();

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    redirectTo: `/checkout/libro/${product.slug}/confirmacion?order=${order.id}`,
  });
}
