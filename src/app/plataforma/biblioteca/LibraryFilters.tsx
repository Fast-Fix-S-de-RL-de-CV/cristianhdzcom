"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

const CATS = ["Todos", "PDFs", "Plantillas", "Notebooks", "Cheatsheets"];

export function LibraryFilters() {
  const [active, setActive] = useState("Todos");
  const [query, setQuery] = useState("");

  return (
    <div className="col" style={{ gap: 14 }}>
      <input
        className="input"
        placeholder="Buscar recursos por título o tag…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={cn("chip")}
            style={{
              border: "1px solid",
              borderColor: active === c ? "var(--ink)" : "var(--line-2)",
              background: active === c ? "var(--ink)" : "var(--bg)",
              color: active === c ? "var(--bg)" : "var(--muted)",
              cursor: "pointer",
              fontWeight: active === c ? 600 : 500,
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
