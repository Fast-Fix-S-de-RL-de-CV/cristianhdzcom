"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { embedUrl } from "@/lib/video";
import { apiErrorMessage } from "@/lib/apiError";

type LessonCommentRow = {
  id: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorLevel: number | null;
  authorRole: string | null;
};

export type LessonData = {
  id: string;
  title: string;
  question: string | null;
  body: string | null;
  kind: string;
  options: { k: string; t: string; correct?: boolean }[];
  correctKey: string | null;
  hint: string | null;
  explanation: string | null;
  videoProvider: string | null;
  videoId: string | null;
  xpReward: number;
};

/**
 * Unified lesson experience. Handles both:
 *  - kind === "video"  → Vimeo/YouTube embed + descripción + "Marcar completada"
 *  - quiz kinds        → pregunta + opciones + feedback inmediato
 *
 * Both layouts share:
 *  - Notas privadas (autoguardado, side panel)
 *  - Comentarios públicos por lección (Skool-style)
 */
export function LessonView({
  lesson,
  moduleCode,
  lessonCode,
  user,
  alreadyCompleted,
  backHref = "/plataforma",
}: {
  lesson: LessonData;
  moduleCode: string;
  lessonCode: string;
  user: { id: string; name: string; hearts: number; streakDays: number; xp: number };
  alreadyCompleted: boolean;
  backHref?: string;
}) {
  const router = useRouter();
  const isVideo = lesson.kind === "video";
  const isQuiz = !isVideo;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* TOP BAR */}
      <div
        style={{
          padding: "14px 28px",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          gap: 18,
          alignItems: "center",
          background: "white",
          borderBottom: "1px solid var(--line)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href={backHref} aria-label="Volver al curso" style={{ textDecoration: "none" }}>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--line-2)",
              background: "white",
              fontSize: 18,
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </Link>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            {moduleCode} · LECCIÓN {lessonCode}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lesson.title}
          </div>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 999,
            background: isVideo ? "var(--accent-soft)" : "var(--warm-soft)",
            color: isVideo ? "var(--accent)" : "oklch(45% 0.12 75)",
            fontWeight: 700,
          }}
        >
          {isVideo ? "🎬 VIDEO" : "📝 QUIZ"}
        </span>
        <span className="chip chip-gold mono">+{lesson.xpReward} XP</span>
        <span className="streak">{user.streakDays} días</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 340px",
          gap: 24,
          padding: "28px 32px",
          maxWidth: 1400,
          margin: "0 auto",
        }}
        className="lesson-grid"
      >
        {/* MAIN COLUMN */}
        <main style={{ minWidth: 0 }}>
          {isVideo ? (
            <VideoLesson
              lesson={lesson}
              alreadyCompleted={alreadyCompleted}
              onCompleted={() => {
                router.refresh();
              }}
            />
          ) : (
            <QuizLesson lesson={lesson} user={user} />
          )}

          {/* Body / description (also shown for quizzes if filled) */}
          {lesson.body && lesson.body.trim().length > 0 && (
            <Card style={{ padding: 24, marginTop: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Recursos</div>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--ink-2)",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {lesson.body}
              </div>
            </Card>
          )}

          {/* COMMENTS */}
          <LessonComments lessonId={lesson.id} currentUser={user} />
        </main>

        {/* SIDE PANEL — NOTES */}
        <aside style={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
          <NotesPanel lessonId={lesson.id} />
        </aside>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .lesson-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   VIDEO LESSON
   ────────────────────────────────────────────────────────────────── */
function VideoLesson({
  lesson,
  alreadyCompleted,
  onCompleted,
}: {
  lesson: LessonData;
  alreadyCompleted: boolean;
  onCompleted: () => void;
}) {
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { awarded: number; cert?: { code: string } }>(null);

  if (!lesson.videoProvider || !lesson.videoId) {
    return (
      <Card style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: "var(--red)" }}>VIDEO PENDIENTE</div>
        <p style={{ color: "var(--muted)" }}>
          Esta lección está marcada como video pero todavía no tiene URL configurada.
          Pídele al admin que la complete.
        </p>
      </Card>
    );
  }

  async function markComplete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCompleted(true);
        setFeedback({
          awarded: data.awardedXp ?? 0,
          cert: data.certificate || undefined,
        });
        onCompleted();
      } else {
        setError(apiErrorMessage(data, "No se pudo marcar la lección — intenta de nuevo"));
      }
    } catch {
      setError("Error de red — revisa tu conexión e intenta de nuevo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card style={{ padding: 0, overflow: "hidden", borderColor: "var(--ink)" }}>
        <div style={{ position: "relative", paddingTop: "56.25%", background: "black" }}>
          <iframe
            src={embedUrl(lesson.videoProvider, lesson.videoId)}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
            title={lesson.title}
          />
        </div>
      </Card>

      <div
        className="row"
        style={{
          marginTop: 16,
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 28, lineHeight: 1.2, color: "var(--navy)" }}>
            {lesson.title}
          </h1>
          {lesson.question && (
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, maxWidth: 600 }}>
              {lesson.question}
            </p>
          )}
        </div>
        {completed ? (
          <div
            className="row"
            style={{
              gap: 10,
              padding: "10px 16px",
              borderRadius: 999,
              background: "var(--green-soft)",
              color: "var(--green-strong)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ✓ Lección completada
          </div>
        ) : (
          <Button
            onClick={markComplete}
            disabled={busy}
            size="lg"
            style={{
              background: "var(--accent)",
              color: "white",
              boxShadow: "0 4px 0 var(--accent-strong)",
            }}
          >
            {busy ? "Guardando…" : `Marcar completada · +${lesson.xpReward} XP →`}
          </Button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--red) 10%, white)",
            border: "1px solid var(--red)",
            color: "var(--red)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {feedback && (
        <Card
          style={{
            marginTop: 16,
            padding: 18,
            background: "var(--green-soft)",
            borderColor: "var(--green)",
          }}
        >
          <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--green)",
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <div className="serif" style={{ fontSize: 20, color: "var(--green-strong)" }}>
                ¡Buen trabajo!
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                {feedback.awarded > 0
                  ? `Ganaste ${feedback.awarded} XP`
                  : "Lección registrada como completada"}
                {feedback.cert ? " · ¡Y completaste el curso! 🎉" : ""}
              </div>
            </div>
            {feedback.cert && (
              <Link
                href={`/cert/${feedback.cert.code}`}
                className="btn btn-primary"
                style={{ background: "var(--gold)", color: "var(--navy)" }}
              >
                Ver mi certificado →
              </Link>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   QUIZ LESSON
   ────────────────────────────────────────────────────────────────── */
function QuizLesson({
  lesson,
  user,
}: {
  lesson: LessonData;
  user: { hearts: number; streakDays: number; xp: number };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hearts, setHearts] = useState(user.hearts);
  const [shakeKey, setShakeKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const correct = submitted && selected === lesson.correctKey;
  const wrong = submitted && selected !== lesson.correctKey;

  async function onCheck() {
    if (!selected) return;
    setSubmitted(true);
    const isCorrect = selected === lesson.correctKey;
    if (!isCorrect) {
      setShakeKey((x) => x + 1);
      setHearts((h) => Math.max(0, h - 1));
    }
    // El servidor recalcula isCorrect por su cuenta; solo enviamos la respuesta.
    await fetch(`/api/lessons/${lesson.id}/attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer: selected }),
    }).catch(() => {});
  }

  function onContinue() {
    router.push(backHref);
  }

  return (
    <Card style={{ padding: 28 }}>
      <h1 className="serif" style={{ fontSize: 30, marginBottom: 8, lineHeight: 1.15, color: "var(--navy)" }}>
        {lesson.title}
      </h1>
      {lesson.question && (
        <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.5 }}>
          {lesson.question}
        </p>
      )}

      <div className="col" style={{ gap: 12 }}>
        {lesson.options.map((c) => {
          const isSel = c.k === selected;
          const isCorrectShown = submitted && c.k === lesson.correctKey;
          const isWrongPick = submitted && isSel && c.k !== lesson.correctKey;
          const borderColor = isCorrectShown
            ? "var(--green)"
            : isWrongPick
              ? "var(--red)"
              : isSel
                ? "var(--accent)"
                : "var(--line)";
          const shadow = isCorrectShown
            ? "0 4px 0 var(--green-strong)"
            : isWrongPick
              ? "0 4px 0 var(--red)"
              : isSel
                ? "0 4px 0 var(--accent-strong)"
                : "0 3px 0 var(--line-2)";
          return (
            <div
              key={c.k}
              onClick={() => {
                if (submitted && correct) return;
                setSelected(c.k);
                setSubmitted(false);
              }}
              className={isWrongPick ? "card shake" : "card"}
              data-shake={shakeKey}
              style={{
                padding: 16,
                display: "grid",
                gridTemplateColumns: "36px 1fr 22px",
                gap: 14,
                alignItems: "center",
                cursor: "pointer",
                background: "white",
                borderColor,
                borderWidth: isSel ? 2 : 1,
                boxShadow: shadow,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isCorrectShown
                    ? "var(--green)"
                    : isWrongPick
                      ? "var(--red)"
                      : isSel
                        ? "var(--accent)"
                        : "var(--bg-2)",
                  color: isCorrectShown || isWrongPick || isSel ? "white" : "var(--ink-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {c.k.toUpperCase()}
              </div>
              <span style={{ fontSize: 15, lineHeight: 1.5, fontWeight: isSel ? 600 : 500 }}>
                {c.t}
              </span>
              {isCorrectShown && <span style={{ color: "var(--green)", fontSize: 20 }}>✓</span>}
              {isWrongPick && <span style={{ color: "var(--red)", fontSize: 20 }}>✕</span>}
            </div>
          );
        })}
      </div>

      {showHint && lesson.hint && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: 14,
            background: "var(--warm-soft)",
            borderColor: "var(--warm)",
          }}
        >
          <span className="mono" style={{ fontSize: 11, color: "oklch(45% 0.12 75)" }}>
            💡 PISTA
          </span>
          <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{lesson.hint}</p>
        </div>
      )}

      <div className="row" style={{ marginTop: 22, gap: 10, flexWrap: "wrap" }}>
        {lesson.hint && (
          <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} disabled={showHint}>
            💡 Pista
          </Button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {!submitted ? (
            <Button onClick={onCheck} disabled={!selected} size="lg">
              Verificar →
            </Button>
          ) : correct ? (
            <Button
              onClick={onContinue}
              size="lg"
              style={{
                background: "var(--green)",
                color: "white",
                boxShadow: "0 4px 0 var(--green-strong)",
              }}
            >
              Continuar →
            </Button>
          ) : (
            <Button
              onClick={() => {
                setSubmitted(false);
                setSelected(null);
              }}
              size="lg"
              variant="ghost"
            >
              Reintentar
            </Button>
          )}
        </div>
      </div>

      {submitted && (
        <div
          className="slide-up"
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 12,
            background: correct ? "var(--green-soft)" : "color-mix(in srgb, var(--red) 12%, white)",
            border: `1px solid ${correct ? "var(--green)" : "var(--red)"}`,
            display: "grid",
            gridTemplateColumns: "44px 1fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: correct ? "var(--green)" : "var(--red)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {correct ? "✓" : "✕"}
          </div>
          <div>
            <div
              className="serif"
              style={{
                fontSize: 18,
                color: correct ? "var(--green-strong)" : "var(--red)",
              }}
            >
              {correct ? "¡Correcto!" : "Aún no."}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
              {correct
                ? `+${lesson.xpReward} XP`
                : lesson.explanation || "Repasa la teoría y prueba de nuevo."}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   NOTES PANEL
   ────────────────────────────────────────────────────────────────── */
function NotesPanel({ lessonId }: { lessonId: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lessons/${lessonId}/notes`)
      .then((r) => (r.ok ? r.json() : { body: "" }))
      .then((j) => {
        if (!cancelled) {
          setBody(j.body ?? "");
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // Debounced autosave
  const save = useCallback(
    (next: string) => {
      setStatus("saving");
      fetch(`/api/lessons/${lessonId}/notes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: next }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("save_failed");
          setStatus("saved");
        })
        .catch(() => setStatus("error"));
    },
    [lessonId],
  );

  function onChange(next: string) {
    setBody(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(next), 800);
  }

  return (
    <Card style={{ padding: 18, background: "var(--bg-2)" }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div>
          <div className="eyebrow">📝 Mis notas</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
            PRIVADAS — SOLO TÚ LAS VES
          </div>
        </div>
        {status !== "idle" && (
          <span
            className="mono"
            style={{
              fontSize: 9,
              color:
                status === "saving"
                  ? "var(--muted)"
                  : status === "error"
                    ? "var(--red)"
                    : "var(--green-strong)",
              letterSpacing: "0.06em",
            }}
          >
            {status === "saving"
              ? "GUARDANDO…"
              : status === "error"
                ? "⚠ NO SE GUARDÓ — COPIA TU NOTA"
                : "✓ GUARDADO"}
          </span>
        )}
      </div>
      <textarea
        disabled={loading}
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe lo que quieras recordar de esta lección: definiciones, frases clave, tu propia explicación, dudas pendientes…"
        style={{
          width: "100%",
          minHeight: 320,
          border: "1px solid var(--line-2)",
          borderRadius: 10,
          padding: 12,
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: 1.55,
          background: "white",
          color: "var(--ink)",
          resize: "vertical",
        }}
      />
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   COMMENTS
   ────────────────────────────────────────────────────────────────── */
function LessonComments({
  lessonId,
  currentUser,
}: {
  lessonId: string;
  currentUser: { id: string; name: string };
}) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<LessonCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/lessons/${lessonId}/comments`)
      .then((r) => r.json())
      .then((j) => setRows(j.comments ?? []))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function postComment() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(j, "No se pudo publicar el comentario — intenta de nuevo"));
        return;
      }
      setDraft("");
      load();
    } catch {
      setError("Error de red — revisa tu conexión e intenta de nuevo");
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(id: string) {
    const ok = await confirm({
      title: "¿Eliminar este comentario?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(apiErrorMessage(j, "No se pudo eliminar el comentario"));
      }
    } catch {
      setError("Error de red — revisa tu conexión e intenta de nuevo");
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div className="row" style={{ gap: 12, alignItems: "baseline", marginBottom: 14 }}>
        <h2 className="serif" style={{ fontSize: 22 }}>
          Discusión
        </h2>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          {rows.length} {rows.length === 1 ? "comentario" : "comentarios"}
        </span>
      </div>

      <Card style={{ padding: 16, marginBottom: 14 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe algo… (una duda, una idea, algo que te resonó)"
          style={{
            width: "100%",
            minHeight: 78,
            border: "1px solid var(--line-2)",
            borderRadius: 10,
            padding: 12,
            fontFamily: "inherit",
            fontSize: 14,
            background: "white",
            resize: "vertical",
          }}
        />
        <div className="row" style={{ justifyContent: "space-between", marginTop: 10, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            PÚBLICO — TODOS LOS ALUMNOS DE LA LECCIÓN LO VEN
          </span>
          <Button onClick={postComment} disabled={busy || !draft.trim()} size="sm">
            {busy ? "Publicando…" : "Publicar"}
          </Button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--red) 10%, white)",
              border: "1px solid var(--red)",
              color: "var(--red)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", padding: 12 }}>
          CARGANDO…
        </div>
      ) : rows.length === 0 ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", padding: 12 }}>
          AÚN NO HAY COMENTARIOS. SÉ EL PRIMERO.
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {rows.map((c) => {
            const isMine = c.authorId === currentUser.id;
            const initials = (c.authorName || "?")
              .split(" ")
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <Card key={c.id} style={{ padding: 16 }}>
                <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <Link
                    href={`/u/${c.authorId}`}
                    aria-label={c.authorName ?? "Perfil"}
                    style={{ textDecoration: "none" }}
                  >
                    <div className="av" style={{ width: 36, height: 36, fontSize: 12 }}>
                      {initials}
                    </div>
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Link href={`/u/${c.authorId}`} style={{ color: "inherit", textDecoration: "none" }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.authorName ?? "—"}</span>
                      </Link>
                      {c.authorRole === "admin" || c.authorRole === "superadmin" ? (
                        <Chip variant="ink">
                          {c.authorRole === "superadmin" ? "FUNDADOR" : "ADMIN"}
                        </Chip>
                      ) : c.authorLevel ? (
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                          Lv.{c.authorLevel}
                        </span>
                      ) : null}
                      <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                        · {formatTime(c.createdAt)}
                      </span>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => deleteComment(c.id)}
                          style={{
                            marginLeft: "auto",
                            background: "transparent",
                            border: "none",
                            color: "var(--red)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "ahora";
  if (diffSec < 3600) return `hace ${Math.round(diffSec / 60)} min`;
  if (diffSec < 86400) return `hace ${Math.round(diffSec / 3600)}h`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
