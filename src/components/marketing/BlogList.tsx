"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  readMinutes: number | null;
  publishedAt: string | null;
};

const FILTERS = ["Todo", "IA · Ingeniería", "Negocios", "Casos reales", "Tutoriales", "Opinión"];
const PAGE_SIZE = 9;

export function BlogList({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState("Todo");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter !== "Todo" && p.category && p.category.toLowerCase() !== filter.toLowerCase()) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.excerpt ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [posts, filter, query]);

  const visible = filtered.slice(0, shown);
  const hasMore = filtered.length > visible.length;

  return (
    <>
      <section className="sec" style={{ paddingTop: 0 }}>
        <div
          className="row"
          style={{
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
            padding: "16px 0",
            gap: 8,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={f === filter ? "primary" : "ghost"}
                onClick={() => {
                  setFilter(f);
                  setShown(PAGE_SIZE);
                }}
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Buscar</span>
            <input
              className="input"
              placeholder="⌕ palabras clave…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE_SIZE);
              }}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                minWidth: 220,
                fontSize: 13,
                background: "white",
              }}
            />
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        {visible.length === 0 ? (
          <div
            style={{
              padding: "64px 24px",
              textAlign: "center",
              border: "1px dashed var(--line-2)",
              borderRadius: 18,
              color: "var(--muted)",
            }}
          >
            <div className="serif" style={{ fontSize: 32, color: "var(--ink)" }}>
              Sin resultados
            </div>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              Prueba otra categoría o limpia el buscador.
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {visible.map((p, i) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="lift" style={{ display: "block" }}>
                <div
                  className="ph"
                  style={{
                    aspectRatio: "4/3",
                    borderRadius: 14,
                    marginBottom: 16,
                    background:
                      i % 3 === 0
                        ? "linear-gradient(135deg, oklch(95% 0.04 252), oklch(88% 0.05 252))"
                        : i % 3 === 1
                          ? "linear-gradient(135deg, oklch(95% 0.04 75), oklch(88% 0.06 75))"
                          : "linear-gradient(135deg, var(--bg-2), var(--bg-3))",
                    border: "none",
                    color: "var(--ink-2)",
                  }}
                >
                  <span className="serif" style={{ fontSize: 56, opacity: 0.5 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div
                  className="row"
                  style={{
                    gap: 12,
                    marginBottom: 12,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted)",
                  }}
                >
                  <span style={{ color: "var(--ink)" }}>{p.category?.toUpperCase()}</span>
                  <span>·</span>
                  <span>{p.readMinutes} MIN</span>
                  <span>·</span>
                  <span>
                    {p.publishedAt
                      ? new Date(p.publishedAt)
                          .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                          .toUpperCase()
                      : ""}
                  </span>
                </div>
                <h3 className="serif" style={{ fontSize: 26, lineHeight: 1.1 }}>
                  {p.title}
                </h3>
                <div className="row" style={{ gap: 8, marginTop: 16, fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>Cristian Hernández</span>
                  <span style={{ marginLeft: "auto", color: "var(--accent)" }}>Leer →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="center" style={{ marginTop: 56 }}>
            <Button size="lg" variant="ghost" onClick={() => setShown((s) => s + PAGE_SIZE)}>
              Ver más artículos
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
