"use client";
import { useEffect, useRef } from "react";

export type GallerySlide = {
  img: string;
  title: string;
  subtitle: string;
  description: string;
  /** Texto del botón. Por defecto "Siguiente" (y "Seguir leyendo" en el último). */
  cta?: string;
};

/**
 * Galería de héroe para /acerca — versión FINITA (no infinita).
 *
 * - Cada slide es una foto a pantalla completa (100svh) con su propio
 *   título (grande) + subtítulo (medio) + descripción (chico) + botón.
 * - El botón avanza al siguiente slide con scroll suave (mismo efecto). En el
 *   último slide, el botón (y el scroll natural) entrega el control a la página
 *   y continúa con la siguiente sección (#afterId, p.ej. la biografía).
 * - "Uno por uno": activamos scroll-snap SOLO mientras esta vista está montada
 *   (en <html>), y solo los paneles de la galería son puntos de anclaje, así
 *   que al pasar la última foto el resto de la página fluye normal (sin trampa).
 * - Parallax sutil del fondo calculado en JS (rAF) según la posición del panel.
 */
export function AcercaGallery({
  slides,
  afterId,
}: {
  slides: GallerySlide[];
  afterId: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Parallax del fondo de cada panel (rAF). La galería es su PROPIO contenedor
  // de scroll (snap mandatory), así que medimos respecto a ese contenedor.
  useEffect(() => {
    const scroller = rootRef.current;
    if (!scroller) return;
    const panels = Array.from(scroller.querySelectorAll<HTMLElement>(".ag-panel"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const sRect = scroller.getBoundingClientRect();
      const sh = sRect.height || 1;
      for (const panel of panels) {
        const bg = panel.querySelector<HTMLElement>(".ag-bg");
        if (!bg) continue;
        const pRect = panel.getBoundingClientRect();
        const center = pRect.top - sRect.top + pRect.height / 2 - sh / 2;
        const p = Math.max(-1.2, Math.min(1.2, center / sh));
        bg.style.transform = `translate3d(0, ${(p * 9).toFixed(2)}%, 0) scale(1.16)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [slides.length]);

  const goTo = (index: number) => {
    const root = rootRef.current;
    if (index >= slides.length) {
      document.getElementById(afterId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const panel = root?.querySelectorAll<HTMLElement>(".ag-panel")[index];
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="acerca-gallery" ref={rootRef}>
      {slides.map((s, i) => {
        const last = i === slides.length - 1;
        return (
          <section className="ag-panel" key={i} aria-roledescription="slide" aria-label={s.title}>
            <div className="ag-bg" style={{ backgroundImage: `url(${s.img})` }} aria-hidden="true" />
            <div className="ag-scrim" aria-hidden="true" />

            <div className="ag-inner">
              <h2 className="ag-title">{s.title}</h2>
              {s.subtitle && <p className="ag-subtitle">{s.subtitle}</p>}
              {s.description && <p className="ag-desc">{s.description}</p>}
              <button type="button" className="ag-btn" onClick={() => goTo(i + 1)}>
                {s.cta || (last ? "Seguir leyendo" : "Siguiente")}
                <span className="ag-btn-ico" aria-hidden="true">↓</span>
              </button>
            </div>

            {/* Indicador de progreso (qué foto vas viendo) */}
            <div className="ag-dots" aria-hidden="true">
              {slides.map((_, j) => (
                <span key={j} className={j === i ? "on" : ""} />
              ))}
            </div>
          </section>
        );
      })}

      <style>{`
        /* La galería es su PROPIO contenedor de scroll: snap mandatory =
           efecto "anclado", una foto a la vez. Al llegar al final, el
           overscroll encadena hacia la página (sigue la siguiente sección). */
        .acerca-gallery {
          position: relative;
          height: 100svh;
          min-height: 520px;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          overscroll-behavior-y: auto;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
          background: #05080f;
        }
        .acerca-gallery::-webkit-scrollbar { display: none; }
        .ag-panel {
          position: relative;
          height: 100%;
          min-height: 520px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
        .ag-bg {
          position: absolute;
          inset: -9% 0;
          height: 118%;
          background-size: cover;
          background-position: center;
          transform: scale(1.16);
          will-change: transform;
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
          padding: 13px 24px;
          border: 0;
          border-radius: 999px;
          background: #fff;
          color: #0b1b34;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(0,0,0,0.32);
          transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
        }
        .ag-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.4); }
        .ag-btn-ico { font-size: 16px; transition: transform .2s ease; }
        .ag-btn:hover .ag-btn-ico { transform: translateY(3px); }
        .ag-dots {
          position: absolute;
          right: clamp(16px, 3vw, 34px);
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .ag-dots span {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.35);
          transition: background .2s ease, transform .2s ease;
        }
        .ag-dots span.on { background: var(--gold, #F2C65A); transform: scale(1.4); }
        @media (max-width: 720px) {
          .ag-dots { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ag-bg { transform: scale(1.05) !important; }
        }
      `}</style>
    </div>
  );
}
