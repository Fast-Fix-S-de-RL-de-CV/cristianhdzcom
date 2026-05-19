"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function CalendarToolbar() {
  const [view, setView] = useState<"list" | "month">("list");
  return (
    <div
      className="row"
      style={{
        gap: 4,
        padding: 4,
        background: "var(--bg-2)",
        borderRadius: 999,
        alignSelf: "flex-start",
      }}
    >
      {(["list", "month"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn("mono")}
          style={{
            padding: "8px 14px",
            background: view === v ? "white" : "transparent",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: view === v ? 600 : 500,
            color: view === v ? "var(--ink)" : "var(--muted)",
            border: "none",
            cursor: "pointer",
            boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {v === "list" ? "Lista" : "Mes"}
        </button>
      ))}
    </div>
  );
}
