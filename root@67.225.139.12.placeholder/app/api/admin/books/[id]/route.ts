import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { bookBodySchema } from "../_schema";

export const dynamic = "force-dynamic";

const PartialBody = bookBodySchema.partial();

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  let data;
  try {
    data = PartialBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const [row] = await db
      .update(schema.books)
      .set({
        ...(data.slug != null ? { slug: data.slug } : {}),
        ...(data.title != null ? { title: data.title } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
        ...(data.pages !== undefined ? { pages: data.pages } : {}),
        ...(data.priceDigitalUsd !== undefined ? { priceDigitalUsd: data.priceDigitalUsd } : {}),
        ...(data.pricePrintUsd !== undefined ? { pricePrintUsd: data.pricePrintUsd } : {}),
        ...(data.priceCompareUsd !== undefined ? { priceCompareUsd: data.priceCompareUsd } : {}),
        ...(data.priceBundleUsd !== undefined ? { priceBundleUsd: data.priceBundleUsd } : {}),
        ...(data.hasDigital !== undefined ? { hasDigital: data.hasDigital } : {}),
        ...(data.hasPhysical !== undefined ? { hasPhysical: data.hasPhysical } : {}),
        ...(data.stockPhysical !== undefined ? { stockPhysical: data.stockPhysical } : {}),
        ...(data.digitalFileUrl !== undefined ? { digitalFileUrl: data.digitalFileUrl } : {}),
        ...(data.isBundle !== undefined ? { isBundle: data.isBundle } : {}),
        ...(data.bundleIncludes !== undefined ? { bundleIncludes: data.bundleIncludes } : {}),
        ...(data.ratingAvg !== undefined ? { ratingAvg: data.ratingAvg } : {}),
        ...(data.ratingCount !== undefined ? { ratingCount: data.ratingCount } : {}),
        ...(data.bullets !== undefined ? { bullets: data.bullets } : {}),
        ...(data.accent !== undefined ? { accent: data.accent } : {}),
        ...(data.badge !== undefined ? { badge: data.badge } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      })
      .where(eq(schema.books.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ book: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db.delete(schema.books).where(eq(schema.books.id, id));
  return NextResponse.json({ ok: true });
}
