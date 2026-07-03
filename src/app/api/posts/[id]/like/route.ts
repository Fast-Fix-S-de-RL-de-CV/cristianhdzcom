import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  // El post debe ser del tenant del request.
  const [post] = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tctx.tenant.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
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
      .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tctx.tenant.id)));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  // El post debe ser del tenant del request.
  const [post] = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tctx.tenant.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
  const deleted = await db
    .delete(schema.postLikes)
    .where(and(eq(schema.postLikes.userId, user.id), eq(schema.postLikes.postId, id)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(schema.posts)
      .set({ likesCount: sql`GREATEST(${schema.posts.likesCount} - 1, 0)` })
      .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tctx.tenant.id)));
  }
  return NextResponse.json({ ok: true });
}
