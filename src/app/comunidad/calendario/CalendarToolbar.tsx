"use client";
import { cn } from "@/lib/cn";

export function CalendarToolbar() {
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
      <span
        className={cn("mono")}
        style={{
          padding: "8px 14px",
          background: "white",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        Lista
      </span>
    </div>
  );
}
