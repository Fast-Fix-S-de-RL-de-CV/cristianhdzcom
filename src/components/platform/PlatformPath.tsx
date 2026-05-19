"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ModuleNode = {
  id: string;
  code: string;
  title: string;
  isBig: boolean;
  xpReward: number;
  state: "done" | "current" | "in_progress" | "locked";
};

const OFFSETS = [-120, 80, 140, 40, -100, -60, 100, -40, 110, -120, 60, 140];

export function PlatformPath({
  modules,
  firstLessonId,
}: {
  modules: ModuleNode[];
  firstLessonId?: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function startModule(m: ModuleNode) {
    if (pendingId) return;
    setPendingId(m.id);
    try {
      const res = await fetch(`/api/modules/${m.id}/start`, { method: "POST" });
      const data: any = await res.json().catch(() => ({}));
      const lessonId = data?.lessonId ?? firstLessonId;
      if (lessonId) {
        router.push(`/plataforma/leccion/${lessonId}`);
      } else {
        router.refresh();
      }
    } catch {
      setPendingId(null);
    }
  }

  function onNodeClick(m: ModuleNode) {
    if (m.state === "locked") return;
    if (m.state === "current" || m.state === "in_progress") {
      void startModule(m);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, paddingBottom: 80 }}>
      {modules.map((n, i) => {
        const offset = OFFSETS[i % OFFSETS.length];
        const isActive = n.state === "current" || n.state === "in_progress";
        const pending = pendingId === n.id;
        return (
          <div key={n.id} style={{ transform: `translateX(${offset}px)`, position: "relative" }}>
            <button
              type="button"
              onClick={() => onNodeClick(n)}
              className={`path-node ${n.state === "in_progress" ? "current" : n.state}`}
              style={{ width: n.isBig ? 110 : 84, height: n.isBig ? 110 : 84 }}
              aria-label={`${n.code} · ${n.title}`}
              disabled={n.state === "locked" || pending}
            >
              {n.state === "done" && "✓"}
              {isActive && (n.isBig ? "★" : "▶")}
              {n.state === "locked" && (n.isBig ? "◆" : "⌬")}
            </button>
            <div
              style={{
                position: "absolute",
                left: "110%",
                top: "50%",
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
                {n.code}
                {n.isBig ? " · PROYECTO" : ""}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: n.state === "locked" ? "var(--muted)" : "var(--ink)" }}>
                {n.title}
              </span>
            </div>
            {isActive && (
              <div
                className="card"
                style={{
                  position: "absolute",
                  right: "110%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: 12,
                  width: 200,
                  background: "var(--ink)",
                  color: "var(--bg)",
                  border: "none",
                }}
              >
                <div className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                  EMPIEZA AHORA
                </div>
                <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>
                  + {n.xpReward} XP
                </div>
                <button
                  type="button"
                  onClick={() => startModule(n)}
                  disabled={pending}
                  className="btn btn-accent"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? "Cargando…" : "Continuar →"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
