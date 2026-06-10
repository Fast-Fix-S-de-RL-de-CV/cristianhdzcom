import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/users/bulk-delete
 *
 * Body: { ids: string[] }
 *
 * Permanently deletes the listed users and ALL of their personal data
 * (sessions, posts, comments, lesson progress, notes, DMs, enrollments,
 * certificates, etc.) via the FK cascades defined in schema.ts.
 *
 * IMPORTANT — historial de ventas:
 * `orders.userId` is `ON DELETE SET NULL`, and `orders.email` + `orders.name`
 * are stored as snapshots at checkout time. So when we delete the user, the
 * order row survives with `user_id = NULL` plus the buyer's name/email
 * frozen in place — the historical record stays intact, only the link to
 * the (now deleted) user is severed.
 *
 * Guardrails:
 *   - Caller must be admin / superadmin.
 *   - Superadmins can NEVER be bulk-deleted (the seed admin must stay).
 *   - You can never delete yourself.
 *
 * Returns: { ok: true, deleted: N, preservedOrders: N, skipped: string[] }
 */
const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "admin" && me.role !== "superadmin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { ids } = parsed.data;

  // Resolve which IDs we are allowed to touch.
  const rows = await db
    .select({ id: schema.users.id, role: schema.users.role })
    .from(schema.users)
    .where(inArray(schema.users.id, ids));

  const blocked: { id: string; reason: string }[] = [];
  const eligible: string[] = [];
  for (const r of rows) {
    if (r.id === me.id) {
      blocked.push({ id: r.id, reason: "self" });
      continue;
    }
    if (r.role === "superadmin") {
      blocked.push({ id: r.id, reason: "superadmin" });
      continue;
    }
    eligible.push(r.id);
  }
  // Any id we asked for but didn't find at all
  const foundIds = new Set(rows.map((r) => r.id));
  for (const id of ids) {
    if (!foundIds.has(id)) blocked.push({ id, reason: "not_found" });
  }

  if (eligible.length === 0) {
    return NextResponse.json(
      { ok: false, deleted: 0, preservedOrders: 0, blocked },
      { status: 409 },
    );
  }

  // Count orders that will survive with userId NULL (for the success report).
  const [{ orderCount }] = await db
    .select({ orderCount: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(inArray(schema.orders.userId, eligible));

  // Posts where these users commented or liked: the cascade wipes those rows,
  // so the denormalized counters must be recomputed afterwards.
  const commentPosts = await db
    .select({ postId: schema.comments.postId })
    .from(schema.comments)
    .where(inArray(schema.comments.authorId, eligible));
  const likePosts = await db
    .select({ postId: schema.postLikes.postId })
    .from(schema.postLikes)
    .where(inArray(schema.postLikes.userId, eligible));
  const affectedPostIds = [...new Set([...commentPosts, ...likePosts].map((r) => r.postId))];

  // DELETE — Postgres handles all the cascades from schema.ts.
  await db
    .delete(schema.users)
    .where(
      and(
        inArray(schema.users.id, eligible),
        ne(schema.users.role, "superadmin"),
        ne(schema.users.id, me.id),
      ),
    );

  // Recompute commentsCount / likesCount on the surviving affected posts
  // (posts authored by the deleted users were cascaded away — no-op for them).
  if (affectedPostIds.length > 0) {
    await db
      .update(schema.posts)
      .set({
        commentsCount: sql<number>`(SELECT count(*)::int FROM comments c WHERE c.post_id = ${schema.posts.id})`,
        likesCount: sql<number>`(SELECT count(*)::int FROM post_likes l WHERE l.post_id = ${schema.posts.id})`,
      })
      .where(inArray(schema.posts.id, affectedPostIds));
  }

  return NextResponse.json({
    ok: true,
    deleted: eligible.length,
    preservedOrders: orderCount,
    blocked,
  });
}
