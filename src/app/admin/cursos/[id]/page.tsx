import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { CursoEditorClient } from "./CursoEditorClient";

export const dynamic = "force-dynamic";

export default async function CursoEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const { tab } = await searchParams;

  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.id, id))
    .limit(1);
  if (!program) notFound();

  const modulesRows = await db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.programId, id))
    .orderBy(asc(schema.modules.sortOrder), asc(schema.modules.code));

  const moduleIds = modulesRows.map((m) => m.id);
  const lessonsRows =
    moduleIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.lessons)
          .where(inArray(schema.lessons.moduleId, moduleIds))
          .orderBy(asc(schema.lessons.sortOrder), asc(schema.lessons.code));

  const cohortsRows = await db
    .select()
    .from(schema.cohorts)
    .where(eq(schema.cohorts.programId, id))
    .orderBy(desc(schema.cohorts.startsOn));

  const enrollmentsRows = await db
    .select({
      id: schema.enrollments.id,
      userId: schema.users.id,
      userName: schema.users.name,
      userEmail: schema.users.email,
      userLevel: schema.users.level,
      cohortId: schema.enrollments.cohortId,
      cohortCode: schema.cohorts.code,
      status: schema.enrollments.status,
      enrolledAt: schema.enrollments.enrolledAt,
      completedAt: schema.enrollments.completedAt,
    })
    .from(schema.enrollments)
    .innerJoin(schema.users, eq(schema.users.id, schema.enrollments.userId))
    .leftJoin(schema.cohorts, eq(schema.cohorts.id, schema.enrollments.cohortId))
    .where(eq(schema.enrollments.programId, id))
    .orderBy(desc(schema.enrollments.enrolledAt));

  // Count lessons per module
  const lessonsByModule: Record<string, number> = {};
  for (const m of modulesRows) lessonsByModule[m.id] = 0;
  for (const l of lessonsRows) lessonsByModule[l.moduleId] = (lessonsByModule[l.moduleId] ?? 0) + 1;

  return (
    <AdminPageShell
      user={user}
      active="/admin/cursos"
      title={program.title}
      subtitle={`/${program.slug}`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <CursoEditorClient
          program={{
            id: program.id,
            slug: program.slug,
            title: program.title,
            subtitle: program.subtitle ?? "",
            type: program.type,
            durationLabel: program.durationLabel ?? "",
            priceUsd: program.priceUsd,
            priceCompareUsd: program.priceCompareUsd ?? null,
            installmentPriceUsd: program.installmentPriceUsd ?? null,
            installmentCount: program.installmentCount ?? null,
            accent: (program.accent ?? "accent") as
              | "accent"
              | "warm"
              | "green"
              | "navy"
              | "gold",
            description: program.description ?? "",
            bullets: program.bullets ?? [],
            whoFor: program.whoFor ?? [],
            faqs: program.faqs ?? [],
            modulesCount: program.modulesCount ?? 0,
            isFeatured: program.isFeatured,
            isActive: program.isActive,
            sortOrder: program.sortOrder ?? 0,
          }}
          modules={modulesRows.map((m) => ({
            id: m.id,
            programId: m.programId,
            code: m.code,
            title: m.title,
            description: m.description ?? "",
            weekLabel: m.weekLabel ?? "",
            isBig: m.isBig,
            xpReward: m.xpReward,
            sortOrder: m.sortOrder,
            lessonsCount: lessonsByModule[m.id] ?? 0,
          }))}
          lessons={lessonsRows.map((l) => ({
            id: l.id,
            moduleId: l.moduleId,
            code: l.code,
            title: l.title,
            kind: l.kind,
            question: l.question,
            body: l.body ?? "",
            options: ((l.options ?? []) as { k: string; t: string; correct?: boolean }[]).map(
              (o) => ({ key: o.k, text: o.t }),
            ),
            correctKey: l.correctKey ?? "",
            hint: l.hint ?? "",
            explanation: l.explanation ?? "",
            xpReward: l.xpReward,
            sortOrder: l.sortOrder,
            videoProvider: l.videoProvider,
            videoId: l.videoId,
            videoUrl: l.videoUrl ?? null,
          }))}
          cohorts={cohortsRows.map((c) => ({
            id: c.id,
            programId: c.programId,
            code: c.code ?? "",
            startsOn: c.startsOn,
            endsOn: c.endsOn,
            seatsTotal: c.seatsTotal,
            seatsTaken: c.seatsTaken,
            isOpen: c.isOpen,
          }))}
          enrollments={enrollmentsRows.map((e) => ({
            id: e.id,
            userId: e.userId,
            userName: e.userName,
            userEmail: e.userEmail,
            userLevel: e.userLevel,
            cohortId: e.cohortId,
            cohortCode: e.cohortCode ?? "",
            status: e.status,
            enrolledAt: (e.enrolledAt as Date).toISOString(),
            completedAt: e.completedAt ? (e.completedAt as Date).toISOString() : null,
          }))}
          initialTab={tab ?? "info"}
        />
      </Card>
    </AdminPageShell>
  );
}
