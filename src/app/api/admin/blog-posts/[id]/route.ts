import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(240).optional(),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().max(2000).optional().nullable(),
  body: z.string().min(2).optional(),
  category: z.string().max(60).optional().nullable(),
  readMinutes: z.number().int().min(1).max(120).optional(),
  isFeatured: z.boolean().optional(),
  published: z.boolean().optional(),
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
    const { published, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };
    if (published !== undefined) {
      update.publishedAt = published ? new Date() : null;
    }
    const [row] = await db
      .update(schema.blogPosts)
      .set(update)
      .where(eq(schema.blogPosts.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ post: row });
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
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id));
  return NextResponse.json({ ok: true });
}
