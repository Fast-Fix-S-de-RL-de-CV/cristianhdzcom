import { redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { asc, eq, gte, sql } from "drizzle-orm";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { getCurrentUser } from "@/lib/auth";
import { CopilotoPanel } from "@/components/platform/CopilotoPanel";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const WEEKDAY_LABEL: Record<number, string> = {
  0: "DOM", 1: "LUN", 2: "MAR", 3: "MIÉ", 4: "JUE", 5: "VIE", 6: "SÁB",
};

const ACCENT_PALETTE: Record<string, { ring: string; chip: string; chipBg: string }> = {
  accent: { ring: "var(--accent)", chip: "var(--accent)", chipBg: "var(--accent-soft)" },
  warm:   { ring: "var(--warm)",   chip: "oklch(45% 0.12 75)", chipBg: "var(--warm-soft)" },
  green:  { ring: "var(--green)",  chip: "var(--green-strong)", chipBg: "var(--green-soft)" },
  ink:    { ring: "var(--ink)",    chip: "var(--ink)", chipBg: "var(--bg-2)" },
  gold:   { ring: "var(--gold)",   chip: "var(--gold-deep)", chipBg: "color-mix(in srgb, var(--gold) 18%, white)" },
};

const TYPE_LABEL: Record<string, string> = {
  curso: "CURSO",
  taller: "TALLER",
  certificacion: "CERTIFICACIÓN",
  consultoria: "CONSULTORÍA",
  agencia: "AGENCIA",
};

/**
 * /plataforma — "Mis cursos" dashboard.
 *
 * Replaces the previous single-program sendero with a Duolingo-style grid
 * of course cards. Each card shows real progress (modules done / total),
 * XP earned, current module title and a CTA that deep-links into the
 * per-course sendero at /plataforma/curso/[slug].
 *
 * Anything the super-admin edits at /admin/cursos/[id] is reflected here
 * immediately — the page reads from `programs`, `modules`, `enrollments`
 * and `moduleProgress` with no cached layer.
 */
export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma");

  // Pull every program the user is enrolled in (active), with module and
  // progress counts computed in SQL so the dashboard is one round-trip.
  type Row = {
    programId: string;
    slug: string;
    title: string;
    subtitle: string | null;
    type: string;
    accent: string | null;
    durationLabel: string | null;
    modulesCount: number;
    doneCount: number;
    xpEarned: number;
    currentModuleTitle: string | null;
    currentModuleCode: string | null;
    currentModuleId: string | null;
  };

  const enrolledRes = (await db.execute(sql`
    SELECT
      p.id                AS "programId",
      p.slug              AS "slug",
      p.title             AS "title",
      p.subtitle          AS "subtitle",
      p.type              AS "type",
      p.accent            AS "accent",
      p.duration_label    AS "durationLabel",
      (SELECT COUNT(*)::int FROM modules WHERE program_id = p.id) AS "modulesCount",
      (SELECT COUNT(*)::int FROM module_progress mp
        JOIN modules m ON m.id = mp.module_id
        WHERE m.program_id = p.id AND mp.user_id = ${user.id} AND mp.state = 'done')
        AS "doneCount",
      COALESCE((
        SELECT SUM(la.xp_earned)::int
        FROM lesson_attempts la
        JOIN lessons l ON l.id = la.lesson_id
        JOIN modules m ON m.id = l.module_id
        WHERE m.program_id = p.id AND la.user_id = ${user.id}
      ), 0) AS "xpEarned",
      cur.title  AS "currentModuleTitle",
      cur.code   AS "currentModuleCode",
      cur.id     AS "currentModuleId"
    FROM enrollments e
    JOIN programs p ON p.id = e.program_id
    LEFT JOIN LATERAL (
      SELECT m.id, m.title, m.code
      FROM modules m
      LEFT JOIN module_progress mp
        ON mp.module_id = m.id AND mp.user_id = ${user.id}
      WHERE m.program_id = p.id
        AND (mp.state IS NULL OR mp.state <> 'done')
      ORDER BY m.sort_order ASC
      LIMIT 1
    ) cur ON TRUE
    WHERE e.user_id = ${user.id}
      AND e.status IN ('active', 'trial')
      AND p.is_active = TRUE
    ORDER BY p.sort_order ASC, p.title ASC
  `)) as unknown as { rows?: Row[] } | Row[];
  const enrolled: Row[] = Array.isArray(enrolledRes) ? enrolledRes : (enrolledRes.rows ?? []);

  // Recommend up to 3 active programs the user is NOT enrolled in.
  type Reco = { id: string; slug: string; title: string; subtitle: string | null; type: string; priceUsd: number; accent: string | null };
  const recommendedRes = (await db.execute(sql`
    SELECT p.id, p.slug, p.title, p.subtitle, p.type,
           p.price_usd AS "priceUsd", p.accent
    FROM programs p
    WHERE p.is_active = TRUE
      AND p.id NOT IN (SELECT program_id FROM enrollments WHERE user_id = ${user.id})
    ORDER BY p.is_featured DESC, p.sort_order ASC
    LIMIT 3
  `)) as unknown as { rows?: Reco[] } | Reco[];
  const recommended: Reco[] = Array.isArray(recommendedRes) ? recommendedRes : (recommendedRes.rows ?? []);

  // Upcoming events for right aside.
  const upcoming = await db
    .select()
    .from(schema.events)
    .where(gte(schema.events.startsAt, new Date()))
    .orderBy(asc(schema.events.startsAt))
    .limit(3);
  const today = new Date();

  const totalCourses = enrolled.length;
  const totalDone = enrolled.reduce((acc, r) => acc + (r.doneCount ?? 0), 0);
  const totalModules = enrolled.reduce((acc, r) => acc + (r.modulesCount ?? 0), 0);

  const rightAside = (
    <>
      <CopilotoPanel />
      <div>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="eyebrow">Próximos eventos</span>
          <Link href="/comunidad/calendario" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            VER TODO
          </Link>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {upcoming.length === 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                Sin eventos próximos
              </div>
            </div>
          )}
          {upcoming.map((e) => {
            const d = new Date(e.startsAt);
            const monthLabel = format(d, "LLL", { locale: es }).toUpperCase().slice(0, 3);
            const dayNumber = format(d, "dd");
            const time = format(d, "HH:mm");
            const dayLabel = isSameDay(d, today) ? "HOY" : WEEKDAY_LABEL[d.getDay()];
            const inner = (
              <div className="card" style={{ padding: 12, display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, alignItems: "center" }}>
                <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 8, padding: 6, textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 9, opacity: 0.7 }}>{monthLabel}</div>
                  <div className="serif" style={{ fontSize: 16, lineHeight: 1 }}>{dayNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {dayLabel} · {time}
                  </div>
                </div>
                <span style={{ color: "var(--accent)" }}>→</span>
              </div>
            );
            return e.link ? (
              <Link key={e.id} href={e.link} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>
            ) : <div key={e.id}>{inner}</div>;
          })}
        </div>
      </div>
    </>
  );

  return (
    <AlumnoShell user={user} active="sendero" rightAside={rightAside}>
      {/* Header */}
      <div className="between" style={{ marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Plataforma · mis cursos</div>
          <h1 className="serif" style={{ fontSize: 40, marginTop: 8, lineHeight: 1.1 }}>
            Hola {user.name.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, maxWidth: 560 }}>
            Continúa donde te quedaste. Cada lección suma XP, mantiene tu racha y desbloquea el siguiente módulo.
          </p>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <span className="streak">{user.streakDays} días</span>
          <span className="chip chip-gold mono">XP · {user.xp.toLocaleString("es-MX")}</span>
          <span className="chip mono">{user.hearts} ♥</span>
        </div>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Card style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>CURSOS ACTIVOS</div>
          <div className="serif" style={{ fontSize: 32, marginTop: 4 }}>{totalCourses}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>MÓDULOS COMPLETADOS</div>
          <div className="serif" style={{ fontSize: 32, marginTop: 4 }}>
            {totalDone}<span style={{ fontSize: 16, color: "var(--muted)" }}> / {totalModules}</span>
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>RACHA</div>
          <div className="serif" style={{ fontSize: 32, marginTop: 4 }}>{user.streakDays}<span style={{ fontSize: 16, color: "var(--muted)" }}> días</span></div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>XP TOTAL</div>
          <div className="serif" style={{ fontSize: 32, marginTop: 4 }}>{user.xp.toLocaleString("es-MX")}</div>
        </Card>
      </div>

      {/* Course grid */}
      {enrolled.length === 0 ? (
        <Card style={{ padding: 36, textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>SIN INSCRIPCIONES</div>
          <h2 className="serif" style={{ fontSize: 24, marginTop: 8 }}>Aún no estás inscrito en ningún curso.</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Explora los programas disponibles y empieza tu primer carril.
          </p>
          <Link href="/programas" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            Ver programas →
          </Link>
        </Card>
      ) : (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Continúa aprendiendo</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {enrolled.map((c) => {
              const palette = ACCENT_PALETTE[c.accent || "accent"] || ACCENT_PALETTE.accent!;
              const total = c.modulesCount || 0;
              const done = c.doneCount || 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isStarted = done > 0;
              return (
                <Link
                  key={c.programId}
                  href={`/plataforma/curso/${c.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card
                    hover
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      borderColor: palette.ring,
                      borderWidth: 2,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Color band */}
                    <div
                      style={{
                        height: 80,
                        background: `linear-gradient(135deg, ${palette.chipBg} 0%, white 100%)`,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 20px",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: palette.ring,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-serif)",
                          fontSize: 22,
                          fontWeight: 700,
                          boxShadow: "0 4px 0 rgba(10,30,58,0.18)",
                        }}
                      >
                        {(c.title || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "white",
                          color: palette.chip,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {TYPE_LABEL[c.type] || c.type.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
                      <div>
                        <h3 className="serif" style={{ fontSize: 18, lineHeight: 1.25, color: "var(--navy)" }}>
                          {c.title}
                        </h3>
                        {c.subtitle && (
                          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
                            {c.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="between" style={{ marginBottom: 6 }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                            {done}/{total} MÓDULOS
                          </span>
                          <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: palette.chip }}>
                            {pct}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "var(--bg-2)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: palette.ring,
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                      </div>

                      {/* XP earned + next-step */}
                      <div className="row" style={{ gap: 8, fontSize: 12, flexWrap: "wrap" }}>
                        <span
                          className="mono"
                          style={{
                            padding: "3px 8px",
                            background: palette.chipBg,
                            color: palette.chip,
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          {(c.xpEarned ?? 0).toLocaleString("es-MX")} XP
                        </span>
                        {c.durationLabel && (
                          <span style={{ color: "var(--muted)" }}>{c.durationLabel}</span>
                        )}
                      </div>

                      {/* Next module */}
                      <div style={{ marginTop: "auto" }}>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 4 }}>
                          {pct === 100 ? "COMPLETADO" : isStarted ? "SIGUIENTE MÓDULO" : "EMPEZAR POR"}
                        </div>
                        {c.currentModuleTitle ? (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                            {c.currentModuleCode && (
                              <span className="mono" style={{ fontSize: 10, color: palette.chip, marginRight: 8 }}>
                                {c.currentModuleCode}
                              </span>
                            )}
                            {c.currentModuleTitle}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green-strong)" }}>
                            ✓ Curso completado
                          </div>
                        )}
                      </div>

                      <div
                        className="row"
                        style={{
                          marginTop: 6,
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: palette.ring,
                          color: "white",
                          fontWeight: 600,
                          fontSize: 13,
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{pct === 100 ? "Repasar curso" : isStarted ? "Continuar" : "Empezar"}</span>
                        <span style={{ fontSize: 18 }}>→</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Cursos disponibles para ti</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
              marginBottom: 40,
            }}
          >
            {recommended.map((r: any) => {
              const palette = ACCENT_PALETTE[r.accent || "accent"] || ACCENT_PALETTE.accent!;
              return (
                <Link key={r.id} href={`/programas/${r.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Card hover style={{ padding: 18 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        padding: "3px 7px",
                        borderRadius: 4,
                        background: palette.chipBg,
                        color: palette.chip,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {TYPE_LABEL[r.type] || r.type.toUpperCase()}
                    </span>
                    <h3 className="serif" style={{ fontSize: 16, marginTop: 10, color: "var(--navy)", lineHeight: 1.3 }}>
                      {r.title}
                    </h3>
                    {r.subtitle && (
                      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{r.subtitle}</p>
                    )}
                    <div className="between" style={{ marginTop: 12, alignItems: "center" }}>
                      <span className="serif" style={{ fontSize: 18, color: palette.chip, fontWeight: 700 }}>
                        ${(r.priceUsd as number).toLocaleString("en-US")}
                      </span>
                      <span style={{ color: palette.chip, fontWeight: 600, fontSize: 12 }}>Ver detalle →</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </AlumnoShell>
  );
}
