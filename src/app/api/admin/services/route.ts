import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { serviceBodySchema } from "./_schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let data;
  try {
    data = serviceBodySchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(schema.services)
      .values({
        slug: data.slug,
        name: data.name,
        domain: data.domain ?? null,
        kind: data.kind ?? "saas",
        tagline: data.tagline ?? null,
        description: data.description ?? null,
        glyph: data.glyph ?? null,
        hue: data.hue ?? 22,
        badge: data.badge ?? null,
        metricLabel: data.metricLabel ?? null,
        priceLabel: data.priceLabel ?? null,
        ctaLabel: data.ctaLabel ?? "Ver SaaS →",
        ctaUrl: data.ctaUrl ?? null,
        coverVideoUrl: data.coverVideoUrl ?? null,
        isCtaCard: data.isCtaCard ?? false,
        showLiveBadge: data.showLiveBadge ?? true,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return NextResponse.json({ service: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
