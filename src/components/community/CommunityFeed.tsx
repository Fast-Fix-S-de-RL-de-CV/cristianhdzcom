"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { initials, formatRelative } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/apiError";

type Post = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  hot: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  authorName: string | null;
  authorLevel: number | null;
  authorRole: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  viewerLiked?: boolean;
};

type Category = { id: number; slug: string; name: string; emoji: string | null; color: string | null };

export function CommunityFeed({
  initialPosts,
  categories,
  currentUser,
}: {
  initialPosts: Post[];
  categories: Category[];
  currentUser: { id: string; name: string; level: number } | null;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<string>("todo");
  const [sort, setSort] = useState<"new" | "top" | "trending">("new");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerCat, setComposerCat] = useState<number | undefined>(categories[1]?.id);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Sembrado desde el server para que un post ya likeado no pinte el corazón vacío.
  const [liked, setLiked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialPosts.filter((p) => p.viewerLiked).map((p) => [p.id, true])),
  );

  const byCategory = filter === "todo" ? posts : posts.filter((p) => p.categoryName?.toLowerCase() === filter.toLowerCase());

  const filtered = (() => {
    if (sort === "new") {
      return [...byCategory].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    if (sort === "top") {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      return byCategory
        .filter((p) => new Date(p.createdAt).getTime() >= since)
        .sort((a, b) => b.likesCount - a.likesCount);
    }
    // trending
    const score = (p: Post) => p.likesCount + p.commentsCount * 2 + p.viewsCount * 0.1;
    return [...byCategory].sort((a, b) => score(b) - score(a));
  })();

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    if (!composerTitle.trim() || !composerBody.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: composerTitle, body: composerBody, categoryId: composerCat }),
      });
      if (res.ok) {
        const { post } = await res.json();
        setPosts((p) => [post, ...p]);
        setComposerTitle("");
        setComposerBody("");
        setComposerOpen(false);
        startTransition(() => router.refresh());
      } else {
        const j = await res.json().catch(() => null);
        setPostError(apiErrorMessage(j, "No se pudo publicar — intenta de nuevo"));
      }
    } catch {
      setPostError("Sin conexión — revisa tu internet e intenta de nuevo");
    } finally {
      setPosting(false);
    }
  }

  async function onLike(id: string) {
    if (!currentUser) {
      router.push("/login?next=/comunidad");
      return;
    }
    const next = !liked[id];
    setLiked((s) => ({ ...s, [id]: next }));
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likesCount: p.likesCount + (next ? 1 : -1) } : p)));
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error("like_failed");
    } catch {
      // Revertir el optimismo: el server no guardó el cambio.
      setLiked((s) => ({ ...s, [id]: !next }));
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likesCount: p.likesCount + (next ? -1 : 1) } : p)));
    }
  }

  return (
    <div>
      {/* Composer */}
      <Card style={{ padding: 16, marginBottom: 20 }}>
        {!composerOpen ? (
          <div className="row composer-row" style={{ gap: 12, alignItems: "center" }}>
            <div
              className="av"
              style={{ width: 40, height: 40, fontSize: 13, background: currentUser ? "var(--accent)" : "var(--bg-2)", color: currentUser ? "white" : "var(--muted)" }}
            >
              {currentUser ? initials(currentUser.name) : "?"}
            </div>
            <button
              type="button"
              onClick={() => (currentUser ? setComposerOpen(true) : router.push("/login?next=/comunidad"))}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "var(--bg-2)",
                borderRadius: 999,
                fontSize: 14,
                color: "var(--muted)",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Comparte tu progreso, pregunta o gana puntos…
            </button>
            <Button
              onClick={() => (currentUser ? setComposerOpen(true) : router.push("/login?next=/comunidad"))}
              style={{ padding: "10px 16px", fontSize: 13 }}
            >
              Publicar
            </Button>
          </div>
        ) : (
          <form onSubmit={onPost} className="col" style={{ gap: 12 }}>
            <input
              className="input"
              placeholder="Título de tu publicación…"
              value={composerTitle}
              onChange={(e) => setComposerTitle(e.target.value)}
              required
              minLength={3}
              maxLength={240}
            />
            <textarea
              className="input"
              placeholder="Cuenta más…"
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              required
              minLength={3}
              maxLength={10000}
              rows={4}
              style={{ resize: "vertical", minHeight: 120 }}
            />
            {postError && (
              <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>
                {postError}
              </p>
            )}
            <div className="between" style={{ gap: 8, flexWrap: "wrap" }}>
              <select
                className="input"
                value={composerCat}
                onChange={(e) => setComposerCat(Number(e.target.value))}
                style={{ maxWidth: 220 }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
              <div className="row" style={{ gap: 8 }}>
                <Button variant="ghost" type="button" onClick={() => setComposerOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={posting}>
                  {posting ? "Publicando…" : "Publicar"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      {/* Categories pills */}
      <div className="row" style={{ gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setFilter("todo")}
          style={{ border: "none", padding: 0, background: "transparent" }}
        >
          <Chip variant={filter === "todo" ? "ink" : "default"} style={{ cursor: "pointer" }}>
            TODO · {posts.length}
          </Chip>
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setFilter(c.name)}
            style={{ border: "none", padding: 0, background: "transparent" }}
          >
            <Chip
              variant={filter === c.name ? "ink" : "default"}
              style={{ cursor: "pointer", background: filter === c.name ? "var(--ink)" : "white" }}
            >
              <span style={{ fontSize: 13 }}>{c.emoji}</span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  textTransform: "none",
                  letterSpacing: 0,
                  color: filter === c.name ? "var(--bg)" : c.color === "warm" ? "var(--warm)" : c.color === "accent" ? "var(--accent)" : "var(--ink-2)",
                }}
              >
                {c.name}
              </span>
            </Chip>
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="row" style={{ marginBottom: 16, justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row" style={{ gap: 16, fontSize: 13 }}>
          {(
            [
              ["new", "Nuevo"],
              ["top", "Top hoy"],
              ["trending", "Trending"],
            ] as const
          ).map(([key, label]) => {
            const active = sort === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--ink)" : "var(--muted)",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          {filtered.length} PUBLICACIONES
        </span>
      </div>

      {/* Posts */}
      <div className="col" style={{ gap: 12 }}>
        {filtered.map((p, i) => (
          <Card key={p.id} style={{ padding: 0, overflow: "hidden", position: "relative" }}>
            {p.pinned && (
              <div
                style={{
                  background: "var(--warm-soft)",
                  color: "oklch(40% 0.13 75)",
                  padding: "6px 16px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                📌 FIJADO POR EL FUNDADOR
              </div>
            )}
            <div style={{ padding: "18px 20px" }}>
              <div className="row" style={{ gap: 12, marginBottom: 14 }}>
                <div
                  className="av"
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 13,
                    background: p.authorRole === "superadmin" ? "var(--ink)" : "var(--bg-2)",
                    color: p.authorRole === "superadmin" ? "var(--bg)" : "var(--ink-2)",
                    position: "relative",
                  }}
                >
                  {initials(p.authorName || "??")}
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "white",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                      fontWeight: 600,
                    }}
                  >
                    {p.authorLevel ?? 1}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.authorName}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 4 }}>
                      Lv. {p.authorLevel}
                    </span>
                    {p.authorRole === "superadmin" && (
                      <span className="mono" style={{ fontSize: 10, color: "var(--ink)" }}>
                        · FUNDADOR
                      </span>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 2 }}>
                    {p.categoryName && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: p.categoryColor === "warm" ? "var(--warm)" : p.categoryColor === "accent" ? "var(--accent)" : "var(--ink-2)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {p.categoryName}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>· {formatRelative(new Date(p.createdAt))}</span>
                    {p.hot && (
                      <span className="mono" style={{ fontSize: 10, color: "var(--red)" }}>
                        · 🔥 TRENDING
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                {p.title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{p.body}</p>

              <div className="row" style={{ gap: 20, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => onLike(p.id)}
                  className="row"
                  style={{
                    gap: 6,
                    color: liked[p.id] ? "var(--red)" : "var(--muted)",
                    fontSize: 13,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{liked[p.id] ? "♥" : "♡"}</span>
                  <span>{p.likesCount}</span>
                </button>
                <div className="row" style={{ gap: 6, color: "var(--muted)", fontSize: 13 }}>
                  <span style={{ fontSize: 16 }}>💬</span>
                  <span>{p.commentsCount}</span>
                </div>
                <div className="row" style={{ gap: 6, color: "var(--muted)", fontSize: 13 }}>
                  <span style={{ fontSize: 16 }}>👁</span>
                  <span>{p.viewsCount}</span>
                </div>
                <Link
                  href={`/comunidad/posts/${p.id}`}
                  style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
                >
                  Abrir hilo →
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
