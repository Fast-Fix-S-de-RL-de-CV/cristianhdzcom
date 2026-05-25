import { db, schema } from "@/db";
import { desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ProspectosTable, type ProspectoRow } from "./ProspectosTable";

export const dynamic = "force-dynamic";

/**
 * /admin/prospectos  — Embudo de captura unificado
 *
 * Definición operativa acordada con el dueño del negocio:
 *
 *   **Prospecto = cualquier email que tengamos sin compra pagada.**
 *
 * Cubre dos tablas físicas:
 *
 *   - `leads`  → emails capturados desde newsletter, popups, lead magnets.
 *                Pueden NO tener cuenta registrada.
 *   - `users`  → cuentas registradas (con password) sin orden `succeeded`.
 *
 * Esta página hace un MERGE por email (case-insensitive). Si un mismo email
 * está en ambas tablas (alguien dejó su correo en un popup y luego se
 * registró), aparece UNA sola fila con todas las señales combinadas.
 *
 * Embudo completo: anónimo → PROSPECTO → CLIENTE → ALUMNO.
 */
export default async function ProspectosPage() {
  const user = (await getCurrentUser())!;

  // 1) Users sin orden pagada, con engagement calculado.
  type UserRaw = {
    id: string;
    name: string;
    email: string;
    level: number;
    xp: number;
    streakDays: number;
    country: string | null;
    createdAt: string;
    enrollmentsCount: number;
    lessonsDone: number;
  };
  const usersRes = (await db.execute(sql`
    SELECT
      u.id::text                    AS "id",
      u.name                        AS "name",
      u.email                       AS "email",
      u.level                       AS "level",
      u.xp                          AS "xp",
      u.streak_days                 AS "streakDays",
      u.country                     AS "country",
      u.created_at                  AS "createdAt",
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id = u.id)
                                    AS "enrollmentsCount",
      (SELECT COUNT(*)::int FROM lesson_progress lp WHERE lp.user_id = u.id)
                                    AS "lessonsDone"
    FROM users u
    WHERE u.role NOT IN ('admin', 'superadmin')
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE LOWER(o.email) = LOWER(u.email)
          AND o.status = 'succeeded'
      )
    LIMIT 1000
  `)) as unknown as { rows?: UserRaw[] } | UserRaw[];
  const userRows: UserRaw[] = Array.isArray(usersRes) ? usersRes : (usersRes.rows ?? []);

  // 2) Leads (emails) sin orden pagada con ese mismo email.
  const leadRows = await db
    .select({
      id: schema.leads.id,
      email: schema.leads.email,
      source: schema.leads.source,
      tag: schema.leads.tag,
      createdAt: schema.leads.createdAt,
      hasPurchased: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.orders}
        WHERE LOWER(${schema.orders.email}) = LOWER(${schema.leads.email})
          AND ${schema.orders.status} = 'succeeded'
      )`,
    })
    .from(schema.leads)
    .orderBy(desc(schema.leads.createdAt));
  const leadsFiltered = leadRows.filter((l) => Number(l.hasPurchased) === 0);

  // 3) Merge por lower(email). Un email único = una fila.
  const byEmail = new Map<string, ProspectoRow>();

  for (const u of userRows) {
    const key = u.email.toLowerCase();
    byEmail.set(key, {
      email: u.email,
      name: u.name,
      userId: u.id,
      leadId: null,
      source: null,
      tag: null,
      enrollmentsCount: Number(u.enrollmentsCount),
      lessonsDone: Number(u.lessonsDone),
      xp: Number(u.xp),
      level: Number(u.level),
      streakDays: Number(u.streakDays),
      country: u.country,
      createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date(u.createdAt).toISOString(),
    });
  }

  for (const l of leadsFiltered) {
    const key = l.email.toLowerCase();
    const existing = byEmail.get(key);
    const leadDate = l.createdAt.toISOString();
    if (existing) {
      // Mismo email registrado + capturado por marketing → enriquecer la fila.
      existing.leadId = l.id;
      existing.source = l.source ?? null;
      existing.tag = l.tag ?? null;
      // La fecha de captura es la PRIMERA vez que vimos este email.
      if (leadDate < existing.createdAt) existing.createdAt = leadDate;
    } else {
      byEmail.set(key, {
        email: l.email,
        name: null,
        userId: null,
        leadId: l.id,
        source: l.source ?? null,
        tag: l.tag ?? null,
        enrollmentsCount: 0,
        lessonsDone: 0,
        xp: 0,
        level: 0,
        streakDays: 0,
        country: null,
        createdAt: leadDate,
      });
    }
  }

  // 4) Ordenar: calientes primero (más engagement), después por fecha desc.
  const rows: ProspectoRow[] = [...byEmail.values()].sort((a, b) => {
    const aHot = a.enrollmentsCount * 10 + a.lessonsDone;
    const bHot = b.enrollmentsCount * 10 + b.lessonsDone;
    if (aHot !== bHot) return bHot - aHot;
    return b.createdAt.localeCompare(a.createdAt);
  });

  // 5) Subtítulo informativo.
  const withAccount = rows.filter((r) => r.userId != null).length;
  const leadOnly = rows.filter((r) => r.userId == null).length;
  const hot = rows.filter((r) => r.enrollmentsCount > 0 || r.lessonsDone > 0).length;
  const subtitle =
    `${rows.length} prospectos en total · ` +
    `${withAccount} con cuenta · ${leadOnly} solo email · ${hot} calientes`;

  return (
    <AdminPageShell
      user={user}
      active="/admin/prospectos"
      title="Prospectos"
      subtitle={subtitle}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ProspectosTable rows={rows} currentUserId={user.id} />
      </Card>
    </AdminPageShell>
  );
}
