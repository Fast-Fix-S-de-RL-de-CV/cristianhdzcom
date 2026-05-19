import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // Verify module exists
  const [mod] = await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1);
  if (!mod) return NextResponse.json({ message: "module not found" }, { status: 404 });

  // Upsert progress row → state = in_progress (unless already done)
  const [existing] = await db
    .select()
    .from(schema.moduleProgress)
    .where(and(eq(schema.moduleProgress.userId, user.id), eq(schema.moduleProgress.moduleId, id)))
    .limit(1);

  if (existing) {
    if (existing.state !== "done") {
      await db
        .update(schema.moduleProgress)
        .set({ state: "in_progress", lastTouchedAt: new Date() })
        .where(
          and(
            eq(schema.moduleProgress.userId, user.id),
            eq(schema.moduleProgress.moduleId, id),
          ),
        );
    }
  } else {
    await db.insert(schema.moduleProgress).values({
      userId: user.id,
      moduleId: id,
      state: "in_progress",
    });
  }

  // Return next-lesson redirect target
  const [firstLesson] = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(eq(schema.lessons.moduleId, id))
    .orderBy(schema.lessons.sortOrder)
    .limit(1);

  return NextResponse.json({
    ok: true,
    moduleId: id,
    lessonId: firstLesson?.id ?? null,
  });
}
