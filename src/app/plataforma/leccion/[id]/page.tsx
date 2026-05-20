import { notFound, redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { LessonView } from "@/components/platform/LessonView";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma");
  const { id } = await params;

  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1);
  if (!lesson) notFound();

  const [mod] = await db.select().from(schema.modules).where(eq(schema.modules.id, lesson.moduleId)).limit(1);

  // Has the user completed this lesson already (for video kind)?
  const [completedRow] = await db
    .select()
    .from(schema.lessonProgress)
    .where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, id)))
    .limit(1);

  return (
    <LessonView
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
        videoProvider: lesson.videoProvider,
        videoId: lesson.videoId,
        xpReward: lesson.xpReward,
      }}
      moduleCode={mod?.code || ""}
      lessonCode={lesson.code}
      user={{
        id: user.id,
        name: user.name,
        hearts: user.hearts,
        streakDays: user.streakDays,
        xp: user.xp,
      }}
      alreadyCompleted={!!completedRow}
    />
  );
}
