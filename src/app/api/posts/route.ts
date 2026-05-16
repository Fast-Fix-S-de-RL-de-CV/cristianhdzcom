import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const body = z.object({
  title: z.string().min(3).max(240),
  body: z.string().min(3).max(10000),
  categoryId: z.number().int().optional(),
});

export async function GET() {
  const rows = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      body: schema.posts.body,
      pinned: schema.posts.pinned,
      hot: schema.posts.hot,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      viewsCount: schema.posts.viewsCount,
      createdAt: schema.posts.createdAt,
      authorName: schema.users.name,
      authorLevel: schema.users.level,
      authorRole: schema.users.role,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .leftJoin(schema.categories, eq(schema.categories.id, schema.posts.categoryId))
    .orderBy(desc(schema.posts.pinned), desc(schema.posts.createdAt))
    .limit(50);
  return NextResponse.json({ posts: rows });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const data = body.parse(await req.json());
    const [post] = await db
      .insert(schema.posts)
      .values({ authorId: user.id, title: data.title, body: data.body, categoryId: data.categoryId })
      .returning();
    // Award XP
    await db
      .update(schema.users)
      .set({ xp: (user.xp || 0) + 5 })
      .where(eq(schema.users.id, user.id));

    // Fetch enriched
    const [enriched] = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        body: schema.posts.body,
        pinned: schema.posts.pinned,
        hot: schema.posts.hot,
        likesCount: schema.posts.likesCount,
        commentsCount: schema.posts.commentsCount,
        viewsCount: schema.posts.viewsCount,
        createdAt: schema.posts.createdAt,
        authorName: schema.users.name,
        authorLevel: schema.users.level,
        authorRole: schema.users.role,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .leftJoin(schema.categories, eq(schema.categories.id, schema.posts.categoryId))
      .where(eq(schema.posts.id, post.id))
      .limit(1);

    await db.insert(schema.activity).values({
      kind: "post",
      icon: "💬",
      text: `${user.name} publicó "${data.title}"`,
      color: "var(--ink)",
    });

    return NextResponse.json({ post: { ...enriched, createdAt: (enriched.createdAt as Date).toISOString() } });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
