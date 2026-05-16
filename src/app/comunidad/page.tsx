import Link from "next/link";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/marketing/Nav";
import { CommunityShell } from "@/components/community/CommunityShell";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getCurrentUser();

  const posts = await db
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
    .limit(20);

  const cats = await db.select().from(schema.categories);
  const leaderboard = await db
    .select({ id: schema.users.id, name: schema.users.name, level: schema.users.level, xp: schema.users.xp })
    .from(schema.users)
    .orderBy(desc(schema.users.xp))
    .limit(7);
  const events = await db.select().from(schema.events).orderBy(schema.events.startsAt).limit(3);

  return (
    <>
      {!user && <Nav />}
      <CommunityShell user={user ? { name: user.name, role: user.role, level: user.level } : null}>
        <div
          style={{
            padding: "32px 56px",
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <CommunityFeed
            initialPosts={posts.map((p) => ({
              ...p,
              createdAt: (p.createdAt as Date).toISOString(),
            }))}
            categories={cats}
            currentUser={user ? { id: user.id, name: user.name, level: user.level } : null}
          />
          <CommunitySidebar
            leaderboard={leaderboard.map((u) => ({ ...u }))}
            currentUserId={user?.id}
            events={events.map((e) => ({
              ...e,
              startsAt: (e.startsAt as Date).toISOString(),
            }))}
          />
        </div>
      </CommunityShell>
    </>
  );
}
