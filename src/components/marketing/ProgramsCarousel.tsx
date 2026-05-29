"use client";
import { useEffect, useRef, useState } from "react";
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
 * Carrusel horizontal con auto-scroll continuo (efecto marquee), loop
 * infinito sin saltos y arrastre manual con mouse/touch (cursor "manita").
 *
 * Implementación:
 *  - Renderizamos la lista DUPLICADA (programs + programs). Cuando el scroll
 *    pasa la mitad del track, "saltamos" al inicio sin animar — el usuario
 *    no nota el corte porque ve la misma card.
 *  - Auto-scroll por requestAnimationFrame a ~30 px/s. Se pausa al hover
 *    y mientras se arrastra.
 *  - Drag: si arrastra >5px se cancela el click siguiente para no abrir
 *    "Más info" sin querer.
 */
export function ProgramsCarousel({ programs }: { programs: ProgramCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Estado mutable para drag (no necesita re-render).
  const dragState = useRef({ startX: 0, startScroll: 0, moved: 0 });
  // Flag para suprimir clicks post-drag.
  const suppressClickRef = useRef(false);

  // Auto-scroll loop con efecto infinito.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || programs.length === 0) return;
    let rafId = 0;
    let last = performance.now();
    let acc = 0; // acumulador sub-pixel para movimiento fluido
    const SPEED = 75; // px / segundo

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const tEl = trackRef.current;
      if (tEl && !isHovering && !isDragging) {
        acc += SPEED * dt;
        // Aplicamos solo la parte entera y guardamos la fracción para el siguiente
        // frame — evita micro-paradas cuando el navegador redondea scrollLeft.
        const step = Math.floor(acc);
        if (step > 0) {
          tEl.scrollLeft += step;
          acc -= step;
        }
        // Loop sin saltos visibles: al pasar la mitad (donde empieza el clon)
        // restamos esa mitad para volver a la "primera vuelta".
        const half = tEl.scrollWidth / 2;
        if (tEl.scrollLeft >= half) {
          tEl.scrollLeft -= half;
        }
      } else {
        acc = 0;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isHovering, isDragging, programs.length]);

  function startDrag(clientX: number) {
    const el = trackRef.current;
    if (!el) return;
    setIsDragging(true);
    dragState.current.startX = clientX;
    dragState.current.startScroll = el.scrollLeft;
    dragState.current.moved = 0;
  }
  function moveDrag(clientX: number) {
    if (!isDragging) return;
    const el = trackRef.current;
    if (!el) return;
    const delta = clientX - dragState.current.startX;
    el.scrollLeft = dragState.current.startScroll - delta;
    dragState.current.moved = Math.max(dragState.current.moved, Math.abs(delta));
  }
  function endDrag() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragState.current.moved > 5) {
      // Hubo arrastre real: suprimir el próximo click bubbling.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    }
  }

  if (programs.length === 0) return null;

  // Lista duplicada para el efecto infinito.
  const loopItems = [...programs, ...programs];

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trackRef}
        className="programs-carousel-track hide-scrollbar"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          endDrag();
        }}
        onMouseDown={(e) => startDrag(e.pageX)}
        onMouseMove={(e) => {
          if (isDragging) {
            e.preventDefault();
            moveDrag(e.pageX);
          }
        }}
        onMouseUp={endDrag}
        onTouchStart={(e) => startDrag(e.touches[0].pageX)}
        onTouchMove={(e) => moveDrag(e.touches[0].pageX)}
        onTouchEnd={endDrag}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{
          display: "flex",
          gap: 24,
          overflowX: "auto",
          paddingBottom: 8,
          paddingRight: 8,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: isDragging ? "none" : "auto",
          // Sin scroll-snap: rompería la animación continua.
          scrollSnapType: "none",
          // Sin scroll-behavior smooth: necesitamos respuesta instantánea
          // del scrollLeft incremental que aplicamos por frame.
          scrollBehavior: "auto",
        }}
      >
        {loopItems.map((p, i) => {
          const expanded = openId === p.id;
          const accentColor =
            p.accent === "warm" ? "var(--warm)" : p.accent === "ink" ? "var(--ink)" : "var(--accent)";
          return (
            <div
              key={`${p.id}-${i}`}
              style={{
                flex: "0 0 calc((100% - 48px) / 3)",
                minWidth: 280,
              }}
            >
              <ProgramCardItem
                program={p}
                index={i % programs.length}
                accentColor={accentColor}
                expanded={expanded}
                onToggle={() => setOpenId(expanded ? null : p.id)}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        /* No queremos que las imágenes sean "arrastrables" como assets — interfiere
           con el drag del carrusel. */
        .programs-carousel-track img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }
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
        aspectRatio="1/1"
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

