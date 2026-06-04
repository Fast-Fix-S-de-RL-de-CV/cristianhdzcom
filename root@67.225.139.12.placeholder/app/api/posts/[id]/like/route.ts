import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const existing = await db
    .select()
    .from(schema.postLikes)
    .where(and(eq(schema.postLikes.userId, user.id), eq(schema.postLikes.postId, id)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(schema.postLikes).values({ userId: user.id, postId: id });
    await db
      .update(schema.posts)
      .set({ likesCount: sql`${schema.posts.likesCount} + 1` })
      .where(eq(schema.posts.id, id));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await db
    .delete(schema.postLikes)
    .where(and(eq(schema.postLikes.userId, user.id), eq(schema.postLikes.postId, id)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(schema.posts)
      .set({ likesCount: sql`GREATEST(${schema.posts.likesCount} - 1, 0)` })
      .where(eq(schema.posts.id, id));
  }
  return NextResponse.json({ ok: true });
}
