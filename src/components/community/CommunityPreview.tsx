import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  body: string;
  pinned: boolean | null;
  hot: boolean | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  authorName: string | null;
  authorLevel: number | null;
  authorRole: string | null;
  categoryName: string | null;
}

interface LeaderboardRow {
  id: string;
  name: string;
  level: number;
  xp: number;
}

interface Stats {
  members: number;
  online: number;
  countries: number;
  founder: { id: string; name: string } | null;
}

/**
 * Skool-style preview of the community for anonymous visitors.
 * Shows: stats hero, locked feed teasers, leaderboard, big "join free" CTAs.
 * Hides: composer, like/comment buttons, full post bodies, the in-community shell.
 */
export function CommunityPreview({
  posts,
  leaderboard,
  stats,
}: {
  posts: Post[];
  leaderboard: LeaderboardRow[];
  stats: Stats | null;
}) {
  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 80px)" }}>
      {/* HERO */}
      <section
        style={{
          background: "linear-gradient(180deg, var(--navy-soft) 0%, var(--bg) 100%)",
          padding: "56px 24px 40px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow style={{ marginBottom: 14, color: "var(--gold-deep)" }}>
            Comunidad CH · Negocios con IA
          </Eyebrow>
          <h1
            className="serif"
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              maxWidth: 820,
              margin: "0 auto",
              color: "var(--ink)",
            }}
          >
            Una comunidad que <span className="gold-text">construye</span>, no que mira.
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 17,
              lineHeight: 1.6,
              maxWidth: 640,
              margin: "20px auto 0",
            }}
          >
            Programadores, emprendedores y operadores aprendiendo a montar negocios con IA.
            Talleres semanales, demo days, biblioteca completa, mentorías. Gratis para empezar.
          </p>

          {/* Stats bar */}
          {stats && (
            <div
              className="row"
              style={{ gap: 40, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}
            >
              <Stat label="MIEMBROS" value={stats.members.toLocaleString("es-MX")} />
              <Stat label="EN LÍNEA" value={String(stats.online)} accent="green" />
              <Stat label="PAÍSES" value={String(stats.countries)} />
              <Stat label="RATING" value="★ 4.9" />
            </div>
          )}

          <div
            className="row"
            style={{ gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}
          >
            <Link href="/registro" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: 15 }}>
              Entrar gratis →
            </Link>
            <Link href="/login" className="btn btn-ghost" style={{ padding: "14px 28px", fontSize: 15 }}>
              Ya tengo cuenta
            </Link>
          </div>
          <p
            className="mono"
            style={{
              color: "var(--muted)",
              fontSize: 11,
              marginTop: 16,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Sin tarjeta · Cancelas cuando quieras · Acceso inmediato
          </p>
        </div>
      </section>

      {/* MAIN: feed preview + sidebar */}
      <section style={{ padding: "20px 24px 80px" }}>
        <div
          className="community-preview-grid"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 28,
          }}
        >
          {/* LEFT — locked feed */}
          <div>
            <Eyebrow style={{ marginBottom: 14 }}>Lo más reciente · vista previa</Eyebrow>

            {/* Locked composer */}
            <Card
              style={{
                padding: 20,
                marginBottom: 20,
                background: "var(--gold-soft)",
                border: "1px solid var(--gold-line)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 24 }}>🔒</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
                  Únete para participar
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Publicar, comentar, dar likes y subir de nivel es gratis.
                </div>
              </div>
              <Link href="/registro" className="btn btn-primary">
                Crear cuenta gratis →
              </Link>
            </Card>

            {posts.length === 0 && (
              <Card style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                Sin actividad reciente.
              </Card>
            )}

            <div className="col" style={{ gap: 14 }}>
              {posts.slice(0, 6).map((p, i) => (
                <PostPreviewCard key={p.id} post={p} locked={i >= 2} />
              ))}
            </div>

            {posts.length > 2 && (
              <Card
                style={{
                  padding: 28,
                  marginTop: 20,
                  textAlign: "center",
                  background: "linear-gradient(180deg, transparent 0%, var(--navy) 30%)",
                  color: "#FAF3DC",
                  border: "1px solid var(--navy)",
                }}
              >
                <div className="eyebrow" style={{ color: "var(--gold-light)", marginBottom: 8 }}>
                  Hay {posts.length - 2}+ publicaciones más
                </div>
                <h3
                  className="serif"
                  style={{ fontSize: 24, color: "#FAF3DC", marginBottom: 16 }}
                >
                  Únete a la conversación.
                </h3>
                <Link
                  href="/registro"
                  className="btn btn-gold"
                  style={{ padding: "12px 24px" }}
                >
                  Entrar gratis →
                </Link>
              </Card>
            )}
          </div>

          {/* RIGHT — sidebar */}
          <aside className="col" style={{ gap: 16 }}>
            {/* Benefits */}
            <Card style={{ padding: 22 }}>
              <Eyebrow style={{ marginBottom: 12 }}>Qué incluye</Eyebrow>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {[
                  ["🎓", "4 talleres en vivo al mes"],
                  ["💬", "Discord privado con 7 canales"],
                  ["🚀", "Demo days mensuales"],
                  ["📚", "Biblioteca de PDFs, plantillas y notebooks"],
                  ["🏆", "Sistema de niveles, XP y rachas"],
                  ["🤝", "Networking real con otros operadores"],
                ].map(([icon, text]) => (
                  <li
                    key={text}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      fontSize: 14,
                      color: "var(--ink-2)",
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Top members teaser */}
            {leaderboard.length > 0 && (
              <Card style={{ padding: 22 }}>
                <Eyebrow style={{ marginBottom: 12 }}>Ranking · 7 días</Eyebrow>
                <div className="col" style={{ gap: 10 }}>
                  {leaderboard.slice(0, 5).map((u, i) => (
                    <div
                      key={u.id}
                      className="row"
                      style={{ gap: 10, alignItems: "center", filter: i >= 3 ? "blur(2.5px)" : "none" }}
                    >
                      <span
                        className="mono"
                        style={{ width: 24, fontSize: 11, color: "var(--muted)", textAlign: "right" }}
                      >
                        #{i + 1}
                      </span>
                      <div className="av" style={{ width: 28, height: 28, fontSize: 10 }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", flex: 1, minWidth: 0 }}>
                        {u.name}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 600 }}>
                        Lv.{u.level}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/registro"
                  className="mono"
                  style={{
                    display: "block",
                    marginTop: 14,
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--gold-deep)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                  }}
                >
                  VER RANKING COMPLETO →
                </Link>
              </Card>
            )}

            {/* Final CTA */}
            <Card
              style={{
                padding: 22,
                background: "var(--navy)",
                color: "#FAF3DC",
                border: "1px solid var(--navy)",
              }}
            >
              <div className="eyebrow" style={{ color: "var(--gold-light)", marginBottom: 8 }}>
                Listo en 30 segundos
              </div>
              <h3 className="serif" style={{ fontSize: 22, color: "#FAF3DC", lineHeight: 1.2 }}>
                Crea tu cuenta y entra.
              </h3>
              <p style={{ color: "rgba(250,243,220,0.7)", fontSize: 13, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
                Sin tarjeta. Sin compromisos. Cancela cuando quieras.
              </p>
              <Link
                href="/registro"
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
              >
                Entrar gratis →
              </Link>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        className="serif"
        style={{ fontSize: 32, fontWeight: 700, color: accent === "green" ? "var(--green-strong)" : "var(--ink)" }}
      >
        {value}
      </div>
      <div
        className="mono"
        style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 2 }}
      >
        {label}
      </div>
    </div>
  );
}

function PostPreviewCard({ post, locked }: { post: Post; locked: boolean }) {
  const isAdmin = post.authorRole === "admin" || post.authorRole === "superadmin";
  return (
    <Card
      style={{
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {post.pinned && (
        <div
          className="mono"
          style={{
            display: "inline-block",
            fontSize: 9,
            color: "var(--gold-deep)",
            background: "var(--gold-soft)",
            padding: "3px 7px",
            borderRadius: 4,
            marginBottom: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          📌 Anclado
        </div>
      )}

      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
        <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>
          {initials(post.authorName ?? "?")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
              {post.authorName}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              Lv.{post.authorLevel ?? 1}
            </span>
            {isAdmin && (
              <span className="chip chip-gold mono" style={{ fontSize: 9, padding: "2px 5px" }}>
                {post.authorRole === "superadmin" ? "FUNDADOR" : "ADMIN"}
              </span>
            )}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
            {post.categoryName ?? "GENERAL"}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
        {post.title}
      </h3>

      <div style={{ position: "relative" }}>
        <p
          style={{
            color: "var(--ink-2)",
            fontSize: 14,
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: locked ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            filter: locked ? "blur(3px)" : "none",
            userSelect: locked ? "none" : "auto",
          }}
        >
          {post.body}
        </p>
        {locked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(180deg, rgba(251,250,245,0.3) 0%, rgba(251,250,245,0.9) 80%)",
            }}
          >
            <Link
              href="/registro"
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--gold-deep)",
                background: "white",
                border: "1px solid var(--gold-line)",
                padding: "8px 14px",
                borderRadius: 8,
                textDecoration: "none",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                boxShadow: "0 2px 8px rgba(184,134,11,0.15)",
              }}
            >
              🔒 Únete para leer →
            </Link>
          </div>
        )}
      </div>

      <div
        className="row"
        style={{
          gap: 16,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        <span className="mono">❤ {post.likesCount}</span>
        <span className="mono">💬 {post.commentsCount}</span>
        <span className="mono">👁 {post.viewsCount}</span>
      </div>
    </Card>
  );
}
