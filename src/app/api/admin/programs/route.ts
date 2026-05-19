import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  subtitle: z.string().max(2000).optional().nullable(),
  type: z.string().min(2).max(40),
  durationLabel: z.string().max(80).optional().nullable(),
  priceUsd: z.number().int().min(0).default(0),
  priceCompareUsd: z.number().int().positive().nullable().optional(),
  installmentPriceUsd: z.number().int().positive().nullable().optional(),
  installmentCount: z.number().int().positive().nullable().optional(),
  accent: z.enum(["accent", "warm", "green", "navy", "gold"]).optional(),
  description: z.string().max(5000).optional().nullable(),
  bullets: z.array(z.string().min(1).max(140)).max(20).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.programs)
      .values({
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle || null,
        type: data.type,
        durationLabel: data.durationLabel || null,
        priceUsd: data.priceUsd,
        priceCompareUsd: data.priceCompareUsd ?? null,
        installmentPriceUsd: data.installmentPriceUsd ?? null,
        installmentCount: data.installmentCount ?? null,
        accent: data.accent ?? "accent",
        description: data.description ?? null,
        bullets: data.bullets ?? [],
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      })
      .returning();
    return NextResponse.json({ program: row });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    const code =
      (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "slug_in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
