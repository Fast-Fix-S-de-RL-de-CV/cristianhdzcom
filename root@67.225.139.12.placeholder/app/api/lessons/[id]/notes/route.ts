import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/lessons/[id]/notes
 *  → { body: string }  (empty string if no row exists yet)
 *
 * PUT /api/lessons/[id]/notes
 *  body: { body: string }
 *  → Upserts the user's private note for this lesson.
 *
 * Notes are private to the author — never returned to anyone else.
 */
const putBody = z.object({
  body: z.string().max(20_000),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [row] = await db
    .select()
    .from(schema.lessonNotes)
    .where(and(eq(schema.lessonNotes.userId, user.id), eq(schema.lessonNotes.lessonId, lessonId)))
    .limit(1);
  return NextResponse.json({ body: row?.body ?? "" });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = putBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Lesson must exist
  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });

  await db
    .insert(schema.lessonNotes)
    .values({ userId: user.id, lessonId, body: parsed.data.body, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.lessonNotes.userId, schema.lessonNotes.lessonId],
      set: { body: parsed.data.body, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
