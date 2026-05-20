"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuleSvgIcon, NodeBadgeIcon } from "./ModuleIcon";
import type { ModuleIconKind } from "./ModuleIcon";

export type SenderoModuleState = "done" | "current" | "in_progress" | "locked";

export type SenderoModule = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  weekLabel?: string | null;
  isBig: boolean;
  xpReward: number;
  lessonsCount: number;
  state: SenderoModuleState;
};

/**
 * Sendero map — Duolingo-style learning path rendered as a connected SVG
 * dotted gold trail with zigzag nodes. Each module shows:
 *   - a circular node (size + color + icon vary by state)
 *   - a horizontal card on the opposite side with code, title, lessons, XP
 *   - subtle decorations (trees, mountains, start flag) tucked behind the path
 *
 * `current` modules are clickable → navigate into the next pending lesson.
 * Locked modules render disabled. Project modules (isBig) use purple.
 */
const NODE_SIZE = 86;
const NODE_SIZE_BIG = 104;
const ROW_HEIGHT = 150;
const TOP_PADDING = 60;
const BOTTOM_PADDING = 60;
const VIEW_WIDTH = 100; // viewBox in % units

// Zigzag X% positions — slight randomness keeps it natural.
const ZIGZAG = [50, 38, 56, 70, 42, 56, 70, 36, 56];

function pickIcon(mod: SenderoModule): ModuleIconKind {
  if (mod.state === "current" || mod.state === "in_progress") return "play";
  if (mod.state === "done") return "gauge";
  if (mod.isBig && /seguridad|security/i.test(mod.title)) return "chest";
  if (mod.isBig) return "pulse";
  if (/observ|metric|monitor/i.test(mod.title)) return "pulse";
  if (/test|qa|calidad/i.test(mod.title)) return "clipboard";
  if (/job|queue|cola|background|deploy/i.test(mod.title)) return "boxes";
  if (/performance|database|datos|rendimiento/i.test(mod.title)) return "gauge";
  return "boxes";
}

type Palette = { fill: string; shadow: string; ring: string; textOnFill: string };
function pickPalette(mod: SenderoModule): Palette {
  if (mod.state === "done") {
    return {
      fill: "linear-gradient(160deg, #4dca8c 0%, #2da064 100%)",
      shadow: "#1b7849",
      ring: "rgba(53,183,121,0.35)",
      textOnFill: "white",
    };
  }
  if (mod.state === "current" || mod.state === "in_progress") {
    return {
      fill: "linear-gradient(165deg, #F2C65A 0%, #D8A83F 60%, #B88523 100%)",
      shadow: "#7c5410",
      ring: "rgba(216,168,63,0.45)",
      textOnFill: "var(--navy)",
    };
  }
  if (mod.isBig) {
    return {
      fill: "linear-gradient(160deg, #9d83e8 0%, #6c52c4 100%)",
      shadow: "#3a2877",
      ring: "rgba(128,103,216,0.30)",
      textOnFill: "white",
    };
  }
  // locked
  return {
    fill: "linear-gradient(160deg, #36486a 0%, #24314c 100%)",
    shadow: "#0a1426",
    ring: "rgba(54,72,106,0.30)",
    textOnFill: "rgba(255,255,255,0.78)",
  };
}

export function SenderoMap({ modules }: { modules: SenderoModule[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const points = modules.map((_, i) => ({
      xPct: ZIGZAG[i % ZIGZAG.length] ?? 50,
      y: TOP_PADDING + i * ROW_HEIGHT,
    }));
    const height = TOP_PADDING + modules.length * ROW_HEIGHT + BOTTOM_PADDING;
    return { points, height };
  }, [modules]);

  // Build dotted bezier path between consecutive points (smooth zigzag).
  const pathD = useMemo(() => {
    const pts = layout.points;
    if (pts.length === 0) return "";
    let d = `M ${pts[0]!.xPct} ${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]!;
      const p1 = pts[i]!;
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.xPct} ${midY}, ${p1.xPct} ${midY}, ${p1.xPct} ${p1.y}`;
    }
    return d;
  }, [layout.points]);

  async function onActiveClick(m: SenderoModule) {
    if (pendingId || (m.state !== "current" && m.state !== "in_progress")) return;
    setPendingId(m.id);
    try {
      const res = await fetch(`/api/modules/${m.id}/start`, { method: "POST" });
      const data: any = await res.json().catch(() => ({}));
      if (data?.lessonId) {
        router.push(`/plataforma/leccion/${data.lessonId}`);
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
      style={{
        position: "relative",
        width: "100%",
        height: layout.height,
        // Subtle hand-drawn paper texture under the path.
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(216,168,63,0.06), transparent 70%)",
        overflow: "hidden",
      }}
    >
      {/* Decorative landscape SVG behind everything */}
      <DecorBackground height={layout.height} />

      {/* Path */}
      <svg
        width="100%"
        height={layout.height}
        viewBox={`0 0 ${VIEW_WIDTH} ${layout.height}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {/* soft halo behind path */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(216,168,63,0.20)"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 14 }}
        />
        {/* main dotted gold path */}
        <path
          d={pathD}
          fill="none"
          stroke="#D8A83F"
          strokeWidth={1}
          strokeDasharray="2 2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 4 }}
        />
      </svg>

      {/* Start flag at first point */}
      {layout.points[0] && (
        <div
          style={{
            position: "absolute",
            top: layout.points[0].y - 90,
            left: `calc(${layout.points[0].xPct}% - 16px)`,
            color: "#D8A83F",
            opacity: 0.85,
          }}
          aria-hidden
        >
          <ModuleSvgIcon kind="flag" size={32} color="#D8A83F" />
        </div>
      )}

      {/* Nodes + cards */}
      {modules.map((m, i) => {
        const pt = layout.points[i]!;
        const palette = pickPalette(m);
        const iconKind = pickIcon(m);
        const size = m.isBig ? NODE_SIZE_BIG : NODE_SIZE;
        const isActive = m.state === "current" || m.state === "in_progress";
        const isDone = m.state === "done";
        const isLocked = m.state === "locked";
        const isProject = m.isBig;
        const cardOnLeft = pt.xPct > 50; // node is right-side → card to the left
        const pending = pendingId === m.id;

        return (
          <div
            key={m.id}
            style={{
              position: "absolute",
              top: pt.y - size / 2,
              left: `calc(${pt.xPct}% - ${size / 2}px)`,
              width: size,
              height: size,
            }}
          >
            {/* Halo for active */}
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: "50%",
                  background: palette.ring,
                  filter: "blur(2px)",
                  animation: "sm-pulse 2.4s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Node button */}
            <button
              type="button"
              onClick={() => onActiveClick(m)}
              disabled={isLocked || pending}
              aria-label={`${m.code} · ${m.title}`}
              style={{
                position: "relative",
                width: size,
                height: size,
                borderRadius: "50%",
                background: palette.fill,
                color: palette.textOnFill,
                border: isActive ? "3px solid white" : "3px solid white",
                boxShadow: `0 8px 0 ${palette.shadow}, 0 12px 24px rgba(10,30,58,0.18)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLocked ? "not-allowed" : isActive ? "pointer" : "default",
                opacity: pending ? 0.7 : 1,
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
              }}
              onMouseDown={(e) => {
                if (!isLocked && isActive) {
                  e.currentTarget.style.transform = "translateY(4px)";
                  e.currentTarget.style.boxShadow = `0 4px 0 ${palette.shadow}, 0 6px 14px rgba(10,30,58,0.18)`;
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = `0 8px 0 ${palette.shadow}, 0 12px 24px rgba(10,30,58,0.18)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = `0 8px 0 ${palette.shadow}, 0 12px 24px rgba(10,30,58,0.18)`;
              }}
            >
              <ModuleSvgIcon kind={iconKind} size={Math.round(size * 0.42)} color={palette.textOnFill} />

              {/* Overlay badge: check (done) or lock (locked) */}
              {isDone && (
                <span
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#1b7849",
                    border: "2.5px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NodeBadgeIcon kind="check" size={12} />
                </span>
              )}
              {isLocked && (
                <span
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(20, 32, 60, 0.92)",
                    border: "2.5px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NodeBadgeIcon kind="lock" size={11} />
                </span>
              )}
            </button>

            {/* Module card alongside the node */}
            <ModuleCard
              mod={m}
              isActive={isActive}
              isLocked={isLocked}
              isDone={isDone}
              isProject={isProject}
              side={cardOnLeft ? "left" : "right"}
              size={size}
              onContinue={() => onActiveClick(m)}
              pending={pending}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes sm-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}

function ModuleCard({
  mod,
  isActive,
  isLocked,
  isDone,
  isProject,
  side,
  size,
  onContinue,
  pending,
}: {
  mod: SenderoModule;
  isActive: boolean;
  isLocked: boolean;
  isDone: boolean;
  isProject: boolean;
  side: "left" | "right";
  size: number;
  onContinue: () => void;
  pending: boolean;
}) {
  // Position relative to the node: nudge horizontally outward by half the
  // node size + 18px gap.
  const offset = size / 2 + 18;
  const stateLabel: { text: string; bg: string; color: string } = isActive
    ? { text: "ACTUAL", bg: "#F2C65A", color: "var(--navy)" }
    : isDone
      ? { text: "COMPLETADO", bg: "#1b7849", color: "white" }
      : isProject
        ? { text: "PROYECTO", bg: "#6c52c4", color: "white" }
        : { text: "BLOQUEADO", bg: "rgba(20,32,60,0.08)", color: "var(--muted)" };

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [side]: offset,
        width: 280,
        background: "#FFFDF8",
        border: `1px solid ${isActive ? "rgba(216,168,63,0.55)" : isProject ? "rgba(128,103,216,0.45)" : isLocked ? "rgba(20,32,60,0.08)" : "rgba(53,183,121,0.45)"}`,
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: isActive
          ? "0 14px 32px rgba(216,168,63,0.18), 0 1px 0 rgba(255,255,255,0.6) inset"
          : "0 6px 16px rgba(10,30,58,0.06)",
        opacity: isLocked ? 0.72 : 1,
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="row" style={{ gap: 6, marginBottom: 6, alignItems: "center" }}>
        <span
          className="mono"
          style={{
            fontSize: 9,
            padding: "3px 7px",
            borderRadius: 4,
            background: stateLabel.bg,
            color: stateLabel.color,
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          {stateLabel.text}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 9,
            color: "var(--muted)",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          {mod.code}
          {mod.weekLabel ? ` · ${mod.weekLabel.toUpperCase()}` : ""}
          {isProject ? " · PROYECTO" : ""}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--navy)",
          lineHeight: 1.25,
          marginBottom: 4,
        }}
      >
        {mod.title}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: "0.02em",
        }}
      >
        {mod.lessonsCount} {mod.lessonsCount === 1 ? "lección" : "lecciones"} ·{" "}
        <span style={{ color: isProject ? "#6c52c4" : isActive ? "#B88523" : "var(--muted)" }}>
          +{mod.xpReward} XP
        </span>
      </div>
      {isActive && (
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 12px",
            background:
              "linear-gradient(180deg, #F2C65A 0%, #D8A83F 100%)",
            color: "var(--navy)",
            border: "none",
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 12,
            cursor: pending ? "wait" : "pointer",
            boxShadow: "0 3px 0 #B88523",
          }}
        >
          {pending ? "Cargando…" : "Continuar →"}
        </button>
      )}
    </div>
  );
}

/* ─────────── Background decorations (trees, mountains, sparkles) ─────────── */
function DecorBackground({ height }: { height: number }) {
  // Generate deterministic trees/sparkles based on height so SSR matches CSR.
  const trees: { x: number; y: number; size: number; tone: string }[] = [];
  const cols = [10, 18, 88, 80, 6, 92, 14, 86];
  const tones = ["#3f6b54", "#4f7d63", "#6b8c75"];
  for (let y = 110; y < height - 60; y += 95) {
    const x = cols[(y / 95) % cols.length] ?? 10;
    trees.push({
      x,
      y,
      size: 18 + ((y * 13) % 10),
      tone: tones[(y / 95) % tones.length]!,
    });
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {/* Soft mountain silhouettes near top */}
      <path
        d={`M 0 ${TOP_PADDING + 10} L 12 ${TOP_PADDING - 18} L 22 ${TOP_PADDING + 6} L 36 ${TOP_PADDING - 24} L 50 ${TOP_PADDING - 4} L 62 ${TOP_PADDING - 20} L 78 ${TOP_PADDING + 4} L 92 ${TOP_PADDING - 22} L 100 ${TOP_PADDING + 6} L 100 ${TOP_PADDING + 30} L 0 ${TOP_PADDING + 30} Z`}
        fill="rgba(10,30,58,0.04)"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M 0 ${TOP_PADDING + 18} L 18 ${TOP_PADDING - 4} L 34 ${TOP_PADDING + 8} L 50 ${TOP_PADDING - 6} L 70 ${TOP_PADDING + 4} L 86 ${TOP_PADDING - 10} L 100 ${TOP_PADDING + 12} L 100 ${TOP_PADDING + 40} L 0 ${TOP_PADDING + 40} Z`}
        fill="rgba(216,168,63,0.06)"
        vectorEffect="non-scaling-stroke"
      />
      {/* Trees scattered along sides */}
      {trees.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y})`}>
          <path
            d={`M -2.2 0 L 0 -${t.size * 0.6} L 2.2 0 Z M -1.8 -${t.size * 0.3} L 0 -${t.size * 0.85} L 1.8 -${t.size * 0.3} Z`}
            fill={t.tone}
            opacity={0.78}
            vectorEffect="non-scaling-stroke"
          />
          <rect x={-0.6} y={0} width={1.2} height={t.size * 0.18} fill="#6b4a2a" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {/* Tiny gold sparkles */}
      {[200, 460, 720, 980].map((y, i) => (
        <circle
          key={i}
          cx={i % 2 === 0 ? 78 : 22}
          cy={y}
          r={0.9}
          fill="#D8A83F"
          opacity={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
