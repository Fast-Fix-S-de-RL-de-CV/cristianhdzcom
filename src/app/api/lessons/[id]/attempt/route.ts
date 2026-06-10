import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { bumpStreak } from "@/lib/streak";

/**
 * POST /api/lessons/[id]/attempt
 *
 * Records a quiz attempt. Correctness is decided SERVER-SIDE against the
 * lesson's correctKey (multiple_choice / true_false); open and fill_blank
 * answers are accepted as correct. XP is granted only the FIRST time the
 * lesson is answered correctly (lesson_progress is the idempotency marker,
 * same as /complete), so re-answering can't farm XP.
 */
const body = z.object({
  answer: z.string().min(1).max(2000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const json = await req.json().catch(() => ({}));
  const parsed = body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1);
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // multiple_choice / true_false validate against correctKey; open and
  // fill_blank (or lessons without a configured key) accept the answer.
  const checksKey =
    (lesson.kind === "multiple_choice" || lesson.kind === "true_false") && lesson.correctKey != null;
  const isCorrect = checksKey ? data.answer === lesson.correctKey : true;

  // XP only the first time: lesson_progress is the idempotency marker.
  let xpEarned = 0;
  let alreadyCompleted = false;
  if (isCorrect) {
    const [existing] = await db
      .select()
      .from(schema.lessonProgress)
      .where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, id)))
      .limit(1);
    alreadyCompleted = !!existing;
    if (!existing) xpEarned = lesson.xpReward ?? 0;
  }

  await db.insert(schema.lessonAttempts).values({
    userId: user.id,
    lessonId: id,
    answer: data.answer,
    isCorrect,
    xpEarned,
  });

  let moduleCompleted = false;
  let certificateIssued: { code: string; programId: string } | null = null;

  if (isCorrect) {
    if (!alreadyCompleted) {
      await db
        .insert(schema.lessonProgress)
        .values({ userId: user.id, lessonId: id, xpEarned })
        .onConflictDoNothing();
    }
    if (xpEarned > 0) {
      await db
        .update(schema.users)
        .set({ xp: sql`${schema.users.xp} + ${xpEarned}` })
        .where(eq(schema.users.id, user.id));
    }
    // Racha: responder bien una lección cuenta como actividad del día.
    await bumpStreak(user.id);

    // Same module-completion / promotion / certificate logic as /complete,
    // so modules whose last lesson is a quiz can actually finish.
    const result = await completeModuleIfDone(user.id, lesson.moduleId);
    moduleCompleted = result.moduleCompleted;
    certificateIssued = result.certificate;
  } else {
    await db
      .update(schema.users)
      .set({ hearts: sql`GREATEST(${schema.users.hearts} - 1, 0)` })
      .where(eq(schema.users.id, user.id));
  }

  return NextResponse.json({
    ok: true,
    isCorrect,
    xpEarned,
    alreadyCompleted,
    moduleCompleted,
    certificate: certificateIssued,
  });
}

/** Mirrors the module-completion side effects of /api/lessons/[id]/complete. */
async function completeModuleIfDone(
  userId: string,
  moduleId: string,
): Promise<{ moduleCompleted: boolean; certificate: { code: string; programId: string } | null }> {
  const allLessons = await db.select().from(schema.lessons).where(eq(schema.lessons.moduleId, moduleId));
  const completedLessons = await db
    .select()
    .from(schema.lessonProgress)
    .where(eq(schema.lessonProgress.userId, userId));
  const completedSet = new Set(completedLessons.map((r) => r.lessonId));
  const allDone = allLessons.length > 0 && allLessons.every((l) => completedSet.has(l.id));
  if (!allDone) return { moduleCompleted: false, certificate: null };

  const [progress] = await db
    .select()
    .from(schema.moduleProgress)
    .where(and(eq(schema.moduleProgress.userId, userId), eq(schema.moduleProgress.moduleId, moduleId)))
    .limit(1);
  if (progress && progress.state === "done") return { moduleCompleted: false, certificate: null };

  await db
    .insert(schema.moduleProgress)
    .values({
      userId,
      moduleId,
      state: "done",
      completedAt: new Date(),
      lastTouchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.moduleProgress.userId, schema.moduleProgress.moduleId],
      set: { state: "done", completedAt: new Date(), lastTouchedAt: new Date() },
    });

  let certificate: { code: string; programId: string } | null = null;
  const [mod] = await db.select().from(schema.modules).where(eq(schema.modules.id, moduleId)).limit(1);
  if (mod) {
    const programModules = (
      await db.select().from(schema.modules).where(eq(schema.modules.programId, mod.programId))
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = programModules.findIndex((m) => m.id === mod.id);
    const next = programModules[idx + 1];
    if (next) {
      await db
        .insert(schema.moduleProgress)
        .values({ userId, moduleId: next.id, state: "current" })
        .onConflictDoNothing();
    }

    const programProgress = await db
      .select()
      .from(schema.moduleProgress)
      .where(eq(schema.moduleProgress.userId, userId));
    const doneSet = new Set(programProgress.filter((p) => p.state === "done").map((p) => p.moduleId));
    const programComplete = programModules.length > 0 && programModules.every((m) => doneSet.has(m.id));
    if (programComplete) {
      const [existingCert] = await db
        .select()
        .from(schema.certificates)
        .where(
          and(eq(schema.certificates.userId, userId), eq(schema.certificates.programId, mod.programId)),
        )
        .limit(1);
      let cert = existingCert;
      if (!cert) {
        const inserted = await db
          .insert(schema.certificates)
          .values({ userId, programId: mod.programId, code: generateCertCode() })
          .returning();
        cert = inserted[0];
      }
      if (cert) certificate = { code: cert.code, programId: mod.programId };
    }
  }
  return { moduleCompleted: true, certificate };
}

function generateCertCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
