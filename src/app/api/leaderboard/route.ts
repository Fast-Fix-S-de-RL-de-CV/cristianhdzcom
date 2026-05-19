import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, sql, gte, and, eq } from "drizzle-orm";

// GET /api/leaderboard?limit=20&range=7d|30d|all
//
// `range=all` (default): static ordering by users.xp.
// `range=7d` / `range=30d`: ordered by XP awarded in the window. XP earned
// here is proxied by points * lesson_attempts.created_at + comments + posts
// activity. We aggregate lesson_attempts.score sums over the window and use
// them as a tie-breaker on top of base xp.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const range = (url.searchParams.get("range") ?? "all") as "7d" | "30d" | "all";

  if (range === "all") {
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
        level: schema.users.level,
        xp: schema.users.xp,
        streakDays: schema.users.streakDays,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.xp))
      .limit(limit);
    return NextResponse.json(
      rows.map((r, i) => ({ rank: i + 1, ...r, periodXp: r.xp })),
    );
  }

  const days = range === "7d" ? 7 : 30;
  const sinceIso = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  // Window XP = sum of attempt scores in the period + small constants per
  // post + per comment authored in the period. Cheap and matches our
  // awarding model.
  const res = (await db.execute(sql`
    WITH attempt_xp AS (
      SELECT user_id, COALESCE(SUM(xp_earned), 0)::int AS xp
      FROM ${schema.lessonAttempts}
      WHERE created_at >= ${sinceIso}::timestamptz
      GROUP BY user_id
    ),
    post_xp AS (
      SELECT author_id AS user_id, COUNT(*)::int * 10 AS xp
      FROM ${schema.posts}
      WHERE created_at >= ${sinceIso}::timestamptz
      GROUP BY author_id
    ),
    comment_xp AS (
      SELECT author_id AS user_id, COUNT(*)::int * 5 AS xp
      FROM ${schema.comments}
      WHERE created_at >= ${sinceIso}::timestamptz
      GROUP BY author_id
    )
    SELECT
      u.id, u.name, u.avatar_url AS "avatarUrl", u.level, u.xp,
      u.streak_days AS "streakDays",
      (COALESCE(a.xp, 0) + COALESCE(p.xp, 0) + COALESCE(c.xp, 0)) AS "periodXp"
    FROM ${schema.users} u
    LEFT JOIN attempt_xp a ON a.user_id = u.id
    LEFT JOIN post_xp p    ON p.user_id = u.id
    LEFT JOIN comment_xp c ON c.user_id = u.id
    ORDER BY "periodXp" DESC, u.xp DESC
    LIMIT ${limit}
  `)) as unknown as { rows?: any[] } | any[];
  const rowsArr: any[] = Array.isArray(res) ? res : res.rows ?? [];
  return NextResponse.json(
    rowsArr.map((r: any, i: number) => ({ rank: i + 1, ...r })),
  );
}
