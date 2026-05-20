import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { SenderoMap } from "@/components/platform/SenderoMap";
import type { SenderoModule, SenderoModuleState } from "@/components/platform/SenderoMap";
import { CursoRightPanel } from "@/components/platform/CursoRightPanel";
import type { NextMission } from "@/components/platform/CursoRightPanel";
import { IssueCertificateButton } from "@/components/platform/IssueCertificateButton";

export const dynamic = "force-dynamic";

const DAILY_GOAL = 3;
const REWARD_TARGET = 3;

/**
 * /plataforma/curso/[slug] — Premium gamified course view inspired by
 * the design mock: zigzag sendero on the left, motivation panel on
 * the right, and a "Tu viaje" stats card overlaid on the map.
 *
 * All numbers are real, pulled from:
 *  - modules + module_progress           → sendero states + counts
 *  - lessons + lesson_progress           → lessons done, daily goal,
 *                                          reward progress, next mission
 *  - lesson_attempts (last 7 days)       → weekly XP & ranking trend
 */
export default async function CursoSendero({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/plataforma/curso/${slug}`);

  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.slug, slug))
    .limit(1);
  if (!program) notFound();

  const [enrollment] = await db
    .select()
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.userId, user.id), eq(schema.enrollments.programId, program.id)))
    .limit(1);
  if (!enrollment) redirect(`/programas/${slug}`);

  const mods = await db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.programId, program.id))
    .orderBy(asc(schema.modules.sortOrder));

  // Lesson counts per module
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

  // moduleProgress for this user
  const progress = await db
    .select()
    .from(schema.moduleProgress)
    .where(eq(schema.moduleProgress.userId, user.id));
  const progressMap = new Map(progress.map((p) => [p.moduleId, p.state as SenderoModuleState]));

  // States: explicit → DB; otherwise first non-done becomes current, rest locked.
  const states = new Map<string, SenderoModuleState>();
  let firstUndoneSet = false;
  for (const m of mods) {
    const explicit = progressMap.get(m.id);
    if (explicit === "done") {
      states.set(m.id, "done");
    } else if (explicit === "current" || explicit === "in_progress") {
      states.set(m.id, explicit);
      firstUndoneSet = true;
    } else if (!firstUndoneSet) {
      states.set(m.id, "current");
      firstUndoneSet = true;
    } else {
      states.set(m.id, "locked");
    }
  }

  const doneCount = Array.from(states.values()).filter((s) => s === "done").length;
  const totalModules = mods.length;
  const totalLessonsInCourse = Array.from(lessonCounts.values()).reduce((a, b) => a + b, 0);
  const progressPct = totalModules > 0 ? Math.round((doneCount / totalModules) * 100) : 0;

  // Total lessons completed by user across THIS course
  const lessonsDoneRes = (await db.execute(sql`
    SELECT COUNT(*)::int AS done
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE m.program_id = ${program.id} AND lp.user_id = ${user.id}
  `)) as unknown as { rows?: Array<{ done: number }> } | Array<{ done: number }>;
  const ldRows = Array.isArray(lessonsDoneRes) ? lessonsDoneRes : (lessonsDoneRes.rows ?? []);
  const lessonsDone = ldRows[0]?.done ?? 0;

  // XP earned in this course
  const xpRes = (await db.execute(sql`
    SELECT COALESCE(SUM(la.xp_earned), 0)::int AS total
    FROM lesson_attempts la
    JOIN lessons l ON l.id = la.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE m.program_id = ${program.id} AND la.user_id = ${user.id}
  `)) as unknown as { rows?: Array<{ total: number }> } | Array<{ total: number }>;
  const xpRows: Array<{ total: number }> = Array.isArray(xpRes) ? xpRes : (xpRes.rows ?? []);
  const xpInCourse = xpRows[0]?.total ?? 0;

  // Next mission (next lesson in the current module, not yet completed)
  const currentMod = mods.find((m) => states.get(m.id) === "current" || states.get(m.id) === "in_progress");
  let nextMission: NextMission | null = null;
  if (currentMod) {
    const nm = (await db.execute(sql`
      SELECT l.id, l.code, l.title, l.body, l.kind, l.xp_reward AS "xpReward",
             l.video_duration_seconds AS "videoDurationSeconds"
      FROM lessons l
      WHERE l.module_id = ${currentMod.id}
        AND NOT EXISTS (
          SELECT 1 FROM lesson_progress lp
          WHERE lp.lesson_id = l.id AND lp.user_id = ${user.id}
        )
      ORDER BY l.sort_order ASC
      LIMIT 1
    `)) as unknown as
      | { rows?: Array<any> }
      | Array<any>;
    const rows = Array.isArray(nm) ? nm : (nm.rows ?? []);
    const lesson = rows[0];
    if (lesson) {
      const minutes = lesson.videoDurationSeconds
        ? Math.max(2, Math.round(lesson.videoDurationSeconds / 60))
        : lesson.kind === "video"
          ? 12
          : 5;
      const desc: string | null =
        (typeof lesson.body === "string" && lesson.body.trim().length > 0
          ? lesson.body.trim().slice(0, 140)
          : null) ?? null;
      nextMission = {
        lessonId: lesson.id,
        moduleCode: currentMod.code,
        lessonCode: lesson.code,
        title: lesson.title,
        description: desc,
        xpReward: lesson.xpReward ?? 0,
        estMinutes: minutes,
      };
    }
  }

  // Weekly rank (across the platform, by XP earned last 7 days)
  const rankRes = (await db.execute(sql`
    WITH weekly AS (
      SELECT user_id, COALESCE(SUM(xp_earned), 0)::int AS wxp
      FROM lesson_attempts
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY user_id
    ),
    union_users AS (
      SELECT u.id AS user_id, COALESCE(w.wxp, 0) AS wxp
      FROM users u LEFT JOIN weekly w ON w.user_id = u.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM union_users) AS total,
      (SELECT COUNT(*)::int + 1 FROM union_users
        WHERE wxp > (SELECT COALESCE(wxp, 0) FROM union_users WHERE user_id = ${user.id})
      ) AS rank
  `)) as unknown as { rows?: Array<{ total: number; rank: number }> } | Array<{ total: number; rank: number }>;
  const rrows = Array.isArray(rankRes) ? rankRes : (rankRes.rows ?? []);
  const weeklyRank = rrows[0]?.rank ?? 1;
  const weeklyTotal = rrows[0]?.total ?? 1;

  // Weekly trend: XP earned per day, last 7 days
  const trendRes = (await db.execute(sql`
    SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(la.xp_earned), 0)::int AS xp
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
    LEFT JOIN lesson_attempts la
      ON date_trunc('day', la.created_at)::date = d::date AND la.user_id = ${user.id}
    GROUP BY 1
    ORDER BY 1
  `)) as unknown as { rows?: Array<{ day: string; xp: number }> } | Array<{ day: string; xp: number }>;
  const trendRows = Array.isArray(trendRes) ? trendRes : (trendRes.rows ?? []);
  const weeklyTrend: number[] = trendRows.length > 0 ? trendRows.map((r) => r.xp) : [0, 0, 0, 0, 0, 0, 0];

  // Daily goal: lessons completed today (across all courses) → target = DAILY_GOAL
  const todayRes = (await db.execute(sql`
    SELECT COUNT(*)::int AS done
    FROM lesson_progress
    WHERE user_id = ${user.id}
      AND completed_at::date = CURRENT_DATE
  `)) as unknown as { rows?: Array<{ done: number }> } | Array<{ done: number }>;
  const trows = Array.isArray(todayRes) ? todayRes : (todayRes.rows ?? []);
  const dailyDone = trows[0]?.done ?? 0;

  // Certificate
  let certificateCode: string | null = null;
  const programComplete = mods.length > 0 && doneCount === mods.length;
  if (programComplete) {
    const [cert] = await db
      .select()
      .from(schema.certificates)
      .where(
        and(
          eq(schema.certificates.userId, user.id),
          eq(schema.certificates.programId, program.id),
        ),
      )
      .limit(1);
    certificateCode = cert?.code ?? null;
  }

  const senderoModules: SenderoModule[] = mods.map((m) => ({
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

  const levelLabel = getLevelLabel(user.level);

  return (
    <AlumnoShell user={user} active="sendero">
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 0" }}>
        {/* Breadcrumb */}
        <Link
          href="/plataforma"
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textDecoration: "none",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          ← MIS CURSOS
        </Link>

        {/* Header */}
        <div
          className="between"
          style={{ marginTop: 12, marginBottom: 20, flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", fontWeight: 700 }}>
              {(program.type || "curso").toUpperCase()}
              {program.durationLabel ? ` · ${program.durationLabel.toUpperCase()}` : ""}
            </div>
            <h1
              className="serif"
              style={{
                fontSize: 42,
                marginTop: 8,
                lineHeight: 1.05,
                color: "var(--navy)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {program.title}
            </h1>
            {program.subtitle && (
              <p
                style={{
                  color: "var(--muted)",
                  marginTop: 10,
                  fontSize: 15,
                  lineHeight: 1.5,
                  maxWidth: 720,
                }}
              >
                {program.subtitle}
              </p>
            )}
          </div>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <StatChip icon="🔥" label="Racha" value={`${user.streakDays} días`} accent="warm" />
            <StatChip icon="★" label="Total" value={`${user.xp.toLocaleString("es-MX")} XP`} accent="gold" />
            <StatChip icon="◆" label={levelLabel} value={`Nivel ${user.level}`} accent="navy" />
          </div>
        </div>

        {/* Progress bar card */}
        <div
          style={{
            background: "#FFFDF8",
            border: "1px solid rgba(10,30,58,0.06)",
            borderRadius: 18,
            padding: "18px 24px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto auto",
            gap: 20,
            alignItems: "center",
            marginBottom: 24,
            boxShadow: "0 8px 22px rgba(10,30,58,0.05)",
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", fontWeight: 700 }}>
              TU PROGRESO
            </div>
            <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>
              {progressPct}%
            </div>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(216,168,63,0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #D8A83F 0%, #F2C65A 100%)",
                transition: "width 0.5s",
              }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
              MÓDULOS
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
              {doneCount} / {totalModules}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
              LECCIONES
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
              {lessonsDone} / {totalLessonsInCourse}
            </div>
          </div>
        </div>

        {/* Certificate banner if complete */}
        {programComplete && (
          <div
            style={{
              padding: 22,
              marginBottom: 22,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, var(--navy) 0%, color-mix(in srgb, var(--navy) 80%, black) 100%)",
              color: "white",
              border: "2px solid var(--gold)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "var(--gold)",
                color: "var(--navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 700,
                fontFamily: "var(--font-serif)",
              }}
            >
              ★
            </div>
            <div>
              <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.08em" }}>
                CURSO COMPLETADO
              </div>
              <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>
                ¡Felicidades! Terminaste el programa completo.
              </div>
            </div>
            {certificateCode ? (
              <Link
                href={`/cert/${certificateCode}`}
                style={{
                  padding: "12px 22px",
                  borderRadius: 999,
                  background: "var(--gold)",
                  color: "var(--navy)",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Ver mi certificado →
              </Link>
            ) : (
              <IssueCertificateButton programId={program.id} />
            )}
          </div>
        )}

        {/* Sendero + right panel grid */}
        <div
          className="curso-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: Sendero */}
          <div style={{ position: "relative" }}>
            {mods.length === 0 ? (
              <div
                style={{
                  padding: 36,
                  textAlign: "center",
                  background: "#FFFDF8",
                  borderRadius: 18,
                  border: "1px solid var(--line)",
                }}
              >
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  SIN MÓDULOS AÚN
                </div>
                <p style={{ marginTop: 8, color: "var(--muted)" }}>
                  Este curso todavía no tiene módulos publicados.
                </p>
              </div>
            ) : (
              <SenderoMap modules={senderoModules} />
            )}

            {/* "Tu viaje" overlay card */}
            {mods.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: 16,
                  width: 280,
                  background: "linear-gradient(165deg, #0B2548 0%, #061B36 100%)",
                  color: "white",
                  borderRadius: 16,
                  padding: 18,
                  border: "1px solid rgba(216,168,63,0.22)",
                  boxShadow: "0 14px 30px rgba(10,30,58,0.22)",
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }} aria-hidden>🧭</span>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--gold)", fontWeight: 700 }}>
                    TU VIAJE
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <JourneyStat label="MÓDULOS" value={String(doneCount)} unit="completados" />
                  <JourneyStat label="LECCIONES" value={String(lessonsDone)} unit="completadas" />
                  <JourneyStat label="XP" value={xpInCourse.toLocaleString("es-MX")} unit="acumulados" />
                </div>
                <Link
                  href="/comunidad/ranking"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  📊 Ver estadísticas
                  <span style={{ color: "var(--gold)" }}>→</span>
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT: Motivation panel */}
          <CursoRightPanel
            nextMission={nextMission}
            streakDays={user.streakDays}
            weeklyRank={weeklyRank}
            weeklyTotal={weeklyTotal}
            weeklyTrend={weeklyTrend}
            dailyGoalTarget={DAILY_GOAL}
            dailyGoalDone={dailyDone}
            rewardTarget={REWARD_TARGET}
            rewardProgress={dailyDone}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .curso-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AlumnoShell>
  );
}

/* ───────────── Helpers ───────────── */
function StatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: "warm" | "gold" | "navy";
}) {
  const palette =
    accent === "warm"
      ? { bg: "color-mix(in srgb, #E89B3D 12%, white)", border: "rgba(232,155,61,0.30)", color: "#B85F12" }
      : accent === "gold"
        ? { bg: "color-mix(in srgb, #D8A83F 12%, white)", border: "rgba(216,168,63,0.30)", color: "#7c5410" }
        : { bg: "color-mix(in srgb, var(--navy) 8%, white)", border: "rgba(11,37,72,0.18)", color: "var(--navy)" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: "10px 14px",
        boxShadow: "0 4px 10px rgba(10,30,58,0.04)",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: palette.color, lineHeight: 1 }}>
          {value}
        </div>
        <div
          className="mono"
          style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 2 }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function JourneyStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{unit}</div>
    </div>
  );
}

function getLevelLabel(level: number): string {
  if (level >= 10) return "Maestro";
  if (level >= 7) return "Operador";
  if (level >= 4) return "Constructor";
  if (level >= 1) return "Aprendiz";
  return "Iniciado";
}
