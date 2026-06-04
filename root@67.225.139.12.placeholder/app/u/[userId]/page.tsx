import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // UUID sanity check — if the param isn't a UUID just 404 cleanly.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    notFound();
  }

  const [profile] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
      country: schema.users.country,
      level: schema.users.level,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;
  const isAdminViewer = viewer?.role === "admin" || viewer?.role === "superadmin";

  // Stats: post + comment counts
  const [postsAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalLikes: sql<number>`COALESCE(SUM(${schema.posts.likesCount}), 0)::int`,
      totalViews: sql<number>`COALESCE(SUM(${schema.posts.viewsCount}), 0)::int`,
    })
    .from(schema.posts)
    .where(eq(schema.posts.authorId, userId));

  const [commentsAgg] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.comments)
    .where(eq(schema.comments.authorId, userId));

  // Recent posts (up to 8)
  const recentPosts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      body: schema.posts.body,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      viewsCount: schema.posts.viewsCount,
      pinned: schema.posts.pinned,
      createdAt: schema.posts.createdAt,
      categoryName: schema.categories.name,
      categoryEmoji: schema.categories.emoji,
    })
    .from(schema.posts)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.posts.categoryId))
    .where(eq(schema.posts.authorId, userId))
    .orderBy(desc(schema.posts.createdAt))
    .limit(8);

  // Recent comments (up to 5) — only top fragment
  const recentComments = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      postId: schema.comments.postId,
      postTitle: schema.posts.title,
    })
    .from(schema.comments)
    .innerJoin(schema.posts, eq(schema.posts.id, schema.comments.postId))
    .where(eq(schema.comments.authorId, userId))
    .orderBy(desc(schema.comments.createdAt))
    .limit(5);

  // Compute global rank by XP (count users with xp > this user)
  const [higherXp] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(sql`${schema.users.xp} > ${profile.xp}`);
  const rank = (higherXp?.c ?? 0) + 1;

  const isAdminBadge = profile.role === "admin" || profile.role === "superadmin";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Top nav strip — keep it minimal because this can be hit from many places */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid var(--line)",
          padding: "18px 32px",
        }}
      >
        <div
          className="between"
          style={{ maxWidth: 1120, margin: "0 auto", flexWrap: "wrap", gap: 12 }}
        >
          <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio">
            <img src="/logo.png" alt="Cristian Hernández" />
          </Link>
          <div className="row" style={{ gap: 8 }}>
            <Link href="/comunidad/miembros" className="btn btn-ghost">
              ← Miembros
            </Link>
            {viewer && (
              <Link href="/plataforma" className="btn btn-primary">
                Mi plataforma
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {/* Hero card */}
        <Card style={{ padding: 32, marginBottom: 24 }}>
          <div
            className="profile-hero"
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr auto",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div
              className="av"
              style={{
                width: 120,
                height: 120,
                fontSize: 40,
                fontWeight: 600,
              }}
            >
              {initials(profile.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <h1 className="serif" style={{ fontSize: 30, color: "var(--ink)" }}>
                  {profile.name}
                </h1>
                {isAdminBadge && (
                  <span className="chip chip-gold mono" style={{ fontSize: 10 }}>
                    {profile.role === "superadmin" ? "FUNDADOR" : "ADMIN"}
                  </span>
                )}
                {isSelf && (
                  <span className="chip chip-accent mono" style={{ fontSize: 10 }}>
                    TÚ
                  </span>
                )}
              </div>
              <div
                className="mono"
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, letterSpacing: "0.04em" }}
              >
                NIVEL {profile.level} · MIEMBRO DESDE {formatRelative(profile.createdAt)}
                {profile.country ? ` · ${profile.country.toUpperCase()}` : ""}
              </div>
              {profile.bio && (
                <p
                  style={{
                    marginTop: 12,
                    color: "var(--ink-2)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    maxWidth: 540,
                  }}
                >
                  {profile.bio}
                </p>
              )}
              {/* Admins can see the email of the user — useful for the /admin/alumnos → Ver perfil flow */}
              {isAdminViewer && !isSelf && (
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}
                >
                  📧 <a href={`mailto:${profile.email}`} style={{ color: "var(--gold-deep)", fontWeight: 600 }}>{profile.email}</a>
                </div>
              )}
            </div>
            <div className="col" style={{ gap: 8, alignItems: "flex-end" }}>
              {isSelf ? (
                <Link href="/cuenta" className="btn btn-primary">
                  Editar mi perfil
                </Link>
              ) : viewer ? (
                <a
                  href={`mailto:${profile.email}?subject=${encodeURIComponent("Hola desde cristianhdz.com")}`}
                  className="btn btn-primary"
                >
                  Enviar email
                </a>
              ) : (
                <Link href="/registro" className="btn btn-primary">
                  Únete a la comunidad
                </Link>
              )}
              {isAdminViewer && !isSelf && (
                <Link
                  href="/admin/alumnos"
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", textDecoration: "none" }}
                >
                  ← VOLVER A ALUMNOS
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div
          className="profile-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <StatCard label="XP" value={profile.xp.toLocaleString("es-MX")} highlight />
          <StatCard label="Ranking" value={`#${rank}`} />
          <StatCard label="Racha" value={profile.streakDays > 0 ? `🔥 ${profile.streakDays}d` : "—"} />
          <StatCard label="Posts" value={postsAgg?.total ?? 0} />
          <StatCard label="Comentarios" value={commentsAgg?.total ?? 0} />
          <StatCard label="Likes recibidos" value={postsAgg?.totalLikes ?? 0} />
        </div>

        {/* Two columns: posts + comments */}
        <div
          className="profile-cols"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
          }}
        >
          <section>
            <Eyebrow style={{ marginBottom: 12 }}>Publicaciones recientes</Eyebrow>
            {recentPosts.length === 0 ? (
              <Card style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                {isSelf ? "Aún no has publicado nada. Comparte tu progreso en la comunidad." : "Este miembro aún no ha publicado."}
              </Card>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {recentPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/comunidad/posts/${p.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card hover style={{ padding: 18 }}>
                      <div className="row" style={{ gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        {p.pinned && (
                          <span className="chip chip-gold mono" style={{ fontSize: 9, padding: "2px 6px" }}>
                            📌 ANCLADO
                          </span>
                        )}
                        {p.categoryName && (
                          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                            {p.categoryEmoji ?? ""} {p.categoryName}
                          </span>
                        )}
                        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                          · {formatRelative(p.createdAt)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 6, color: "var(--ink)" }}>
                        {p.title}
                      </h3>
                      <p
                        style={{
                          color: "var(--ink-2)",
                          fontSize: 13,
                          lineHeight: 1.5,
                          marginTop: 6,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {p.body}
                      </p>
                      <div
                        className="row"
                        style={{ gap: 18, marginTop: 12, color: "var(--muted)", fontSize: 12 }}
                      >
                        <span className="mono">❤ {p.likesCount}</span>
                        <span className="mono">💬 {p.commentsCount}</span>
                        <span className="mono">👁 {p.viewsCount}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <Eyebrow style={{ marginBottom: 12 }}>Comentarios recientes</Eyebrow>
            {recentComments.length === 0 ? (
              <Card style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                Sin actividad reciente.
              </Card>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {recentComments.map((c) => (
                  <Link
                    key={c.id}
                    href={`/comunidad/posts/${c.postId}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card hover style={{ padding: 14 }}>
                      <div
                        className="mono"
                        style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}
                      >
                        En "{c.postTitle}" · {formatRelative(c.createdAt)}
                      </div>
                      <p
                        style={{
                          color: "var(--ink-2)",
                          fontSize: 13,
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {c.body}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      style={{
        background: highlight ? "var(--gold-soft)" : "white",
        border: `1px solid ${highlight ? "var(--gold-line)" : "var(--line)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        textAlign: "left",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: highlight ? "var(--gold-deep)" : "var(--ink)",
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
