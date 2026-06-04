import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/lessons/[id]/complete
 *
 * Marks a video-style lesson as completed for the current user (lessons
 * with quizzes use /api/lessons/[id]/attempt instead). Idempotent: a second
 * call returns ok=true without granting XP twice.
 *
 * Side effects:
 *   - Inserts row in lesson_progress (if absent) with the lesson's xpReward
 *   - Adds xpReward to users.xp the first time
 *   - If the module now has all its lessons completed AND no completion
 *     row exists in module_progress, marks the module as 'done' and
 *     promotes the next module to 'current'. Also issues a certificate if
 *     this was the last module of the program.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });

  // Idempotency check
  const [existing] = await db
    .select()
    .from(schema.lessonProgress)
    .where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, lessonId)))
    .limit(1);

  let awardedXp = 0;
  if (!existing) {
    awardedXp = lesson.xpReward ?? 0;
    await db.insert(schema.lessonProgress).values({
      userId: user.id,
      lessonId,
      xpEarned: awardedXp,
    });
    if (awardedXp > 0) {
      await db
        .update(schema.users)
        .set({ xp: sql`${schema.users.xp} + ${awardedXp}` })
        .where(eq(schema.users.id, user.id));
    }
  }

  // Check whether the module is now complete.
  const moduleId = lesson.moduleId;
  const allLessons = await db.select().from(schema.lessons).where(eq(schema.lessons.moduleId, moduleId));
  const completedLessons = await db
    .select()
    .from(schema.lessonProgress)
    .where(and(eq(schema.lessonProgress.userId, user.id)));
  const completedSet = new Set(completedLessons.map((r) => r.lessonId));
  const allDone = allLessons.length > 0 && allLessons.every((l) => completedSet.has(l.id));

  let moduleCompleted = false;
  let certificateIssued: { code: string; programId: string } | null = null;

  if (allDone) {
    const [progress] = await db
      .select()
      .from(schema.moduleProgress)
      .where(and(eq(schema.moduleProgress.userId, user.id), eq(schema.moduleProgress.moduleId, moduleId)))
      .limit(1);
    if (!progress || progress.state !== "done") {
      // Mark this module done.
      await db
        .insert(schema.moduleProgress)
        .values({
          userId: user.id,
          moduleId,
          state: "done",
          completedAt: new Date(),
          lastTouchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.moduleProgress.userId, schema.moduleProgress.moduleId],
          set: { state: "done", completedAt: new Date(), lastTouchedAt: new Date() },
        });
      moduleCompleted = true;

      // Promote the next module of the same program to "current".
      const [mod] = await db.select().from(schema.modules).where(eq(schema.modules.id, moduleId)).limit(1);
      if (mod) {
        const nextMods = await db
          .select()
          .from(schema.modules)
          .where(eq(schema.modules.programId, mod.programId));
        const sorted = nextMods.sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex((m) => m.id === mod.id);
        const next = sorted[idx + 1];
        if (next) {
          await db
            .insert(schema.moduleProgress)
            .values({ userId: user.id, moduleId: next.id, state: "current" })
            .onConflictDoNothing();
        }

        // If ALL modules of the program are now done → issue certificate (idempotent).
        const programModules = sorted;
        const programProgress = await db
          .select()
          .from(schema.moduleProgress)
          .where(eq(schema.moduleProgress.userId, user.id));
        const doneSet = new Set(programProgress.filter((p) => p.state === "done").map((p) => p.moduleId));
        const programComplete = programModules.length > 0 && programModules.every((m) => doneSet.has(m.id));
        if (programComplete) {
          // Auto-issue
          const [existingCert] = await db
            .select()
            .from(schema.certificates)
            .where(
              and(
                eq(schema.certificates.userId, user.id),
                eq(schema.certificates.programId, mod.programId),
              ),
            )
            .limit(1);
          let cert = existingCert;
          if (!cert) {
            const code = generateCertCode();
            const inserted = await db
              .insert(schema.certificates)
              .values({ userId: user.id, programId: mod.programId, code })
              .returning();
            cert = inserted[0];
          }
          if (cert) certificateIssued = { code: cert.code, programId: mod.programId };
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    awardedXp,
    alreadyCompleted: !!existing,
    moduleCompleted,
    certificate: certificateIssued,
  });
}

function generateCertCode(): string {
  // 12 alphanumeric chars, easy to read aloud
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
