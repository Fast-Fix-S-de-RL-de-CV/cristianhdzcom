import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { bookBodySchema } from "./_schema";

export const dynamic = "force-dynamic";

const Body = bookBodySchema;

/* ─────────── POST /api/admin/books ─────────── */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const [row] = await db
      .insert(schema.books)
      .values({
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        coverUrl: data.coverUrl ?? null,
        pages: data.pages ?? null,
        priceDigitalUsd: data.priceDigitalUsd ?? null,
        pricePrintUsd: data.pricePrintUsd ?? null,
        priceCompareUsd: data.priceCompareUsd ?? null,
        priceBundleUsd: data.priceBundleUsd ?? null,
        hasDigital: data.hasDigital ?? true,
        hasPhysical: data.hasPhysical ?? true,
        stockPhysical: data.stockPhysical ?? null,
        digitalFileUrl: data.digitalFileUrl ?? null,
        isBundle: data.isBundle ?? false,
        bundleIncludes: data.bundleIncludes ?? {},
        ratingAvg: data.ratingAvg ?? null,
        ratingCount: data.ratingCount ?? 0,
        bullets: data.bullets ?? [],
        accent: data.accent ?? "accent",
        badge: data.badge ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      })
      .returning();
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

