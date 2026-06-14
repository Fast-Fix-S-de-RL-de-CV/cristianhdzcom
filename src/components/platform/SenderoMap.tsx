"use client";
import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type SenderoModuleState = "done" | "current" | "in_progress" | "locked";

export type SenderoLesson = {
  id: string;
  code: string;
  title: string;
  kind: string;
  xpReward: number;
  completed: boolean;
};

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
  lessons: SenderoLesson[];
};

/**
 * Sendero map — Premium gamified learning path using the official asset
 * pack (`/public/sendero-pack/`). Renders a vertical zigzag of module
 * nodes on top of a hand-painted landscape, connected by a dotted gold
 * SVG path.
 *
 * Each module card is expandable: click anywhere on it to reveal the
 * lessons inside (Skool's "submodule" affordance). Lessons link to
 * /plataforma/leccion/[id]; the current/active lesson uses /modules/start.
 */
const NODE_SIZE = 116;
const NODE_SIZE_BIG = 132;
const ROW_HEIGHT = 200;
const TOP_PADDING = 120;
const BOTTOM_PADDING = 80;

// Zigzag X% positions — extends naturally for any number of modules.
const ZIGZAG = [50, 32, 58, 72, 38, 56, 70, 36, 54, 68, 40, 60];

type NodeKind =
  | "current"
  | "completed"
  | "project"
  | "locked-boxes"
  | "locked-clipboard"
  | "locked-chest";

function pickNodeAsset(mod: SenderoModule): NodeKind {
  if (mod.state === "current" || mod.state === "in_progress") return "current";
  if (mod.state === "done") return "completed";
  if (mod.isBig && /seguridad|security|boss/i.test(mod.title)) return "locked-chest";
  if (mod.isBig) return "project";
  if (/test|qa|calidad/i.test(mod.title)) return "locked-clipboard";
  if (/job|queue|cola|background|deploy/i.test(mod.title)) return "locked-boxes";
  if (/observ|metric|monitor/i.test(mod.title)) return "project";
  return "locked-boxes";
}

function nodeAssetUrl(kind: NodeKind): string {
  return `/sendero-pack/nodes/node-${kind}.svg`;
}

export function SenderoMap({ modules }: { modules: SenderoModule[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>();
    // Auto-expand the current module so lessons are visible
    const cur = modules.find((m) => m.state === "current" || m.state === "in_progress");
    if (cur) init.add(cur.id);
    return init;
  });

  const layout = useMemo(() => {
    const points = modules.map((_, i) => ({
      xPct: ZIGZAG[i % ZIGZAG.length] ?? 50,
      y: TOP_PADDING + i * ROW_HEIGHT,
    }));
    const height = TOP_PADDING + modules.length * ROW_HEIGHT + BOTTOM_PADDING;
    return { points, height };
  }, [modules]);

  // Build a smooth zigzag path (bezier between consecutive points).
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

  function toggleExpand(id: string) {
    // Acordeón de uno solo: abrir un módulo cierra los demás (no se enciman).
    setExpanded((prev) => (prev.has(id) ? new Set<string>() : new Set<string>([id])));
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: layout.height,
        // Landscape background — repeats vertically to support long paths.
        backgroundImage: "url(/sendero-pack/backgrounds/path-landscape.svg)",
        backgroundRepeat: "repeat-y",
        backgroundPosition: "center top",
        backgroundSize: "100% auto",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(216,168,63,0.18)",
        boxShadow: "0 10px 30px rgba(10,30,58,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)",
      }}
    >
      {/* Start flag */}
      {layout.points[0] && (
        <img
          src="/sendero-pack/decorations/flag-start.svg"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            top: 20,
            left: `calc(${layout.points[0].xPct}% - 80px)`,
            width: 60,
            height: 80,
            filter: "drop-shadow(0 4px 8px rgba(10,30,58,0.18))",
          }}
        />
      )}

      {/* Path arrow as a fun detail near the flag */}
      <img
        src="/sendero-pack/decorations/path-arrow.svg"
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          top: 50,
          left: `calc(${layout.points[0]?.xPct ?? 50}% - 30px)`,
          width: 48,
          height: 48,
          opacity: 0.85,
        }}
      />

      {/* Dotted gold path on top of the landscape */}
      <svg
        width="100%"
        height={layout.height}
        viewBox={`0 0 100 ${layout.height}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id="senderoGold" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#F2C65A" />
            <stop offset="100%" stopColor="#B88523" />
          </linearGradient>
        </defs>
        {/* Soft halo */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(216,168,63,0.22)"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 18 }}
        />
        {/* Main dotted gold path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#senderoGold)"
          strokeDasharray="2 3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 5, opacity: 0.92 }}
        />
      </svg>

      {/* Sparkles scattered along path for visual interest */}
      {layout.points.map((pt, i) =>
        i % 2 === 0 && i > 0 ? (
          <img
            key={`sp-${i}`}
            src="/sendero-pack/decorations/sparkle-gold.svg"
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              top: pt.y - ROW_HEIGHT / 2 + (i * 17) % 30,
              left: `calc(${(pt.xPct + layout.points[i - 1]!.xPct) / 2}% - 12px)`,
              width: 24,
              height: 24,
              opacity: 0.7,
            }}
          />
        ) : null,
      )}

      {/* Nodes + cards */}
      {modules.map((m, i) => {
        const pt = layout.points[i]!;
        const size = m.isBig ? NODE_SIZE_BIG : NODE_SIZE;
        const isActive = m.state === "current" || m.state === "in_progress";
        const isDone = m.state === "done";
        const isLocked = m.state === "locked";
        // La card va SIEMPRE hacia el centro del mapa (si no, se sale por el
        // borde). Nota: por cómo se ancla, side="left" la dibuja a la derecha
        // del nodo y side="right" a la izquierda → nodo a la izquierda usa
        // "left" (apunta a la derecha) y viceversa.
        const cardOnLeft = pt.xPct < 50;
        const pending = pendingId === m.id;
        const kind = pickNodeAsset(m);
        const isExpanded = expanded.has(m.id);

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
            {/* Halo for the active node */}
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -16,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(242,198,90,0.55) 0%, rgba(216,168,63,0) 65%)",
                  animation: "sm-pulse 2.4s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* The node itself — using the asset pack illustration */}
            <button
              type="button"
              onClick={() => (isActive ? onActiveClick(m) : toggleExpand(m.id))}
              disabled={pending}
              aria-label={`${m.code} · ${m.title}`}
              style={{
                position: "relative",
                width: size,
                height: size,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: isLocked && !isActive ? "pointer" : isActive ? "pointer" : "pointer",
                opacity: pending ? 0.7 : 1,
                transition: "transform 0.15s ease",
                filter: "drop-shadow(0 14px 22px rgba(10,30,58,0.22))",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(2px)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
            >
              <img
                src={nodeAssetUrl(kind)}
                alt=""
                width={size}
                height={size}
                style={{ display: "block", width: "100%", height: "100%" }}
                draggable={false}
              />
            </button>

            {/* Module card alongside the node */}
            <ModuleCard
              mod={m}
              isActive={isActive}
              isLocked={isLocked}
              isDone={isDone}
              side={cardOnLeft ? "left" : "right"}
              vAlign={i === 0 ? "top" : i === modules.length - 1 ? "bottom" : "center"}
              size={size}
              onContinue={() => onActiveClick(m)}
              onToggle={() => toggleExpand(m.id)}
              pending={pending}
              isExpanded={isExpanded}
              router={router}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes sm-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.95; transform: scale(1.10); }
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
  side,
  vAlign,
  size,
  onContinue,
  onToggle,
  pending,
  isExpanded,
  router,
}: {
  mod: SenderoModule;
  isActive: boolean;
  isLocked: boolean;
  isDone: boolean;
  side: "left" | "right";
  vAlign: "top" | "center" | "bottom";
  size: number;
  onContinue: () => void;
  onToggle: () => void;
  pending: boolean;
  isExpanded: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const offset = size / 2 + 22;
  // Al expandir, anclar según la posición para no salir del mapa: la primera
  // card crece hacia abajo, la última hacia arriba, las de en medio centradas.
  const vPos: CSSProperties =
    isExpanded && vAlign === "top"
      ? { top: 0 }
      : isExpanded && vAlign === "bottom"
        ? { bottom: 0 }
        : { top: "50%", transform: "translateY(-50%)" };
  const isProject = mod.isBig;
  const stateLabel: { text: string; bg: string; color: string; icon?: string } = isActive
    ? { text: "ACTUAL", bg: "#F2C65A", color: "#5d3d0a", icon: "●" }
    : isDone
      ? { text: "COMPLETADO", bg: "#1B7849", color: "white", icon: "✓" }
      : isProject
        ? { text: "PROYECTO", bg: "#6C52C4", color: "white", icon: "◆" }
        : { text: "BLOQUEADO", bg: "rgba(6,27,54,0.08)", color: "#6D7890", icon: "🔒" };

  // Card border / shadow tuned to state.
  const borderColor = isActive
    ? "rgba(216,168,63,0.55)"
    : isDone
      ? "rgba(53,183,121,0.45)"
      : isProject
        ? "rgba(128,103,216,0.42)"
        : "rgba(6,27,54,0.08)";

  return (
    <div
      style={{
        position: "absolute",
        ...vPos,
        [side]: offset,
        width: 300,
        background: "#FFFDF8",
        border: `1.5px solid ${borderColor}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: isActive
          ? "0 14px 32px rgba(216,168,63,0.20), 0 1px 0 rgba(255,255,255,0.6) inset"
          : isDone
            ? "0 8px 18px rgba(53,183,121,0.14)"
            : isProject
              ? "0 8px 18px rgba(128,103,216,0.14)"
              : "0 6px 14px rgba(10,30,58,0.05)",
        opacity: isLocked ? 0.78 : 1,
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="row" style={{ gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            fontSize: 9,
            padding: "3px 8px",
            borderRadius: 4,
            background: stateLabel.bg,
            color: stateLabel.color,
            fontWeight: 800,
            letterSpacing: "0.08em",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {stateLabel.icon && <span style={{ fontSize: 8 }}>{stateLabel.icon}</span>}
          {stateLabel.text}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 9,
            color: "#6D7890",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          {mod.code}
          {mod.weekLabel ? ` · ${mod.weekLabel.toUpperCase()}` : ""}
          {isProject ? " · PROYECTO" : ""}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "#6D7890",
            cursor: "pointer",
            padding: "0 4px",
            fontSize: 14,
          }}
          aria-label={isExpanded ? "Contraer" : "Expandir lecciones"}
        >
          ⋮
        </button>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#061B36",
          lineHeight: 1.25,
          marginBottom: 6,
        }}
      >
        {mod.title}
      </div>
      <div className="row" style={{ gap: 6, alignItems: "center", fontSize: 11 }}>
        <span className="mono" style={{ color: "#6D7890" }}>
          {mod.lessonsCount} {mod.lessonsCount === 1 ? "lección" : "lecciones"}
        </span>
        <span style={{ color: "#6D7890" }}>·</span>
        <span
          className="mono"
          style={{
            color: isProject ? "#6C52C4" : isActive ? "#B88523" : isDone ? "#1B7849" : "#6D7890",
            fontWeight: 700,
          }}
        >
          +{mod.xpReward} XP
        </span>
      </div>

      {isActive && !isExpanded && (
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "9px 12px",
            background: "linear-gradient(180deg, #F2C65A 0%, #D8A83F 100%)",
            color: "#061B36",
            border: "none",
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 12,
            cursor: pending ? "wait" : "pointer",
            boxShadow: "0 3px 0 #B88523",
            letterSpacing: "0.02em",
          }}
        >
          {pending ? "Cargando…" : "Continuar →"}
        </button>
      )}

      {/* Expanded lessons list — Skool-style sub-modules */}
      {isExpanded && mod.lessons.length > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px dashed rgba(6,27,54,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            // Acotado con scroll interno para que la card no crezca de más ni
            // se salga del mapa cuando el módulo tiene muchas lecciones.
            maxHeight: 260,
            overflowY: "auto",
            overflowX: "hidden",
            marginRight: -4,
            paddingRight: 4,
          }}
        >
          {mod.lessons.map((l, idx) => {
            const lessonClickable = !isLocked || l.completed;
            return (
              <button
                key={l.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lessonClickable) router.push(`/plataforma/leccion/${l.id}`);
                }}
                disabled={!lessonClickable}
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: l.completed
                    ? "color-mix(in srgb, #35B779 6%, white)"
                    : isActive && idx === mod.lessons.findIndex((x) => !x.completed)
                      ? "color-mix(in srgb, #F2C65A 10%, white)"
                      : "var(--bg-2)",
                  border: "1px solid",
                  borderColor: l.completed
                    ? "rgba(53,183,121,0.30)"
                    : isActive && idx === mod.lessons.findIndex((x) => !x.completed)
                      ? "rgba(216,168,63,0.40)"
                      : "transparent",
                  cursor: lessonClickable ? "pointer" : "not-allowed",
                  opacity: lessonClickable ? 1 : 0.55,
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: l.completed
                      ? "#1B7849"
                      : isActive && idx === mod.lessons.findIndex((x) => !x.completed)
                        ? "#D8A83F"
                        : "rgba(6,27,54,0.15)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {l.completed ? "✓" : l.kind === "video" ? "▶" : idx + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 9, color: "#6D7890", letterSpacing: "0.06em" }}
                  >
                    {l.code} · {l.kind === "video" ? "VIDEO" : "QUIZ"}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#061B36",
                      lineHeight: 1.3,
                      marginTop: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.title}
                  </span>
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: l.completed ? "#1B7849" : "#B88523",
                    fontWeight: 700,
                  }}
                >
                  +{l.xpReward}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
