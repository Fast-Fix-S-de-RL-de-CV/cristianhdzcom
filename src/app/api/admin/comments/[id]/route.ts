import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const found = await db
    .select({ postId: schema.comments.postId })
    .from(schema.comments)
    .where(eq(schema.comments.id, id))
    .limit(1);
  await db.delete(schema.comments).where(eq(schema.comments.id, id));
  if (found[0]) {
    await db
      .update(schema.posts)
      .set({ commentsCount: sql`GREATEST(${schema.posts.commentsCount} - 1, 0)` })
      .where(eq(schema.posts.id, found[0].postId));
  }
  return NextResponse.json({ ok: true });
}
