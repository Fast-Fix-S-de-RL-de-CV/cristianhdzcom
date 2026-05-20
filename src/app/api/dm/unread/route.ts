import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dm/unread
 * Returns the count of unread messages addressed to the current user
 * across all conversations. Used to render a badge in the sidebar.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unread: 0 });

  const res = (await db.execute(sql`
    SELECT COUNT(*)::int AS unread
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.author_id <> ${user.id}
      AND m.read_at IS NULL
      AND (c.user_a_id = ${user.id} OR c.user_b_id = ${user.id})
  `)) as unknown as { rows?: Array<{ unread: number }> } | Array<{ unread: number }>;
  const rows: Array<{ unread: number }> = Array.isArray(res) ? res : (res.rows ?? []);
  return NextResponse.json({ unread: rows[0]?.unread ?? 0 });
}
