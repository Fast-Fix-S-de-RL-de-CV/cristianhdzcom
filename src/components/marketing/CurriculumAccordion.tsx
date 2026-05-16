"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function CurriculumAccordion({ weeks }: { weeks: { label: string; mods: string[] }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {weeks.map((s, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: i < weeks.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div
              style={{
                padding: "20px 28px",
                background: isOpen ? "var(--bg-2)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <div className="row" style={{ gap: 20 }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  0{i + 1}
                </span>
                <span className="serif" style={{ fontSize: 28 }}>
                  {s.label}
                </span>
              </div>
              <span style={{ fontSize: 22, color: isOpen ? "var(--accent)" : "var(--muted)" }}>{isOpen ? "−" : "+"}</span>
            </div>
            {isOpen && (
              <div style={{ padding: "0 28px 24px" }}>
                {s.mods.map((m, j) => (
                  <div
                    key={j}
                    className="row"
                    style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      ▶
                    </div>
                    <span style={{ flex: 1 }}>{m}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      2h 40m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
