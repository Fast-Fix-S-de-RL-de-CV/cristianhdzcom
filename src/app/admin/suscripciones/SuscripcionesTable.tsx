"use client";
import { useMemo, useState } from "react";
import { formatRelative } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/AdminPageShell";

type Row = {
  id: string;
  name: string;
  email: string;
  status: string;
  totalCents: number;
  currency: string;
  programTitle: string | null;
  createdAt: string;
  paidAt: string | null;
};

type Filter = "all" | "this_month" | "last_month";

export function SuscripcionesTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfPrev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const endOfPrev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));

    return rows.filter((r) => {
      if (filter === "all") return true;
      const d = new Date(r.paidAt || r.createdAt);
      if (filter === "this_month") return d >= startOfMonth;
      if (filter === "last_month") return d >= startOfPrev && d <= endOfPrev;
      return true;
    });
  }, [rows, filter]);

  const total = filtered.reduce((s, r) => s + r.totalCents, 0);

  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "this_month", label: "Este mes" },
    { value: "last_month", label: "Mes pasado" },
  ];

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = filter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className="mono"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid " + (active ? "var(--ink)" : "var(--line-2)"),
                  background: active ? "var(--ink)" : "white",
                  color: active ? "var(--bg)" : "var(--ink-2)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          {filtered.length} órdenes · ${(total / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
        </div>
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
        <span style={{ width: 90 }}>ID</span>
        <span style={{ flex: 1 }}>Cliente</span>
        <span style={{ flex: 1 }}>Programa</span>
        <span style={{ width: 100, textAlign: "right" }}>Total</span>
        <span style={{ width: 90 }}>Status</span>
        <span style={{ width: 120, textAlign: "right" }}>Pagado</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((o) => (
          <div
            key={o.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <span className="mono" style={{ width: 90, fontSize: 11, color: "var(--muted)" }}>
              {o.id.slice(0, 8)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                {o.email}
              </div>
            </div>
            <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>
              {o.programTitle || "—"}
            </span>
            <span
              className="mono"
              style={{ width: 100, textAlign: "right", fontSize: 14, fontWeight: 700 }}
            >
              ${(o.totalCents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
            </span>
            <span style={{ width: 90 }}>
              <StatusBadge status={o.status} />
            </span>
            <span
              className="mono"
              style={{ width: 120, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
            >
              {o.paidAt ? formatRelative(new Date(o.paidAt)) : "—"}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin órdenes en este periodo.
          </div>
        )}
      </div>
    </>
  );
}
