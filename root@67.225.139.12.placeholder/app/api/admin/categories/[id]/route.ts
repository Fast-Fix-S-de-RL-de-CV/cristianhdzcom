import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/).optional(),
  emoji: z.string().max(8).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .update(schema.categories)
      .set(data)
      .where(eq(schema.categories.id, numId))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ category: row });
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
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  await db.delete(schema.categories).where(eq(schema.categories.id, numId));
  return NextResponse.json({ ok: true });
}
