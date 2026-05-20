import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/dm/conversations/start
 * Body: { userId: string }
 *
 * Finds or creates the conversation between the current user and `userId`.
 * Pair is normalized so the smaller uuid is always userAId — this lets the
 * unique index `(user_a_id, user_b_id)` enforce uniqueness symmetrically.
 *
 * → { conversation: { id, peerId } }
 */
const body = z.object({ userId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (parsed.data.userId === user.id) {
    return NextResponse.json({ error: "cannot_message_self" }, { status: 400 });
  }

  // Confirm peer exists
  const [peer] = await db.select().from(schema.users).where(eq(schema.users.id, parsed.data.userId)).limit(1);
  if (!peer) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  // Normalize pair order
  const [userAId, userBId] =
    user.id < parsed.data.userId ? [user.id, parsed.data.userId] : [parsed.data.userId, user.id];

  const [existing] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.userAId, userAId), eq(schema.conversations.userBId, userBId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ conversation: { id: existing.id, peerId: peer.id } });
  }
  const [created] = await db
    .insert(schema.conversations)
    .values({ userAId, userBId })
    .returning();
  return NextResponse.json({ conversation: { id: created.id, peerId: peer.id } });
}
