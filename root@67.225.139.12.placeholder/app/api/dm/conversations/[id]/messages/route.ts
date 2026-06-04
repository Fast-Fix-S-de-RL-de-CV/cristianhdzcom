import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dm/conversations/[id]/messages
 *   Returns all messages in the conversation (asc) and marks the peer's
 *   unread messages as read for the current user.
 *
 * POST /api/dm/conversations/[id]/messages
 *   Body: { body: string }
 *   Inserts a new message authored by the current user and bumps the
 *   conversation's `lastMessageAt`. Returns the new message + peerId.
 */
const postBody = z.object({ body: z.string().min(1).max(4000) });

async function assertParticipant(conversationId: string, userId: string) {
  const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId)).limit(1);
  if (!c) return null;
  if (c.userAId !== userId && c.userBId !== userId) return null;
  return c;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const conv = await assertParticipant(id, user.id);
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Mark peer's messages as read
  await db
    .update(schema.messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.messages.conversationId, id),
        sql`${schema.messages.authorId} <> ${user.id}`,
        sql`${schema.messages.readAt} IS NULL`,
      ),
    );

  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));
  const peerId = conv.userAId === user.id ? conv.userBId : conv.userAId;
  const [peer] = await db.select().from(schema.users).where(eq(schema.users.id, peerId)).limit(1);
  return NextResponse.json({ messages: rows, peer: peer ? { id: peer.id, name: peer.name, role: peer.role, level: peer.level } : null });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const conv = await assertParticipant(id, user.id);
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const json = await req.json().catch(() => ({}));
  const parsed = postBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const now = new Date();
  const [inserted] = await db
    .insert(schema.messages)
    .values({ conversationId: id, authorId: user.id, body: parsed.data.body.trim(), createdAt: now })
    .returning();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: now })
    .where(eq(schema.conversations.id, id));

  return NextResponse.json({ message: inserted });
}
