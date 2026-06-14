"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";

export type OutlineModule = {
  code: string;
  title: string;
  lessons: { code: string; title: string; kind: string }[];
};

/**
 * Temario público del curso: módulos reales con sus lecciones. Se muestra la
 * estructura aunque las lecciones aún no tengan contenido (para que el
 * prospecto vea de qué va el curso). Acordeón de uno solo.
 */
export function CourseOutline({ modules }: { modules: OutlineModule[] }) {
  const [open, setOpen] = useState<number>(0);
  if (modules.length === 0) return null;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {modules.map((m, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: i < modules.length - 1 ? "1px solid var(--line)" : "none" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "18px 24px",
                background: isOpen ? "var(--bg-2)" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  flex: "none",
                }}
              >
                {m.code}
              </span>
              <span className="serif" style={{ fontSize: 21, flex: 1, color: "var(--ink)", lineHeight: 1.2 }}>
                {m.title}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)", flex: "none" }}>
                {m.lessons.length} {m.lessons.length === 1 ? "lección" : "lecciones"}
              </span>
              <span style={{ fontSize: 20, color: isOpen ? "var(--accent)" : "var(--muted)", marginLeft: 6, flex: "none" }}>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "2px 24px 16px" }}>
                {m.lessons.length === 0 ? (
                  <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: 13, fontStyle: "italic" }}>
                    Contenido en preparación.
                  </div>
                ) : (
                  m.lessons.map((l, j) => (
                    <div
                      key={j}
                      className="row"
                      style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--line)", alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          color: "var(--muted)",
                          flex: "none",
                        }}
                        title={l.kind === "video" ? "Video" : "Quiz"}
                      >
                        {l.kind === "video" ? "▶" : "?"}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", flex: "none" }}>
                        {l.code}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, color: "var(--ink-2)" }}>{l.title}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
