import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql, gt, eq, and } from "drizzle-orm";
import { getTenantCtx } from "@/lib/tenant";

// GET /api/community/stats
// {
//   members:   integer  — total users
//   online:    integer  — sessions with expiresAt in the future updated < 30 min
//   countries: integer  — distinct non-null users.country
//   founder:   { id, name } — first admin of the tenant alphabetically
// }
export async function GET() {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const [{ members }] = await db
    .select({ members: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(eq(schema.users.tenantId, ctx.tenant.id));

  // Sessions whose expiresAt hasn't lapsed approximate "online" — within 30 min
  // of the 30-day TTL means active recently. Cheap and good enough.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const sessionTtlMs = 30 * 24 * 3600 * 1000;
  const onlineThreshold = new Date(thirtyMinAgo.getTime() + sessionTtlMs);
  const [{ online }] = await db
    .select({ online: sql<number>`count(DISTINCT ${schema.sessions.userId})::int` })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(gt(schema.sessions.expiresAt, onlineThreshold), eq(schema.users.tenantId, ctx.tenant.id)));

  const [{ countries }] = await db
    .select({
      countries: sql<number>`count(DISTINCT ${schema.users.country}) FILTER (WHERE ${schema.users.country} IS NOT NULL AND ${schema.users.country} <> '')::int`,
    })
    .from(schema.users)
    .where(eq(schema.users.tenantId, ctx.tenant.id));

  // First admin of the tenant (the founder). Stable across seeds.
  const founderRes = (await db.execute(
    sql`SELECT id, name FROM users WHERE tenant_id = ${ctx.tenant.id} AND role IN ('admin', 'superadmin') ORDER BY created_at ASC LIMIT 1`,
  )) as unknown as { rows?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>;
  const founderRowsArr = Array.isArray(founderRes) ? founderRes : founderRes.rows ?? [];
  const founder = founderRowsArr[0] ?? null;

  return NextResponse.json({ members, online, countries, founder });
}
