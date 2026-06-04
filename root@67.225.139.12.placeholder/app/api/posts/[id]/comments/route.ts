import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

const commentBody = z.object({
  body: z.string().min(1).max(4000),
});

// GET /api/posts/[id]/comments → array of comments ordered oldest → newest
// with author fields needed to render an avatar + name.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorId: schema.comments.authorId,
      authorName: schema.users.name,
      authorRole: schema.users.role,
      authorLevel: schema.users.level,
      authorAvatarUrl: schema.users.avatarUrl,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
    .where(eq(schema.comments.postId, id))
    .orderBy(asc(schema.comments.createdAt));
  return NextResponse.json(rows);
}

// POST /api/posts/[id]/comments — create a comment. Bumps posts.commentsCount.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let parsed: { body: string };
  try {
    parsed = commentBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const [post] = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.id, id))
    .limit(1);
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });

  const [created] = await db
    .insert(schema.comments)
    .values({ postId: id, authorId: user.id, body: parsed.body })
    .returning({ id: schema.comments.id, body: schema.comments.body, createdAt: schema.comments.createdAt });

  // Bump denormalized count
  await db
    .update(schema.posts)
    .set({ commentsCount: sql`${schema.posts.commentsCount} + 1` })
    .where(eq(schema.posts.id, id));

  // Lightweight XP reward for commenting
  await db
    .update(schema.users)
    .set({ xp: sql`${schema.users.xp} + 5` })
    .where(eq(schema.users.id, user.id));

  return NextResponse.json({
    ...created,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    authorLevel: user.level,
    authorAvatarUrl: user.avatarUrl,
  });
}
