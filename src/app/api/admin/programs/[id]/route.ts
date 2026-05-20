import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const body = z.object({
  title: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(80).regex(SLUG_RE).optional(),
  subtitle: z.string().max(2000).optional().nullable(),
  type: z.string().min(2).max(40).optional(),
  durationLabel: z.string().max(80).optional().nullable(),
  priceUsd: z.number().int().min(0).optional(),
  priceCompareUsd: z.number().int().positive().nullable().optional(),
  installmentPriceUsd: z.number().int().positive().nullable().optional(),
  installmentCount: z.number().int().positive().nullable().optional(),
  accent: z.enum(["accent", "warm", "green", "navy", "gold"]).optional(),
  description: z.string().max(5000).optional().nullable(),
  bullets: z.array(z.string().min(1).max(140)).max(20).optional(),
  coverUrl: z.string().url().max(500).nullable().optional(),
  coverKind: z.enum(["image", "video"]).nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .update(schema.programs)
      .set(data)
      .where(eq(schema.programs.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ program: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
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
  await db.delete(schema.programs).where(eq(schema.programs.id, id));
  return NextResponse.json({ ok: true });
}
