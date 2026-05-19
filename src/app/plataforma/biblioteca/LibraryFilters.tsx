"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";

const CATS = ["Todos", "PDFs", "Plantillas", "Notebooks", "Cheatsheets"] as const;

export function LibraryFilters({ activeCategory = "Todos" }: { activeCategory?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  function selectCategory(cat: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (cat === "Todos") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function applyQuery(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <input
        className="input"
        placeholder="Buscar recursos por título o tag…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          applyQuery(e.target.value);
        }}
      />
      <div className="row" style={{ gap: 8, flexWrap: "wrap", opacity: isPending ? 0.6 : 1 }}>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => selectCategory(c)}
            className={cn("chip")}
            style={{
              border: "1px solid",
              borderColor: activeCategory === c ? "var(--ink)" : "var(--line-2)",
              background: activeCategory === c ? "var(--ink)" : "var(--bg)",
              color: activeCategory === c ? "var(--bg)" : "var(--muted)",
              cursor: "pointer",
              fontWeight: activeCategory === c ? 600 : 500,
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
