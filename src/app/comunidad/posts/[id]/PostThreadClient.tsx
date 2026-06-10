"use client";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/apiError";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorLevel: number;
  authorAvatarUrl: string | null;
}

interface Props {
  postId: string;
  initialComments: Comment[];
  initialLiked: boolean;
  initialLikesCount: number;
  currentUser: {
    id: string;
    name: string;
    role: string;
    level: number;
    avatarUrl: string | null;
  };
}

export function PostThreadClient({
  postId,
  initialComments,
  initialLiked,
  initialLikesCount,
  currentUser,
}: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likeBusy, setLikeBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        const newComment = (await res.json()) as Comment;
        // Server returns createdAt as ISO string already in this shape
        setComments((cs) => [...cs, { ...newComment, createdAt: newComment.createdAt }]);
        setBody("");
      } else {
        const j = await res.json().catch(() => null);
        setCommentError(apiErrorMessage(j, "No se pudo publicar el comentario"));
      }
    } catch {
      setCommentError("Sin conexión — el comentario no se publicó");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic
    const willLike = !liked;
    setLiked(willLike);
    setLikesCount((c) => c + (willLike ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: willLike ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("like_failed");
    } catch {
      // Revert
      setLiked(!willLike);
      setLikesCount((c) => c + (willLike ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={onToggleLike}
          disabled={likeBusy}
          className="btn btn-ghost"
          style={{
            color: liked ? "var(--red)" : undefined,
            borderColor: liked ? "var(--red)" : undefined,
          }}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} style={{ marginRight: 6 }} />
          {liked ? "Te gusta" : "Me gusta"} · {likesCount}
        </button>
      </div>

      <Card style={{ padding: 16, marginBottom: 20 }}>
        <form onSubmit={onSubmit} className="col" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="av" style={{ width: 36, height: 36, fontSize: 11, flexShrink: 0 }}>
              {initials(currentUser.name)}
            </div>
            <textarea
              className="input"
              placeholder="Escribe un comentario…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={4000}
              style={{ resize: "vertical", minHeight: 72 }}
            />
          </div>
          <div className="between">
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              {body.length}/4000
            </span>
            <Button type="submit" disabled={!body.trim() || submitting}>
              {submitting ? "Publicando…" : "Publicar comentario"}
            </Button>
          </div>
          {commentError && (
            <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>
              {commentError}
            </p>
          )}
        </form>
      </Card>

      <div className="col" style={{ gap: 12 }}>
        {comments.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            Sé el primero en comentar.
          </div>
        )}
        {comments.map((c) => (
          <Card key={c.id} style={{ padding: 16 }}>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <Link href={`/u/${c.authorId}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div className="av" style={{ width: 36, height: 36, fontSize: 11 }}>
                  {initials(c.authorName)}
                </div>
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <Link
                    href={`/u/${c.authorId}`}
                    style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", textDecoration: "none" }}
                  >
                    {c.authorName}
                  </Link>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    Lv.{c.authorLevel}
                  </span>
                  {(c.authorRole === "admin" || c.authorRole === "superadmin") && (
                    <span className="chip chip-gold mono" style={{ fontSize: 9, padding: "2px 6px" }}>
                      {c.authorRole === "superadmin" ? "FUNDADOR" : "ADMIN"}
                    </span>
                  )}
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    · {formatRelative(c.createdAt)}
                  </span>
                </div>
                <p
                  style={{
                    color: "var(--ink-2)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {c.body}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}
