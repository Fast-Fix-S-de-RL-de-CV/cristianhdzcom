import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/lessons/[id]/comments/[commentId]
 * Only the author of the comment OR an admin/superadmin can delete it.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> },
) {
  const { id: lessonId, commentId } = await ctx.params;
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // La lección debe ser del tenant del request.
  const [lesson] = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(and(eq(schema.lessons.id, lessonId), eq(schema.lessons.tenantId, tctx.tenant.id)))
    .limit(1);
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [comment] = await db
    .select()
    .from(schema.lessonComments)
    .where(and(eq(schema.lessonComments.id, commentId), eq(schema.lessonComments.lessonId, lessonId)))
    .limit(1);
  if (!comment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAuthor = comment.authorId === user.id;
  const isStaff = user.role === "admin" || user.role === "superadmin";
  if (!isAuthor && !isStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.delete(schema.lessonComments).where(eq(schema.lessonComments.id, commentId));
  return NextResponse.json({ ok: true });
}
