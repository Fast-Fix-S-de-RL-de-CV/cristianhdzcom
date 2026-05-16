"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ModuleNode = {
  id: string;
  code: string;
  title: string;
  isBig: boolean;
  state: "done" | "current" | "locked";
};

const OFFSETS = [-120, 80, 140, 40, -100, -60, 100, -40, 110, -120, 60, 140];

export function PlatformPath({ modules, firstLessonId }: { modules: ModuleNode[]; firstLessonId?: string }) {
  const router = useRouter();

  function onNodeClick(m: ModuleNode) {
    if (m.state === "locked") return;
    if (m.state === "current" && firstLessonId) {
      router.push(`/plataforma/leccion/${firstLessonId}`);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, paddingBottom: 80 }}>
      {modules.map((n, i) => {
        const offset = OFFSETS[i % OFFSETS.length];
        return (
          <div key={n.id} style={{ transform: `translateX(${offset}px)`, position: "relative" }}>
            <button
              type="button"
              onClick={() => onNodeClick(n)}
              className={`path-node ${n.state}`}
              style={{ width: n.isBig ? 110 : 84, height: n.isBig ? 110 : 84 }}
              aria-label={`${n.code} · ${n.title}`}
            >
              {n.state === "done" && "✓"}
              {n.state === "current" && (n.isBig ? "★" : "▶")}
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
            {n.state === "current" && (
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
                  + 240 XP
                </div>
                {firstLessonId && (
                  <Link href={`/plataforma/leccion/${firstLessonId}`}>
                    <button
                      className="btn btn-accent"
                      style={{ width: "100%", justifyContent: "center", marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                    >
                      Continuar →
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
