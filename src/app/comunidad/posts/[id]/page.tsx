import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, asc, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";
import { TierBadge } from "@/components/tier/TierBadge";
import { AttachmentsList, PaywallSchema, PostPaywall } from "@/components/community/PostPaywall";
import { buildPreview, getPostVisibility } from "@/lib/post-visibility";
import type { Tier } from "@/lib/experience";
import { PostThreadClient } from "./PostThreadClient";

export const dynamic = "force-dynamic";

/* ─────────── Metadata para SEO ───────────
 * Renderizamos OG + title + description con el preview, para que cuando
 * un visitante anónimo aterrice desde Google vea el snippet correcto.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [row] = await db
    .select({
      title: schema.posts.title,
      body: schema.posts.body,
      authorName: schema.users.name,
    })
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .where(eq(schema.posts.id, id))
    .limit(1);

  if (!row) return { title: "Post no encontrado" };
  return {
    title: `${row.title} · Comunidad CH`,
    description: buildPreview(row.body, 160),
    openGraph: {
      title: row.title,
      description: buildPreview(row.body, 160),
      type: "article",
      authors: [row.authorName],
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  const [row] = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      body: schema.posts.body,
      imageUrl: schema.posts.imageUrl,
      attachments: schema.posts.attachments,
      authorTierAtPost: schema.posts.authorTierAtPost,
      minTierRequired: schema.posts.minTierRequired,
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
      authorTier: schema.users.tier,
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

  // Calculate paywall visibility from viewer + post state.
  const attachments = Array.isArray(row.attachments) ? row.attachments : [];
  const visibility = getPostVisibility({
    viewerTier: (user?.tier ?? null) as Tier | null,
    postMinTierRequired: row.minTierRequired,
    postAuthorTierAtPost: row.authorTierAtPost,
    hasAttachments: attachments.length > 0,
  });

  const preview = buildPreview(row.body, 320);
  const viewerScore = user?.tierScore ?? 0;

  // Liked status + comments (solo si está logueado)
  let viewerLiked = false;
  let comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    authorName: string;
    authorRole: string;
    authorLevel: number;
    authorAvatarUrl: string | null;
  }> = [];

  if (user) {
    const liked = await db
      .select({ id: schema.postLikes.userId })
      .from(schema.postLikes)
      .where(and(eq(schema.postLikes.postId, id), eq(schema.postLikes.userId, user.id)))
      .limit(1);
    viewerLiked = liked.length > 0;

    comments = await db
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
  }

  // ── El cuerpo del post (preview o completo según paywall) ──
  const postBody = (
    <Card style={{ padding: 28 }}>
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
            {row.authorTier && row.authorTier !== "visitor" && (
              <TierBadge tier={row.authorTier as Tier} size="xs" />
            )}
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

      <h1 className="serif" style={{ fontSize: 28, lineHeight: 1.2, marginBottom: 14, color: "var(--ink)" }}>
        {row.title}
      </h1>

      {/* Body: si el viewer no puede ver el body completo, render preview + paywall */}
      {visibility.canSeeBody ? (
        <div
          className="paywalled-content"
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
      ) : (
        <>
          {/* Preview indexable por Google */}
          <div
            style={{
              color: "var(--ink-2)",
              fontSize: 15,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: 18,
            }}
          >
            {preview}
          </div>
          <PostPaywall visibility={visibility} viewerScore={viewerScore} variant="body">
            <div
              className="paywalled-content"
              style={{
                color: "var(--ink-2)",
                fontSize: 15,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {row.body.slice(preview.length, preview.length + 400)}
            </div>
          </PostPaywall>
        </>
      )}

      {row.imageUrl && visibility.canSeeBody && (
        <img
          src={row.imageUrl}
          alt=""
          style={{ width: "100%", borderRadius: 12, marginTop: 20, border: "1px solid var(--line)" }}
        />
      )}

      {/* Adjuntos premium */}
      {attachments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Eyebrow style={{ marginBottom: 10 }}>Adjuntos · {attachments.length}</Eyebrow>
          <AttachmentsList attachments={attachments} visibility={visibility} viewerScore={viewerScore} />
        </div>
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
  );

  // ─────────── Render según si está logueado ───────────

  // Si NO está logueado: renderiza con Nav público + post preview + CTA
  if (!user) {
    return (
      <div>
        <Nav />
        <PaywallSchema
          postTitle={row.title}
          authorName={row.authorName}
          createdAt={row.createdAt.toISOString()}
        />
        <section className="sec" style={{ paddingTop: 32, paddingBottom: 56 }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Link
              href="/comunidad"
              className="mono"
              style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}
            >
              ← VOLVER AL FEED
            </Link>
            <div style={{ marginTop: 16 }}>{postBody}</div>

            {/* Banner de registro al pie del post */}
            <div
              style={{
                marginTop: 28,
                padding: 32,
                borderRadius: 18,
                background: "linear-gradient(180deg, #061B36 0%, #0B2548 100%)",
                color: "white",
                textAlign: "center",
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 11, color: "rgba(216,168,63,0.95)", letterSpacing: "0.08em", marginBottom: 8 }}
              >
                ÚNETE A LA COMUNIDAD
              </div>
              <h2 className="serif" style={{ fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>
                {comments.length > 0
                  ? `Ya hay ${row.commentsCount} comentarios en este post.`
                  : "Lee el feed completo, comenta y conoce a quien escribió esto."}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 20, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                Es gratis. Te toma 1 minuto. Acceso inmediato al feed, miembros, talleres en vivo y biblioteca.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href={`/registro?next=/comunidad/posts/${row.id}`}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(180deg, #F2C65A 0%, #D8A83F 100%)",
                    color: "#061B36",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Crear cuenta gratis →
                </Link>
                <Link
                  href={`/login?next=/comunidad/posts/${row.id}`}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // Logged-in: AlumnoShell + body + comments thread
  return (
    <AlumnoShell user={user} active="comunidad">
      <PaywallSchema
        postTitle={row.title}
        authorName={row.authorName}
        createdAt={row.createdAt.toISOString()}
      />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 24px 32px" }}>
        <Link
          href="/comunidad"
          className="mono"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}
        >
          ← VOLVER AL FEED
        </Link>

        <div style={{ marginTop: 16 }}>{postBody}</div>

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
    </AlumnoShell>
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
