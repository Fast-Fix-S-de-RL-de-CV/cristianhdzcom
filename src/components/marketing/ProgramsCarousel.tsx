"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CourseCover } from "./CourseCover";

export type ProgramCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: string;
  accent: string | null;
  coverUrl: string | null;
  coverKind: string | null;
  durationLabel: string | null;
  modulesCount: number | null;
  priceUsd: number;
  priceCompareUsd: number | null;
  bullets: string[];
};

/**
 * Carrusel horizontal de programas + certificaciones, con scroll-snap, flechas
 * de navegación con loop, y toggle expandible inline ("▾ Más info") por card.
 *
 * Cuando el usuario hace click en "Más info" se despliega un panel con
 * bullets + duración + precio detallado SIN salir de la home. Si quiere ir
 * a la ficha completa del programa, el botón "Ver detalles →" sigue
 * apuntando a /programas/[slug].
 *
 * Diseñado para mostrar de 3 cards visibles en desktop y 1.2 en mobile
 * con scroll-snap horizontal.
 */
export function ProgramsCarousel({ programs }: { programs: ProgramCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  // Recompute scroll boundaries on scroll/resize.
  const updateBoundaries = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 8);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateBoundaries();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateBoundaries, { passive: true });
    window.addEventListener("resize", updateBoundaries);
    return () => {
      el.removeEventListener("scroll", updateBoundaries);
      window.removeEventListener("resize", updateBoundaries);
    };
  }, [updateBoundaries]);

  // Loop semantics: si estoy al final y doy next, vuelve al inicio. Idem para prev.
  function scrollByPage(direction: "prev" | "next") {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : el.clientWidth / 3;
    const gap = 24;
    const step = cardWidth + gap;

    if (direction === "next") {
      // Si estamos cerca del final, regresa al inicio (loop infinito).
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    } else {
      // Si estamos al inicio, ve al final.
      if (el.scrollLeft <= 8) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -step, behavior: "smooth" });
      }
    }
  }

  if (programs.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      {/* Flechas de navegación */}
      {programs.length > 1 && (
        <div
          style={{
            position: "absolute",
            top: -64,
            right: 0,
            display: "flex",
            gap: 8,
            zIndex: 2,
          }}
        >
          <ArrowButton
            direction="prev"
            onClick={() => scrollByPage("prev")}
            highlighted={canScrollPrev}
          />
          <ArrowButton
            direction="next"
            onClick={() => scrollByPage("next")}
            highlighted={canScrollNext}
          />
        </div>
      )}

      {/* Track scrollable */}
      <div
        ref={trackRef}
        className="programs-carousel-track hide-scrollbar"
        style={{
          display: "flex",
          gap: 24,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 8,
          // padding lateral para que la última card no quede pegada al borde
          paddingRight: 8,
          scrollPaddingLeft: 0,
        }}
      >
        {programs.map((p, i) => {
          const expanded = openId === p.id;
          const accentColor =
            p.accent === "warm" ? "var(--warm)" : p.accent === "ink" ? "var(--ink)" : "var(--accent)";
          return (
            <div
              key={p.id}
              style={{
                flex: "0 0 calc((100% - 48px) / 3)",
                minWidth: 280,
                scrollSnapAlign: "start",
              }}
            >
              <ProgramCardItem
                program={p}
                index={i}
                accentColor={accentColor}
                expanded={expanded}
                onToggle={() => setOpenId(expanded ? null : p.id)}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        .hide-scrollbar { scrollbar-width: thin; scrollbar-color: var(--line-2) transparent; }
        .hide-scrollbar::-webkit-scrollbar { height: 6px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: var(--line-2); border-radius: 3px; }
        @media (max-width: 768px) {
          .programs-carousel-track > div {
            flex: 0 0 calc(85% - 12px) !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .programs-carousel-track > div {
            flex: 0 0 calc(50% - 12px) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Card individual con toggle inline ─────────── */

function ProgramCardItem({
  program,
  index,
  accentColor,
  expanded,
  onToggle,
}: {
  program: ProgramCard;
  index: number;
  accentColor: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow 200ms, transform 200ms",
        boxShadow: expanded ? "0 18px 50px rgba(15,17,21,0.12)" : "none",
        transform: expanded ? "translateY(-2px)" : "none",
      }}
    >
      <CourseCover
        coverUrl={program.coverUrl}
        coverKind={program.coverKind}
        fallback={String(index + 1).padStart(2, "0")}
        accent={accentColor}
        height={170}
        bottomDivider
      />

      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <span className="mono" style={{ fontSize: 11, color: accentColor, letterSpacing: "0.08em" }}>
          {program.type.toUpperCase()}
          {program.durationLabel ? ` · ${program.durationLabel.toUpperCase()}` : ""}
          {program.modulesCount ? ` · ${program.modulesCount} MÓDULOS` : ""}
        </span>
        <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>
          {program.title}
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>
          {program.subtitle}
        </p>

        {/* Panel expandible — bullets + descripción extra */}
        {expanded && (
          <div
            style={{
              marginTop: 4,
              padding: "14px 0",
              borderTop: "1px solid var(--line)",
              animation: "fadeSlide 180ms ease-out",
            }}
          >
            {(program.bullets?.length ?? 0) > 0 ? (
              <div className="col" style={{ gap: 8 }}>
                {program.bullets.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ color: accentColor, flexShrink: 0 }}>✓</span>
                    <span style={{ color: "var(--ink-2)" }}>{b}</span>
                  </div>
                ))}
              </div>
            ) : program.description ? (
              <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
                {program.description.slice(0, 240)}
                {program.description.length > 240 ? "…" : ""}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                Sin información adicional aún. Da click en "Ver detalles" para ver la ficha completa.
              </p>
            )}
          </div>
        )}

        <div className="rule" style={{ margin: "4px 0" }} />

        {/* Precio + toggle "Más info" */}
        <div className="between" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="serif" style={{ fontSize: 24, lineHeight: 1 }}>
              {program.priceUsd === 0 ? "Gratis" : `$${program.priceUsd}`}
              {program.priceCompareUsd && program.priceCompareUsd > program.priceUsd && (
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    textDecoration: "line-through",
                    marginLeft: 6,
                    fontWeight: 400,
                  }}
                >
                  ${program.priceCompareUsd}
                </span>
              )}
            </span>
            {program.priceUsd > 0 && (
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.06em" }}>
                USD
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle();
            }}
            className="mono"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: expanded ? accentColor : "var(--bg-2)",
              color: expanded ? "white" : "var(--ink)",
              border: "1px solid " + (expanded ? accentColor : "var(--line)"),
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {expanded ? "Cerrar ▴" : "Más info ▾"}
          </button>
        </div>

        {/* CTA principal: lleva a la ficha completa */}
        <Link
          href={`/programas/${program.slug}`}
          style={{
            marginTop: 6,
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--ink)",
            color: "white",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Ver detalles →
        </Link>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Botón de flecha de navegación ─────────── */

function ArrowButton({
  direction,
  onClick,
  highlighted,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  highlighted: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        background: highlighted ? "var(--ink)" : "var(--bg-2)",
        color: highlighted ? "white" : "var(--ink-2)",
        border: "1px solid " + (highlighted ? "var(--ink)" : "var(--line)"),
        fontSize: 16,
        fontWeight: 700,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 150ms",
      }}
    >
      {direction === "prev" ? "←" : "→"}
    </button>
  );
}
