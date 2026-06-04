import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { CommunityPreview } from "@/components/community/CommunityPreview";
import { AlumnoShell, AlumnoHeader } from "@/components/alumno/AlumnoShell";

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

  const leaderboard = await db
    .select({ id: schema.users.id, name: schema.users.name, level: schema.users.level, xp: schema.users.xp })
    .from(schema.users)
    .orderBy(desc(schema.users.xp))
    .limit(7);

  // ──────── Anonymous → Nav + Skool-style preview + Footer ────────
  if (!user) {
    const [{ members }] = await db
      .select({ members: sql<number>`count(*)::int` })
      .from(schema.users);
    const [{ countries }] = await db
      .select({
        countries: sql<number>`count(DISTINCT ${schema.users.country}) FILTER (WHERE ${schema.users.country} IS NOT NULL AND ${schema.users.country} <> '')::int`,
      })
      .from(schema.users);
    const [{ online }] = await db
      .select({ online: sql<number>`count(DISTINCT ${schema.sessions.userId})::int` })
      .from(schema.sessions)
      .where(sql`${schema.sessions.expiresAt} > NOW()`);
    const founderRes = (await db.execute(
      sql`SELECT id, name FROM users WHERE role = 'superadmin' ORDER BY created_at ASC LIMIT 1`,
    )) as unknown as { rows?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>;
    const founderRows = Array.isArray(founderRes) ? founderRes : founderRes.rows ?? [];
    const founder = founderRows[0] ?? null;

    return (
      <>
        <Nav />
        <CommunityPreview
          posts={posts as any}
          leaderboard={leaderboard}
          stats={{ members, online, countries, founder }}
        />
        <Footer />
      </>
    );
  }

  // ──────── Logged user → AlumnoShell with sidebar + feed ────────
  const cats = await db.select().from(schema.categories);
  const events = await db.select().from(schema.events).orderBy(schema.events.startsAt).limit(3);

  return (
    <AlumnoShell user={user} active="comunidad">
      <AlumnoHeader
        eyebrow="COMUNIDAD · CH NEGOCIOS CON IA"
        title="Feed"
        subtitle="Conversaciones, victorias y preguntas de la generación."
        user={{ name: user.name, level: user.level, xp: user.xp, streakDays: user.streakDays }}
      />
      <div
        className="community-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 28,
          alignItems: "flex-start",
        }}
      >
        <CommunityFeed
          initialPosts={posts.map((p) => ({
            ...p,
            createdAt: (p.createdAt as Date).toISOString(),
          }))}
          categories={cats}
          currentUser={{ id: user.id, name: user.name, level: user.level }}
        />
        <CommunitySidebar
          leaderboard={leaderboard.map((u) => ({ ...u }))}
          currentUserId={user.id}
          currentUser={{ xp: user.xp, level: user.level }}
          events={events.map((e) => ({
            ...e,
            startsAt: (e.startsAt as Date).toISOString(),
          }))}
        />
      </div>
    </AlumnoShell>
  );
}
