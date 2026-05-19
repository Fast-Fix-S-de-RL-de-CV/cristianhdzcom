import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq, asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { CommunityShell } from "@/components/community/CommunityShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";
import { PostThreadClient } from "./PostThreadClient";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/comunidad/posts/${id}`);

  // Load post with author + category
  const [row] = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      body: schema.posts.body,
      imageUrl: schema.posts.imageUrl,
      pinned: schema.posts.pinned,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      viewsCount: schema.posts.viewsCount,
      createdAt: schema.posts.createdAt,
      authorId: schema.users.id,
      authorName: schema.users.name,
      authorRole: schema.users.role,
      authorLevel: schema.users.level,
      authorAvatarUrl: schema.users.avatarUrl,
      categoryName: schema.categories.name,
      categorySlug: schema.categories.slug,
      categoryEmoji: schema.categories.emoji,
    })
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .leftJoin(schema.categories, eq(schema.categories.id, schema.posts.categoryId))
    .where(eq(schema.posts.id, id))
    .limit(1);

  if (!row) notFound();

  // Increment views (fire and forget — never block render).
  db.update(schema.posts)
    .set({ viewsCount: sql`${schema.posts.viewsCount} + 1` })
    .where(eq(schema.posts.id, id))
    .catch(() => {});

  // Has the viewer liked this post?
  const liked = await db
    .select({ id: schema.postLikes.userId })
    .from(schema.postLikes)
    .where(eq(schema.postLikes.postId, id))
    .limit(50);
  const viewerLiked = liked.some((l) => l.id === user.id);

  // Initial comments
  const comments = await db
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

  return (
    <CommunityShell
      user={{ name: user.name, role: user.role, level: user.level }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <Link
          href="/comunidad"
          className="mono"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}
        >
          ← VOLVER AL FEED
        </Link>

        <Card style={{ padding: 28, marginTop: 16 }}>
          {row.pinned && (
            <div
              className="mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: "var(--gold-deep)",
                background: "var(--gold-soft)",
                padding: "4px 8px",
                borderRadius: 4,
                marginBottom: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              📌 Fijado por el fundador
            </div>
          )}

          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <Link href={`/u/${row.authorId}`} style={{ textDecoration: "none" }}>
              <div className="av" style={{ width: 44, height: 44, fontSize: 13 }}>
                {initials(row.authorName)}
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <Link
                  href={`/u/${row.authorId}`}
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", textDecoration: "none" }}
                >
                  {row.authorName}
                </Link>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                  Lv.{row.authorLevel}
                </span>
                {(row.authorRole === "admin" || row.authorRole === "superadmin") && (
                  <span className="chip chip-gold mono" style={{ fontSize: 9, padding: "2px 6px" }}>
                    {row.authorRole === "superadmin" ? "FUNDADOR" : "ADMIN"}
                  </span>
                )}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {row.categoryName ? `${row.categoryEmoji ?? ""} ${row.categoryName}`.trim() : "GENERAL"} ·{" "}
                {formatRelative(row.createdAt)}
              </div>
            </div>
          </div>

          <h1
            className="serif"
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              marginBottom: 14,
              color: "var(--ink)",
            }}
          >
            {row.title}
          </h1>

          <div
            style={{
              color: "var(--ink-2)",
              fontSize: 15,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {row.body}
          </div>

          {row.imageUrl && (
            <img
              src={row.imageUrl}
              alt=""
              style={{
                width: "100%",
                borderRadius: 12,
                marginTop: 20,
                border: "1px solid var(--line)",
              }}
            />
          )}

          <div
            className="row"
            style={{
              gap: 24,
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            <span className="mono">👁 {row.viewsCount.toLocaleString("es-MX")}</span>
            <span className="mono">💬 {row.commentsCount}</span>
            <span className="mono">❤ {row.likesCount}</span>
          </div>
        </Card>

        <div style={{ marginTop: 28 }}>
          <Eyebrow style={{ marginBottom: 12 }}>Comentarios · {comments.length}</Eyebrow>
          <PostThreadClient
            postId={row.id}
            initialComments={comments.map((c) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
            }))}
            initialLiked={viewerLiked}
            initialLikesCount={row.likesCount}
            currentUser={{
              id: user.id,
              name: user.name,
              role: user.role,
              level: user.level,
              avatarUrl: user.avatarUrl,
            }}
          />
        </div>
      </div>
    </CommunityShell>
  );
}

function formatRelative(d: Date): string {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return "hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
