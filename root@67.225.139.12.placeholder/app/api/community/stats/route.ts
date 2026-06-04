import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql, gt } from "drizzle-orm";

// GET /api/community/stats
// {
//   members:   integer  — total users
//   online:    integer  — sessions with expiresAt in the future updated < 30 min
//   countries: integer  — distinct non-null users.country
//   founder:   { id, name } — first superadmin alphabetically
// }
export async function GET() {
  const [{ members }] = await db
    .select({ members: sql<number>`count(*)::int` })
    .from(schema.users);

  // Sessions whose expiresAt hasn't lapsed approximate "online" — within 30 min
  // of the 30-day TTL means active recently. Cheap and good enough.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const sessionTtlMs = 30 * 24 * 3600 * 1000;
  const onlineThreshold = new Date(thirtyMinAgo.getTime() + sessionTtlMs);
  const [{ online }] = await db
    .select({ online: sql<number>`count(DISTINCT ${schema.sessions.userId})::int` })
    .from(schema.sessions)
    .where(gt(schema.sessions.expiresAt, onlineThreshold));

  const [{ countries }] = await db
    .select({
      countries: sql<number>`count(DISTINCT ${schema.users.country}) FILTER (WHERE ${schema.users.country} IS NOT NULL AND ${schema.users.country} <> '')::int`,
    })
    .from(schema.users);

  // First superadmin (the founder). Stable across seeds.
  const founderRes = (await db.execute(
    sql`SELECT id, name FROM users WHERE role = 'superadmin' ORDER BY created_at ASC LIMIT 1`,
  )) as unknown as { rows?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>;
  const founderRowsArr = Array.isArray(founderRes) ? founderRes : founderRes.rows ?? [];
  const founder = founderRowsArr[0] ?? null;

  return NextResponse.json({ members, online, countries, founder });
}
