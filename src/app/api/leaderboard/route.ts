import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

// GET /api/leaderboard?limit=20 — top users by XP
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
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
    rows.map((r, i) => ({ rank: i + 1, ...r })),
  );
}
