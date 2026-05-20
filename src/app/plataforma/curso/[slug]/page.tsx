import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { DuolingoPath } from "@/components/platform/DuolingoPath";
import type { PathModule, PathModuleState } from "@/components/platform/DuolingoPath";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const ACCENT_VARS: Record<string, { accent: string; accentSoft: string; ring: string }> = {
  accent: { accent: "var(--accent)", accentSoft: "var(--accent-soft)", ring: "var(--accent)" },
  warm:   { accent: "var(--warm)",   accentSoft: "var(--warm-soft)", ring: "var(--warm)" },
  green:  { accent: "var(--green)",  accentSoft: "var(--green-soft)", ring: "var(--green)" },
  ink:    { accent: "var(--ink)",    accentSoft: "var(--bg-2)", ring: "var(--ink)" },
  gold:   { accent: "var(--gold-deep)", accentSoft: "color-mix(in srgb, var(--gold) 25%, white)", ring: "var(--gold-deep)" },
};

/**
 * /plataforma/curso/[slug] — Sendero Duolingo de UN curso específico.
 *
 * - Guarda que el usuario esté inscrito (sino redirige a /programas/[slug] para comprar).
 * - Computa el estado por módulo (locked | current | done) a partir de moduleProgress.
 * - El primer módulo no-bloqueado se considera "current" si no hay registro explícito.
 * - El CRUD del super-admin en /admin/cursos/[id] se refleja aquí sin caché porque
 *   leemos directo de las tablas con `force-dynamic`.
 */
export default async function CursoSendero({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/plataforma/curso/${slug}`);

  // Curso
  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.slug, slug))
    .limit(1);
  if (!program) notFound();

  // Inscripción
  const [enrollment] = await db
    .select()
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.userId, user.id), eq(schema.enrollments.programId, program.id)))
    .limit(1);
  if (!enrollment) {
    // No inscrito → mandar a la página de venta
    redirect(`/programas/${slug}`);
  }

  // Módulos
  const mods = await db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.programId, program.id))
    .orderBy(asc(schema.modules.sortOrder));

  // Lecciones por módulo (count agregado).
  // Drizzle's execute() returns the raw driver result. postgres-js returns
  // the row array directly; node-postgres wraps it as `{ rows: [...] }`.
  // Cast defensively so this works either way.
  const lessonCountsRes = (await db.execute(sql`
    SELECT module_id AS "moduleId", COUNT(*)::int AS "count"
    FROM lessons
    WHERE module_id = ANY(${sql.raw(`ARRAY[${mods.map((m) => `'${m.id}'`).join(",") || "NULL"}]::uuid[]`)})
    GROUP BY module_id
  `)) as unknown as
    | { rows?: Array<{ moduleId: string; count: number }> }
    | Array<{ moduleId: string; count: number }>;
  const lessonCountRows: Array<{ moduleId: string; count: number }> = Array.isArray(lessonCountsRes)
    ? lessonCountsRes
    : (lessonCountsRes.rows ?? []);
  const lessonCounts = new Map<string, number>(lessonCountRows.map((r) => [r.moduleId, r.count]));

  // Progress
  const progress = await db
    .select()
    .from(schema.moduleProgress)
    .where(eq(schema.moduleProgress.userId, user.id));
  const progressMap = new Map(progress.map((p) => [p.moduleId, p.state as PathModuleState]));

  // Derive states: explicit -> from DB, otherwise lock everything past the first
  // non-completed module (the "current frontier" pattern).
  const states = new Map<string, PathModuleState>();
  let firstUndoneSet = false;
  for (const m of mods) {
    const explicit = progressMap.get(m.id);
    if (explicit === "done") {
      states.set(m.id, "done");
    } else if (explicit === "current" || explicit === "in_progress") {
      states.set(m.id, explicit);
      firstUndoneSet = true;
    } else if (!firstUndoneSet) {
      // first un-done module becomes current
      states.set(m.id, "current");
      firstUndoneSet = true;
    } else {
      states.set(m.id, "locked");
    }
  }

  const doneCount = Array.from(states.values()).filter((s) => s === "done").length;
  const totalLessons = Array.from(lessonCounts.values()).reduce((a, b) => a + b, 0);

  // XP earned in this course
  const xpRes = (await db.execute(sql`
    SELECT COALESCE(SUM(la.xp_earned), 0)::int AS total
    FROM lesson_attempts la
    JOIN lessons l ON l.id = la.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE m.program_id = ${program.id} AND la.user_id = ${user.id}
  `)) as unknown as { rows?: Array<{ total: number }> } | Array<{ total: number }>;
  const xpRows: Array<{ total: number }> = Array.isArray(xpRes) ? xpRes : (xpRes.rows ?? []);
  const xpEarned = xpRows[0]?.total ?? 0;

  const pathModules: PathModule[] = mods.map((m) => ({
    id: m.id,
    code: m.code,
    title: m.title,
    description: m.description,
    weekLabel: m.weekLabel,
    isBig: m.isBig,
    xpReward: m.xpReward,
    lessonsCount: lessonCounts.get(m.id) ?? 0,
    state: states.get(m.id) ?? "locked",
  }));

  const palette = ACCENT_VARS[program.accent || "accent"] || ACCENT_VARS.accent!;
  const pct = mods.length > 0 ? Math.round((doneCount / mods.length) * 100) : 0;

  return (
    <AlumnoShell user={user} active="sendero">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <Link
          href="/plataforma"
          className="mono"
          style={{ fontSize: 11, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}
        >
          ← MIS CURSOS
        </Link>

        {/* Course header */}
        <div className="between" style={{ marginTop: 12, marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="eyebrow" style={{ color: palette.accent }}>
              {(program.type || "curso").toUpperCase()}
              {program.durationLabel ? ` · ${program.durationLabel}` : ""}
            </div>
            <h1 className="serif" style={{ fontSize: 38, marginTop: 8, lineHeight: 1.1, color: "var(--navy)" }}>
              {program.title}
            </h1>
            {program.subtitle && (
              <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5, maxWidth: 620 }}>
                {program.subtitle}
              </p>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="streak">{user.streakDays} días</span>
            <span className="chip chip-gold mono">XP · {xpEarned.toLocaleString("es-MX")}</span>
          </div>
        </div>

        {/* Progress strip */}
        <Card
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            flexWrap: "wrap",
            borderColor: palette.ring,
          }}
        >
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em" }}>
            PROGRESO
          </span>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              height: 10,
              borderRadius: 999,
              background: "var(--bg-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: palette.accent,
                transition: "width 0.4s",
              }}
            />
          </div>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: palette.accent }}>
            {pct}%
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {doneCount} / {mods.length} módulos · {totalLessons} lecciones totales
          </span>
        </Card>

        {/* Path */}
        {mods.length === 0 ? (
          <Card style={{ padding: 36, textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>SIN MÓDULOS AÚN</div>
            <p style={{ marginTop: 8, color: "var(--muted)" }}>
              Este curso todavía no tiene módulos publicados. El equipo está armándolo.
            </p>
          </Card>
        ) : (
          <DuolingoPath
            modules={pathModules}
            accent={palette.accent}
            accentSoft={palette.accentSoft}
          />
        )}
      </div>
    </AlumnoShell>
  );
}
