"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type PathModuleState = "done" | "current" | "in_progress" | "locked";

export type PathModule = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  weekLabel?: string | null;
  isBig: boolean;
  xpReward: number;
  lessonsCount: number;
  state: PathModuleState;
};

/**
 * Duolingo-style learning path.
 *
 * Modules render in a vertical zig-zag (alternating left/right) with
 * connecting dotted lines. Visual states:
 *  - locked:       grey with padlock, not clickable
 *  - current/in_progress: full color + soft halo + popover with "Continuar"
 *  - done:         green with check ✓
 *  - isBig:        bigger node (star icon) — represents the project at end of block
 *
 * Color is driven by the `accent` token of the current program — we expose
 * it as a CSS var on the wrapper so the inner styles can tint accordingly.
 */
const OFFSETS = [-110, 80, 130, 40, -90, -50, 100, -30, 110, -120, 60, 130];

export function DuolingoPath({
  modules,
  accent = "var(--accent)",
  accentSoft = "var(--accent-soft)",
}: {
  modules: PathModule[];
  accent?: string;
  accentSoft?: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function startModule(m: PathModule) {
    if (pendingId || m.state === "locked") return;
    setPendingId(m.id);
    try {
      const res = await fetch(`/api/modules/${m.id}/start`, { method: "POST" });
      const data: any = await res.json().catch(() => ({}));
      const lessonId = data?.lessonId;
      if (lessonId) {
        router.push(`/plataforma/leccion/${lessonId}`);
      } else {
        router.refresh();
        setPendingId(null);
      }
    } catch {
      setPendingId(null);
    }
  }

  return (
    <div
      style={
        {
          "--path-accent": accent,
          "--path-accent-soft": accentSoft,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          paddingBottom: 80,
          position: "relative",
        } as React.CSSProperties
      }
    >
      {modules.map((n, i) => {
        const offset = OFFSETS[i % OFFSETS.length];
        const isActive = n.state === "current" || n.state === "in_progress";
        const isDone = n.state === "done";
        const isLocked = n.state === "locked";
        const pending = pendingId === n.id;
        const size = n.isBig ? 100 : 78;

        // Background / shadow vary by state.
        const bg = isDone
          ? "var(--green)"
          : isActive
            ? "var(--path-accent)"
            : "var(--bg-3)";
        const shadowColor = isDone
          ? "var(--green-strong)"
          : isActive
            ? "color-mix(in srgb, var(--path-accent) 60%, black)"
            : "var(--line-2)";

        const icon = isDone
          ? "✓"
          : isActive
            ? n.isBig
              ? "★"
              : "▶"
            : n.isBig
              ? "◆"
              : "🔒";

        return (
          <div key={n.id} style={{ transform: `translateX(${offset}px)`, position: "relative" }}>
            {/* Halo on active */}
            {isActive && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: "50%",
                  background: "var(--path-accent-soft)",
                  filter: "blur(2px)",
                  animation: "pulse 2.4s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}

            <button
              type="button"
              onClick={() => !isLocked && startModule(n)}
              disabled={isLocked || pending}
              aria-label={`${n.code} · ${n.title}`}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: bg,
                color: isLocked ? "var(--muted)" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: n.isBig ? 38 : 30,
                position: "relative",
                boxShadow: `0 6px 0 ${shadowColor}`,
                transition: "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                cursor: isLocked ? "not-allowed" : "pointer",
                border: "none",
                opacity: pending ? 0.6 : 1,
                transform: isActive ? "scale(1.04)" : undefined,
              }}
              onMouseDown={(ev) => {
                if (!isLocked) {
                  (ev.currentTarget as HTMLButtonElement).style.transform = "translateY(3px)";
                  (ev.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 0 ${shadowColor}`;
                }
              }}
              onMouseUp={(ev) => {
                (ev.currentTarget as HTMLButtonElement).style.transform = isActive ? "scale(1.04)" : "";
                (ev.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 0 ${shadowColor}`;
              }}
              onMouseLeave={(ev) => {
                (ev.currentTarget as HTMLButtonElement).style.transform = isActive ? "scale(1.04)" : "";
                (ev.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 0 ${shadowColor}`;
              }}
            >
              {icon}
            </button>

            {/* Label to the right or left depending on offset sign */}
            <div
              style={{
                position: "absolute",
                left: offset >= 0 ? `calc(${size}px + 18px)` : "auto",
                right: offset < 0 ? `calc(${size}px + 18px)` : "auto",
                top: "50%",
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                textAlign: offset < 0 ? "right" : "left",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: "0.08em",
                }}
              >
                {n.code}
                {n.weekLabel ? ` · ${n.weekLabel.toUpperCase()}` : ""}
                {n.isBig ? " · PROYECTO" : ""}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isLocked ? "var(--muted)" : "var(--ink)",
                  maxWidth: 220,
                  whiteSpace: "normal",
                  lineHeight: 1.25,
                }}
              >
                {n.title}
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                {n.lessonsCount} lecciones · +{n.xpReward} XP
              </span>
            </div>

            {/* Popover for the active node */}
            {isActive && (
              <div
                role="status"
                style={{
                  position: "absolute",
                  left: offset >= 0 ? "auto" : `calc(${size}px + 18px)`,
                  right: offset >= 0 ? `calc(${size}px + 18px)` : "auto",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: 14,
                  width: 220,
                  background: "var(--navy)",
                  color: "white",
                  borderRadius: 14,
                  boxShadow: "0 8px 24px rgba(10,30,58,0.25)",
                  border: "none",
                  zIndex: 2,
                }}
              >
                <div className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.08em" }}>
                  EMPIEZA AHORA
                </div>
                <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>
                  +{n.xpReward} XP
                </div>
                {n.description && (
                  <p style={{ fontSize: 11, marginTop: 6, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
                    {n.description.slice(0, 90)}
                    {n.description.length > 90 ? "…" : ""}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => startModule(n)}
                  disabled={pending}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "var(--gold)",
                    color: "var(--navy)",
                    border: "none",
                    borderRadius: 8,
                    cursor: pending ? "wait" : "pointer",
                  }}
                >
                  {pending ? "Cargando…" : "Continuar →"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
