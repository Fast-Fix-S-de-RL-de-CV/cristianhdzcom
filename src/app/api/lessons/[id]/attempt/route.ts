import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const body = z.object({
  answer: z.string().min(1).max(2000),
  isCorrect: z.boolean(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const data = body.parse(await req.json());

  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1);
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const xpEarned = data.isCorrect ? lesson.xpReward : 0;

  await db.insert(schema.lessonAttempts).values({
    userId: user.id,
    lessonId: id,
    answer: data.answer,
    isCorrect: data.isCorrect,
    xpEarned,
  });

  if (data.isCorrect) {
    await db
      .update(schema.users)
      .set({
        xp: sql`${schema.users.xp} + ${xpEarned}`,
        streakLastAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));
  } else {
    await db
      .update(schema.users)
      .set({ hearts: sql`GREATEST(${schema.users.hearts} - 1, 0)` })
      .where(eq(schema.users.id, user.id));
  }

  return NextResponse.json({ ok: true, xpEarned });
}
