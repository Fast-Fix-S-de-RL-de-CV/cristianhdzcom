import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/lessons/[id]/comments
 * Returns ALL comments for a lesson (flat, ordered ASC).
 *
 * POST /api/lessons/[id]/comments
 * Body: { body: string, parentId?: string }
 * Creates a comment by the current user. Requires login but no enrollment
 * check — anyone who can reach the lesson page can comment.
 */
const postBody = z.object({
  body: z.string().min(1).max(4000),
  parentId: z.string().uuid().nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await ctx.params;
  const rows = await db
    .select({
      id: schema.lessonComments.id,
      body: schema.lessonComments.body,
      parentId: schema.lessonComments.parentId,
      createdAt: schema.lessonComments.createdAt,
      authorId: schema.lessonComments.authorId,
      authorName: schema.users.name,
      authorLevel: schema.users.level,
      authorRole: schema.users.role,
    })
    .from(schema.lessonComments)
    .innerJoin(schema.users, eq(schema.users.id, schema.lessonComments.authorId))
    .where(eq(schema.lessonComments.lessonId, lessonId))
    .orderBy(asc(schema.lessonComments.createdAt));
  return NextResponse.json({ comments: rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.issues }, { status: 400 });
  }

  // Verify lesson exists
  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });

  // If replying, the parent must exist and belong to this same lesson.
  if (parsed.data.parentId) {
    const [parent] = await db
      .select()
      .from(schema.lessonComments)
      .where(
        and(
          eq(schema.lessonComments.id, parsed.data.parentId),
          eq(schema.lessonComments.lessonId, lessonId),
        ),
      )
      .limit(1);
    if (!parent) return NextResponse.json({ error: "parent_not_found" }, { status: 400 });
  }

  const [inserted] = await db
    .insert(schema.lessonComments)
    .values({
      lessonId,
      authorId: user.id,
      body: parsed.data.body.trim(),
      parentId: parsed.data.parentId ?? null,
    })
    .returning();
  return NextResponse.json({ comment: inserted });
}
