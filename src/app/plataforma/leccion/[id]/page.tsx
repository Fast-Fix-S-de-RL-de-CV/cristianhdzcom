import { notFound, redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { LessonRunner } from "@/components/platform/LessonRunner";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma");
  const { id } = await params;

  const [lesson] = await db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.id, id))
    .limit(1);
  if (!lesson) notFound();

  const [mod] = await db.select().from(schema.modules).where(eq(schema.modules.id, lesson.moduleId)).limit(1);

  return (
    <LessonRunner
      lesson={{
        id: lesson.id,
        title: lesson.title,
        question: lesson.question,
        body: lesson.body,
        kind: lesson.kind,
        options: (lesson.options || []) as { k: string; t: string; correct?: boolean }[],
        correctKey: lesson.correctKey,
        hint: lesson.hint,
        explanation: lesson.explanation,
        xpReward: lesson.xpReward,
      }}
      moduleCode={mod?.code || ""}
      lessonCode={lesson.code}
      user={{ hearts: user.hearts, streakDays: user.streakDays, xp: user.xp }}
    />
  );
}
