import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ProspectosTable, type ProspectoRow } from "./ProspectosTable";

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
type Row = ProspectoRow;

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
        <ProspectosTable rows={rows} currentUserId={user.id} />
      </Card>
    </AdminPageShell>
  );
}
