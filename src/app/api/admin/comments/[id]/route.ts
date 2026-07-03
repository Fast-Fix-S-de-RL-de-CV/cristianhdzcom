import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantCtx = await getTenantCtx();
  if (!tenantCtx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const { id } = await ctx.params;
  const found = await db
    .select({ postId: schema.comments.postId })
    .from(schema.comments)
    .where(and(eq(schema.comments.id, id), eq(schema.comments.tenantId, tenantCtx.tenant.id)))
    .limit(1);
  if (!found[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await db
    .delete(schema.comments)
    .where(and(eq(schema.comments.id, id), eq(schema.comments.tenantId, tenantCtx.tenant.id)));
  await db
    .update(schema.posts)
    .set({ commentsCount: sql`GREATEST(${schema.posts.commentsCount} - 1, 0)` })
    .where(and(eq(schema.posts.id, found[0].postId), eq(schema.posts.tenantId, tenantCtx.tenant.id)));
  return NextResponse.json({ ok: true });
}
