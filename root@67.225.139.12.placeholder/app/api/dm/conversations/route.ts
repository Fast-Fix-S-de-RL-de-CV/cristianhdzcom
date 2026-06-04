import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dm/conversations
 * Returns the current user's conversations (one row per pair) sorted by
 * lastMessageAt DESC, with the OTHER participant's profile fields and the
 * latest message snippet + unreadCount.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rowsRaw = (await db.execute(sql`
    SELECT
      c.id                 AS "id",
      c.last_message_at    AS "lastMessageAt",
      c.created_at         AS "createdAt",
      CASE WHEN c.user_a_id = ${user.id} THEN c.user_b_id ELSE c.user_a_id END AS "peerId",
      u.name               AS "peerName",
      u.role               AS "peerRole",
      u.level              AS "peerLevel",
      (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1)
                           AS "lastBody",
      (SELECT m.author_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1)
                           AS "lastAuthorId",
      (SELECT COUNT(*)::int FROM messages m
        WHERE m.conversation_id = c.id
          AND m.author_id <> ${user.id}
          AND m.read_at IS NULL)
                           AS "unread"
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user_a_id = ${user.id} THEN c.user_b_id ELSE c.user_a_id END
    WHERE c.user_a_id = ${user.id} OR c.user_b_id = ${user.id}
    ORDER BY c.last_message_at DESC
    LIMIT 100
  `)) as unknown as { rows?: any[] } | any[];
  const rows = Array.isArray(rowsRaw) ? rowsRaw : (rowsRaw.rows ?? []);
  return NextResponse.json({ conversations: rows });
}
