import Link from "next/link";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/prospectos
 *
 * Definición acordada:
 *   - Prospecto = usuario registrado SIN ninguna order con status='succeeded'.
 *     Aunque esté inscrito en cursos/talleres gratis, sigue siendo prospecto
 *     hasta que pague algo.
 *   - Cliente = usuario con al menos una order succeeded.
 *   - Alumno = usuario con al menos una enrollment (puede ser prospecto o cliente
 *     dependiendo de si pagó).
 *
 * El listado se ordena por "qué tan caliente está el prospecto":
 *   1. Cuántos eventos/cursos gratis ha tomado (engagement)
 *   2. Su XP (actividad)
 *   3. Fecha de registro (recencia)
 */
type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  country: string | null;
  createdAt: string;
  enrollmentsCount: number;
  lessonsDone: number;
  attemptsCount: number;
};

export default async function ProspectosPage() {
  const user = (await getCurrentUser())!;

  const res = (await db.execute(sql`
    SELECT
      u.id::text                    AS "id",
      u.name                        AS "name",
      u.email                       AS "email",
      u.role                        AS "role",
      u.level                       AS "level",
      u.xp                          AS "xp",
      u.streak_days                 AS "streakDays",
      u.country                     AS "country",
      u.created_at                  AS "createdAt",
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id = u.id)
                                    AS "enrollmentsCount",
      (SELECT COUNT(*)::int FROM lesson_progress lp WHERE lp.user_id = u.id)
                                    AS "lessonsDone",
      (SELECT COUNT(*)::int FROM lesson_attempts la WHERE la.user_id = u.id)
                                    AS "attemptsCount"
    FROM users u
    WHERE u.role NOT IN ('admin', 'superadmin')
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE LOWER(o.email) = LOWER(u.email)
          AND o.status = 'succeeded'
      )
    ORDER BY
      (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) DESC,
      u.xp DESC,
      u.created_at DESC
    LIMIT 500
  `)) as unknown as { rows?: Row[] } | Row[];
  const rows: Row[] = Array.isArray(res) ? res : (res.rows ?? []);

  // Estadística rápida de "qué tan tibio está cada uno"
  const hot = rows.filter((r) => r.enrollmentsCount > 0 || r.lessonsDone > 0).length;
  const cold = rows.length - hot;

  return (
    <AdminPageShell
      user={user}
      active="/admin/prospectos"
      title="Prospectos"
      subtitle={`${rows.length} registrados sin compra · ${hot} con actividad · ${cold} fríos`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div
          className="row"
          style={{
            padding: "12px 24px",
            background: "var(--bg-2)",
            borderBottom: "1px solid var(--line)",
            fontSize: 11,
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ flex: 2 }}>Prospecto</span>
          <span style={{ width: 100, textAlign: "right" }}>Engagement</span>
          <span style={{ width: 80, textAlign: "right" }}>XP</span>
          <span style={{ width: 90, textAlign: "right" }}>Racha</span>
          <span style={{ width: 90 }}>País</span>
          <span style={{ width: 110, textAlign: "right" }}>Registro</span>
          <span style={{ width: 100 }}>Estado</span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 40 }}>🌱</div>
            <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>
              Aún no hay prospectos.
            </div>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              Cuando alguien se registre gratis o se inscriba en un curso/taller gratuito, aparecerá aquí.
            </p>
          </div>
        ) : (
          rows.map((r, i) => {
            const temperature =
              r.enrollmentsCount >= 2 || r.lessonsDone >= 5
                ? { label: "CALIENTE", bg: "color-mix(in srgb, #E89B3D 18%, white)", color: "#a05a0a" }
                : r.enrollmentsCount >= 1 || r.lessonsDone >= 1
                  ? { label: "TIBIO", bg: "color-mix(in srgb, var(--gold) 14%, white)", color: "var(--gold-deep)" }
                  : { label: "FRÍO", bg: "var(--bg-3)", color: "var(--muted)" };
            return (
              <div
                key={r.id}
                className="row"
                style={{
                  padding: "12px 24px",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
                  background: "white",
                  alignItems: "center",
                }}
              >
                <div className="row" style={{ flex: 2, gap: 12, alignItems: "center", minWidth: 0 }}>
                  <Link
                    href={`/u/${r.id}`}
                    aria-label={r.name}
                    style={{ textDecoration: "none", flexShrink: 0 }}
                  >
                    <div className="av" style={{ width: 38, height: 38, fontSize: 12 }}>
                      {initials(r.name)}
                    </div>
                  </Link>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.email}
                    </div>
                  </div>
                </div>
                <span
                  className="mono"
                  style={{
                    width: 100,
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--ink-2)",
                  }}
                >
                  {r.enrollmentsCount} curs · {r.lessonsDone} lec
                </span>
                <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                  {r.xp.toLocaleString("es-MX")}
                </span>
                <span
                  className="mono"
                  style={{
                    width: 90,
                    textAlign: "right",
                    fontSize: 11,
                    color: r.streakDays > 0 ? "#a05a0a" : "var(--muted)",
                  }}
                >
                  {r.streakDays > 0 ? `🔥 ${r.streakDays}d` : "—"}
                </span>
                <span className="mono" style={{ width: 90, fontSize: 11, color: "var(--ink-2)" }}>
                  {r.country || "—"}
                </span>
                <span className="mono" style={{ width: 110, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                  {formatDate(r.createdAt)}
                </span>
                <span style={{ width: 100 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: temperature.bg,
                      color: temperature.color,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {temperature.label}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </Card>
    </AdminPageShell>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}
