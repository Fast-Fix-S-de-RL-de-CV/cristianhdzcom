"use client";
import { useMemo, useState } from "react";
import { initials, formatRelative } from "@/lib/utils";

type Row = {
  userId: string | null;
  email: string;
  name: string;
  ordersCount: number;
  lifetimeCents: number;
  lastOrderAt: string | null;
};

export function ClientesTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <input
          type="search"
          placeholder="Buscar cliente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 999,
            fontSize: 13,
            minWidth: 240,
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
        <span style={{ flex: 1 }}>Cliente</span>
        <span style={{ width: 90, textAlign: "right" }}># Orders</span>
        <span style={{ width: 130, textAlign: "right" }}>Lifetime Value</span>
        <span style={{ width: 130, textAlign: "right" }}>Última compra</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((u) => (
          <div
            key={u.email + (u.userId ?? "")}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <div className="row" style={{ flex: 1, gap: 12, minWidth: 0 }}>
              <div className="av" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                {initials(u.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{u.name}</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  {u.email}
                </div>
              </div>
            </div>
            <span
              className="mono"
              style={{ width: 90, textAlign: "right", fontSize: 13, fontWeight: 600 }}
            >
              {u.ordersCount}
            </span>
            <span
              className="mono"
              style={{ width: 130, textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--green-strong)" }}
            >
              ${(u.lifetimeCents / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
            </span>
            <span
              className="mono"
              style={{ width: 130, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
            >
              {u.lastOrderAt ? formatRelative(new Date(u.lastOrderAt)) : "—"}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            {rows.length === 0
              ? "Aún no hay clientes con compras pagadas."
              : `Sin resultados para “${q}”.`}
          </div>
        )}
      </div>
    </>
  );
}
