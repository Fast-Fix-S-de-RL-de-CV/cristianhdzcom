"use client";
import { useEffect, useRef, useState } from "react";

export type GallerySlide = {
  img: string;
  title: string;
  subtitle: string;
  description: string;
  /** Texto del botón. Por defecto "Siguiente" (y "Seguir leyendo" en el último). */
  cta?: string;
};

/**
 * Galería de héroe para /acerca — stepper FINITO controlado por BOTÓN.
 *
 * - Cada slide es una foto a pantalla completa (100svh) con su título (grande)
 *   + subtítulo (medio) + descripción (chico) + botón.
 * - El AVANCE es solo por botón: la rueda del mouse y el touch quedan
 *   bloqueados sobre la galería (no se puede "correr" como landing). Cada clic
 *   desliza la siguiente foto hacia arriba (efecto anclado, una a la vez).
 * - En la última foto, el botón "libera" el bloqueo y continúa con la
 *   siguiente sección de la página (#afterId, la biografía).
 * - Los puntos de la derecha permiten saltar directo a una foto.
 */
export function AcercaGallery({
  slides,
  afterId,
}: {
  slides: GallerySlide[];
  afterId: string;
}) {
  const [index, setIndex] = useState(0);
  const [released, setReleased] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Bloquear rueda/touch SOBRE la galería mientras no se haya liberado: la
  // única forma de avanzar es el botón. Al liberar (último slide) se quitan los
  // listeners y la página vuelve a fluir normal.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || released) return;
    const block = (e: Event) => e.preventDefault();
    stage.addEventListener("wheel", block, { passive: false });
    stage.addEventListener("touchmove", block, { passive: false });
    return () => {
      stage.removeEventListener("wheel", block);
      stage.removeEventListener("touchmove", block);
    };
  }, [released]);

  const advance = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // Última foto → liberar el scroll y continuar con la página.
      setReleased(true);
      requestAnimationFrame(() => {
        document.getElementById(afterId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div
      className={`acerca-gallery${released ? "" : " is-locked"}`}
      ref={stageRef}
      aria-roledescription="carrusel"
      aria-label="Galería — Acerca de"
    >
      {slides.map((s, i) => {
        const state = i === index ? "is-active" : i < index ? "is-prev" : "is-next";
        const last = i === slides.length - 1;
        return (
          <section className={`ag-slide ${state}`} key={i} aria-hidden={i !== index}>
            <div className="ag-bg" style={{ backgroundImage: `url(${s.img})` }} aria-hidden="true" />
            <div className="ag-scrim" aria-hidden="true" />
            <div className="ag-inner">
              <h2 className="ag-title">{s.title}</h2>
              {s.subtitle && <p className="ag-subtitle">{s.subtitle}</p>}
              {s.description && <p className="ag-desc">{s.description}</p>}
              <button
                type="button"
                className="ag-btn"
                onClick={advance}
                tabIndex={i === index ? 0 : -1}
              >
                {s.cta || (last ? "Seguir leyendo" : "Siguiente")}
                <span className="ag-btn-ico" aria-hidden="true">↓</span>
              </button>
            </div>
          </section>
        );
      })}

      {/* Puntos de progreso (clic para saltar a una foto) */}
      <div className="ag-dots" role="tablist" aria-label="Fotos">
        {slides.map((_, j) => (
          <button
            key={j}
            type="button"
            role="tab"
            aria-selected={j === index}
            aria-label={`Foto ${j + 1} de ${slides.length}`}
            className={j === index ? "on" : ""}
            onClick={() => setIndex(j)}
          />
        ))}
      </div>

      <style>{`
        .acerca-gallery {
          position: relative;
          height: 100svh;
          min-height: 520px;
          overflow: hidden;
          background: #05080f;
        }
        .acerca-gallery.is-locked { touch-action: none; }

        .ag-slide {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          transform: translateY(100%);
          transition: transform 0.85s cubic-bezier(0.7, 0, 0.2, 1);
          will-change: transform;
        }
        .ag-slide.is-active { transform: translateY(0); z-index: 2; }
        .ag-slide.is-prev { transform: translateY(-100%); }
        .ag-slide:not(.is-active) { pointer-events: none; }

        .ag-bg {
          position: absolute;
          inset: -6% 0;
          height: 112%;
          background-size: cover;
          background-position: center;
          transform: scale(1.06);
        }
        /* Ken Burns sutil solo en la foto activa */
        .ag-slide.is-active .ag-bg { animation: ag-kenburns 9s ease-out both; }
        @keyframes ag-kenburns {
          from { transform: scale(1.12); }
          to { transform: scale(1.02); }
        }

        .ag-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top,
            rgba(5,8,15,0.86) 0%,
            rgba(5,8,15,0.34) 44%,
            rgba(5,8,15,0.05) 72%);
        }
        .ag-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(28px,6vw,80px) clamp(24px,6vw,72px) clamp(64px,11vh,128px);
          color: #fff;
        }
        /* La entrada del texto acompaña al deslizamiento de la foto activa */
        .ag-slide.is-active .ag-inner > * { animation: ag-rise 0.7s cubic-bezier(0.2,0.8,0.2,1) both; }
        .ag-slide.is-active .ag-subtitle { animation-delay: 0.06s; }
        .ag-slide.is-active .ag-desc { animation-delay: 0.12s; }
        .ag-slide.is-active .ag-btn { animation-delay: 0.18s; }
        @keyframes ag-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

        .ag-title {
          margin: 0 0 12px;
          color: #fff;
          font-size: clamp(40px, 7vw, 94px);
          line-height: 0.97;
          letter-spacing: -0.01em;
          text-shadow: 0 2px 44px rgba(0,0,0,0.5);
        }
        .ag-subtitle {
          margin: 0 0 14px;
          color: rgba(255,255,255,0.92);
          font-size: clamp(20px, 3vw, 34px);
          font-weight: 500;
          line-height: 1.12;
          text-shadow: 0 2px 24px rgba(0,0,0,0.45);
        }
        .ag-desc {
          margin: 0 0 28px;
          max-width: 640px;
          color: rgba(255,255,255,0.8);
          font-size: clamp(15px, 1.7vw, 19px);
          line-height: 1.55;
          text-shadow: 0 1px 16px rgba(0,0,0,0.4);
        }
        .ag-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 26px;
          border: 0;
          border-radius: 999px;
          background: #fff;
          color: #0b1b34;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(0,0,0,0.32);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .ag-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.4); }
        .ag-btn-ico { font-size: 16px; transition: transform .2s ease; }
        .ag-btn:hover .ag-btn-ico { transform: translateY(3px); }

        .ag-dots {
          position: absolute;
          right: clamp(16px, 3vw, 34px);
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .ag-dots button {
          width: 11px; height: 11px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.55);
          background: transparent;
          cursor: pointer;
          transition: background .2s ease, transform .2s ease, border-color .2s ease;
        }
        .ag-dots button:hover { background: rgba(255,255,255,0.4); }
        .ag-dots button.on {
          background: var(--gold, #F2C65A);
          border-color: var(--gold, #F2C65A);
          transform: scale(1.25);
        }
        @media (max-width: 720px) {
          .ag-dots { right: 12px; gap: 9px; }
          .ag-dots button { width: 9px; height: 9px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ag-slide { transition: none; }
          .ag-slide.is-active .ag-bg,
          .ag-slide.is-active .ag-inner > * { animation: none; }
        }
      `}</style>
    </div>
  );
}
