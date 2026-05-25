import { db, schema } from "@/db";
import { desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ProspectosShell } from "./ProspectosShell";
import type { ProspectoRow } from "./ProspectosTable";
import type { LeadRow } from "./LeadsTab";

export const dynamic = "force-dynamic";

/**
 * /admin/prospectos  — Embudo de marketing unificado
 *
 * Dos sub-vistas que viven bajo este URL:
 *
 *   1. PROSPECTOS  → usuarios registrados (cuenta + password) sin orden pagada.
 *                    Aunque hayan tomado cursos gratis, siguen siendo prospectos
 *                    hasta que paguen algo. Origen: tabla `users`.
 *
 *   2. LEADS       → emails capturados (newsletter, popups, lead magnets) sin
 *                    cuenta. Solo email + source + tag. Origen: tabla `leads`.
 *
 * El embudo completo: anónimo → LEAD → PROSPECTO → CLIENTE → ALUMNO.
 *
 * Definiciones operativas:
 *   - Cliente = usuario con al menos una order succeeded.
 *   - Alumno  = usuario con al menos una enrollment (puede ser prospecto o
 *               cliente dependiendo de si pagó).
 */
export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { tab } = await searchParams;
  const initialTab = tab === "leads" ? "leads" : "prospects";

  // ── 1. Prospectos (users sin orden pagada), ordenados por "tan caliente" ──
  const prospectsRes = (await db.execute(sql`
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
  `)) as unknown as { rows?: ProspectoRow[] } | ProspectoRow[];
  const prospects: ProspectoRow[] = Array.isArray(prospectsRes) ? prospectsRes : (prospectsRes.rows ?? []);

  // ── 2. Leads (emails capturados sin cuenta) ──
  const leadsRaw = await db
    .select({
      id: schema.leads.id,
      email: schema.leads.email,
      source: schema.leads.source,
      tag: schema.leads.tag,
      createdAt: schema.leads.createdAt,
      hasPurchased: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.orders}
        WHERE ${schema.orders.email} = ${schema.leads.email}
          AND ${schema.orders.status} = 'succeeded'
      )`,
    })
    .from(schema.leads)
    .orderBy(desc(schema.leads.createdAt));
  const leads: LeadRow[] = leadsRaw.map((l) => ({
    id: l.id,
    email: l.email,
    source: l.source ?? "",
    tag: l.tag ?? "",
    createdAt: l.createdAt.toISOString(),
    hasPurchased: Number(l.hasPurchased) > 0,
  }));

  // ── Subtítulo: muestra los totales de las dos sub-vistas ──
  const hot = prospects.filter((r) => r.enrollmentsCount > 0 || r.lessonsDone > 0).length;
  const cold = prospects.length - hot;
  const converted = leads.filter((l) => l.hasPurchased).length;
  const subtitle =
    `${prospects.length} prospectos (${hot} con actividad · ${cold} fríos) ` +
    `· ${leads.length} leads (${converted} ya compraron)`;

  return (
    <AdminPageShell
      user={user}
      active="/admin/prospectos"
      title="Prospectos & Leads"
      subtitle={subtitle}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ProspectosShell
          prospects={prospects}
          leads={leads}
          currentUserId={user.id}
          initialTab={initialTab}
        />
      </Card>
    </AdminPageShell>
  );
}
