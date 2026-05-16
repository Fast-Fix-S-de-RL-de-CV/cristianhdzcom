"use client";
import { useState } from "react";

export function FAQAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            style={{
              borderTop: "1px solid var(--line)",
              padding: "24px 0",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 24,
              alignItems: "flex-start",
              cursor: "pointer",
            }}
            onClick={() => setOpen(isOpen ? -1 : i)}
          >
            <div>
              <h3 className="serif" style={{ fontSize: 26 }}>
                {f.q}
              </h3>
              {isOpen && (
                <p style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                  {f.a}
                </p>
              )}
            </div>
            <span style={{ fontSize: 22, color: "var(--muted)" }}>{isOpen ? "−" : "+"}</span>
          </div>
        );
      })}
    </div>
  );
}
