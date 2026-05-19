"use client";
import { useMemo, useState } from "react";
import { formatRelative } from "@/lib/utils";

type Row = {
  id: number;
  email: string;
  source: string;
  tag: string;
  createdAt: string;
  hasPurchased: boolean;
};

export function MarketingTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(needle) ||
        r.source.toLowerCase().includes(needle) ||
        r.tag.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <input
          type="search"
          placeholder="Buscar por email, fuente o tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 999,
            fontSize: 13,
            minWidth: 280,
            background: "white",
          }}
        />
      </div>

      <div
        className="row"
        style={{
          padding: "14px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ flex: 1.5 }}>Email</span>
        <span style={{ flex: 1 }}>Source</span>
        <span style={{ flex: 1 }}>Tag</span>
        <span style={{ width: 130 }}>Status</span>
        <span style={{ width: 120, textAlign: "right" }}>Fecha</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((l) => (
          <div key={l.id} className="row" style={{ padding: "12px 24px", borderBottom: "1px solid var(--line)", background: "white" }}>
            <span style={{ flex: 1.5, fontSize: 13, fontWeight: 500 }}>{l.email}</span>
            <span className="mono" style={{ flex: 1, fontSize: 12, color: "var(--ink-2)" }}>
              {l.source || "—"}
            </span>
            <span className="mono" style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>
              {l.tag || "—"}
            </span>
            <span style={{ width: 130 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: l.hasPurchased ? "var(--green-soft)" : "var(--bg-2)",
                  color: l.hasPurchased ? "var(--green-strong)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {l.hasPurchased ? "✓ CLIENTE" : "LEAD"}
              </span>
            </span>
            <span className="mono" style={{ width: 120, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
              {formatRelative(new Date(l.createdAt))}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            {rows.length === 0 ? "Aún no hay leads capturados." : `Sin resultados para “${q}”.`}
          </div>
        )}
      </div>
    </>
  );
}
