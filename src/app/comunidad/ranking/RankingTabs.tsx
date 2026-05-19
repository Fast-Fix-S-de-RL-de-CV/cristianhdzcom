"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "all", label: "Todo el tiempo" },
];

export function RankingTabs() {
  const [active, setActive] = useState("all");
  return (
    <div
      className="row"
      style={{
        gap: 4,
        marginBottom: 20,
        padding: 4,
        background: "var(--bg-2)",
        borderRadius: 999,
        alignSelf: "flex-start",
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActive(t.id)}
          className={cn("mono")}
          style={{
            padding: "8px 14px",
            background: active === t.id ? "white" : "transparent",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: active === t.id ? 600 : 500,
            color: active === t.id ? "var(--ink)" : "var(--muted)",
            border: "none",
            cursor: "pointer",
            boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
