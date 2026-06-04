"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

type Lesson = {
  id: string;
  title: string;
  question: string;
  body: string | null;
  kind: string;
  options: { k: string; t: string; correct?: boolean }[];
  correctKey: string | null;
  hint: string | null;
  explanation: string | null;
  xpReward: number;
};

export function LessonRunner({
  lesson,
  moduleCode,
  lessonCode,
  user,
}: {
  lesson: Lesson;
  moduleCode: string;
  lessonCode: string;
  user: { hearts: number; streakDays: number; xp: number };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hearts, setHearts] = useState(user.hearts);
  const [showHint, setShowHint] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const correct = submitted && selected === lesson.correctKey;
  const wrong = submitted && selected !== lesson.correctKey;

  function onChoose(k: string) {
    if (submitted && correct) return;
    setSelected(k);
    setSubmitted(false);
  }

  async function onCheck() {
    if (!selected) return;
    setSubmitted(true);
    const isCorrect = selected === lesson.correctKey;
    if (!isCorrect) {
      setShakeKey((x) => x + 1);
      setHearts((h) => Math.max(0, h - 1));
    }
    // Persist attempt
    await fetch(`/api/lessons/${lesson.id}/attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer: selected, isCorrect }),
    }).catch(() => {});
  }

  function onContinue() {
    router.push("/plataforma");
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (!submitted) onCheck();
        else if (correct) onContinue();
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = lesson.options[idx];
        if (opt) onChoose(opt.k);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, submitted]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* TOP BAR */}
      <div
        style={{
          padding: "18px 40px",
          display: "grid",
          gridTemplateColumns: "40px 1fr auto auto",
          gap: 20,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => router.push("/plataforma")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid var(--line-2)",
            background: "white",
            fontSize: 20,
            color: "var(--muted)",
            cursor: "pointer",
          }}
          aria-label="Salir"
        >
          ✕
        </button>
        <ProgressBar value={62} className="!h-3.5" />
        <div
          className="row"
          style={{
            gap: 6,
            padding: "6px 12px",
            background: "var(--warm-soft)",
            borderRadius: 999,
            color: "oklch(40% 0.13 30)",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 14 }}>❤</span> {hearts}
        </div>
        <div className="streak">{user.streakDays} días</div>
      </div>

      {/* QUESTION */}
      <div style={{ maxWidth: 860, margin: "32px auto 0", padding: "0 24px", flex: 1, width: "100%" }}>
        <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Chip variant="accent">
            {moduleCode} · LECCIÓN {lessonCode}
          </Chip>
          <Chip>MULTIPLE CHOICE</Chip>
          <Chip style={{ marginLeft: "auto", color: "var(--accent)" }}>+{lesson.xpReward} XP</Chip>
        </div>

        <h1 style={{ fontSize: 44, marginBottom: 8, lineHeight: 1.1 }}>{lesson.title || "Pregunta"}</h1>
        <p style={{ fontSize: 17, color: "var(--muted)", marginBottom: 32 }}>{lesson.question}</p>

        {/* CHOICES */}
        <div className="col" style={{ gap: 14 }}>
          {lesson.options.map((c) => {
            const isSel = c.k === selected;
            const isCorrectShown = submitted && c.k === lesson.correctKey;
            const isWrongPick = submitted && isSel && c.k !== lesson.correctKey;
            const borderColor = isCorrectShown
              ? "oklch(58% 0.13 155)"
              : isWrongPick
                ? "var(--red)"
                : isSel
                  ? "var(--accent)"
                  : "var(--line)";
            const shadow = isCorrectShown
              ? "0 4px 0 oklch(58% 0.13 155)"
              : isWrongPick
                ? "0 4px 0 var(--red)"
                : isSel
                  ? "0 4px 0 var(--accent-strong)"
                  : "0 3px 0 var(--line-2)";
            return (
              <div
                key={c.k}
                onClick={() => onChoose(c.k)}
                className={isWrongPick ? "card shake" : "card"}
                data-shake={shakeKey}
                style={{
                  padding: 18,
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 22px",
                  gap: 16,
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
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: isCorrectShown
                      ? "oklch(58% 0.13 155)"
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
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {c.k}
                </div>
                <span style={{ fontSize: 16, lineHeight: 1.5, fontWeight: isSel ? 600 : 500 }}>{c.t}</span>
                {isCorrectShown && (
                  <span style={{ color: "oklch(58% 0.13 155)", fontSize: 22 }}>✓</span>
                )}
                {isWrongPick && <span style={{ color: "var(--red)", fontSize: 22 }}>✕</span>}
              </div>
            );
          })}
        </div>

        {/* HINT */}
        {showHint && lesson.hint && (
          <div
            className="card"
            style={{
              marginTop: 20,
              padding: 16,
              background: "var(--warm-soft)",
              borderColor: "var(--warm)",
            }}
          >
            <span className="mono" style={{ fontSize: 11, color: "var(--warm)" }}>
              💡 PISTA · –5 XP
            </span>
            <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{lesson.hint}</p>
          </div>
        )}

        {/* HINT BUTTONS */}
        <div className="row" style={{ marginTop: 24, gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} disabled={showHint}>
            💡 Pista (–5 XP)
          </Button>
          <Button variant="ghost" size="sm">
            🤖 Pregunta al tutor
          </Button>
          <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={onContinue}>
            Saltar
          </Button>
        </div>
      </div>

      {/* FEEDBACK BAR */}
      {submitted && (
        <div
          className="slide-up"
          style={{
            background: correct ? "oklch(95% 0.04 155)" : "oklch(95% 0.06 25)",
            borderTop: `2px solid ${correct ? "oklch(58% 0.13 155)" : "var(--red)"}`,
            padding: "20px 40px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: correct ? "oklch(58% 0.13 155)" : "var(--red)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {correct ? "✓" : "✕"}
          </div>
          <div>
            <div
              className="serif"
              style={{ fontSize: 22, color: correct ? "oklch(38% 0.13 155)" : "oklch(40% 0.13 25)" }}
            >
              {correct ? "¡Correcto! Bien hecho." : "Casi. Sigue intentando."}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {correct
                ? `+${lesson.xpReward} XP · Racha ${user.streakDays} días`
                : lesson.explanation || "Repasa la teoría y prueba otra vez."}
            </div>
          </div>
          {correct ? (
            <Button onClick={onContinue} size="lg" style={{ background: "oklch(58% 0.13 155)", color: "white", boxShadow: "0 4px 0 oklch(45% 0.13 155)" }}>
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
      )}

      {/* CHECK BUTTON if not yet submitted */}
      {!submitted && (
        <div
          style={{
            padding: "20px 40px",
            background: "white",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button onClick={onCheck} disabled={!selected} size="lg">
            Verificar respuesta →
          </Button>
        </div>
      )}
    </div>
  );
}
