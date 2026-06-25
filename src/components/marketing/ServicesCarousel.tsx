"use client";
import { useEffect, useRef, useState } from "react";
import { ServiceCardItem, type ServiceCard } from "./ServicesGrid";

/**
 * Carrusel horizontal de Empresas y Servicios. Mismo patrón que
 * ProgramsCarousel (auto-scroll continuo + loop infinito + drag con manita)
 * pero corriendo en DIRECCIÓN CONTRARIA (derecha → izquierda) para crear
 * contraste visual con el carrusel de programas.
 *
 * - Lista duplicada para loop sin saltos.
 * - Auto-scroll por rAF; pausa en hover y mientras se arrastra.
 * - Drag > 5px suprime el click siguiente (no abre la card sin querer).
 */
export function ServicesCarousel({ services }: { services: ServiceCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScroll: 0, moved: 0 });
  const suppressClickRef = useRef(false);

  // Posiciona el scroll a la mitad al montar, para poder correr "hacia atrás"
  // sin chocar contra el borde 0 desde el primer frame.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || services.length === 0) return;
    el.scrollLeft = el.scrollWidth / 2;
  }, [services.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || services.length === 0) return;
    let rafId = 0;
    let last = performance.now();
    let acc = 0;
    const SPEED = 75; // px / segundo (mismo ritmo que ProgramsCarousel)

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const tEl = trackRef.current;
      if (tEl && !isHovering && !isDragging) {
        acc += SPEED * dt;
        const step = Math.floor(acc);
        if (step > 0) {
          // Dirección CONTRARIA: restamos (se mueve hacia la izquierda → derecha visual).
          tEl.scrollLeft -= step;
          acc -= step;
        }
        // Loop sin saltos: al cruzar 0 saltamos a la mitad.
        const half = tEl.scrollWidth / 2;
        if (tEl.scrollLeft <= 0) {
          tEl.scrollLeft += half;
        }
      } else {
        acc = 0;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isHovering, isDragging, services.length]);

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
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    }
  }

  if (services.length === 0) return null;
  const loopItems = [...services, ...services];

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trackRef}
        className="services-carousel-track hide-scrollbar"
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
          gap: 20,
          overflowX: "auto",
          paddingBottom: 8,
          paddingRight: 8,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: isDragging ? "none" : "auto",
          scrollSnapType: "none",
          scrollBehavior: "auto",
        }}
      >
        {loopItems.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            style={{
              flex: "0 0 calc((100% - 40px) / 3)",
              minWidth: 300,
            }}
          >
            <ServiceCardItem service={s} staticCover />
          </div>
        ))}
      </div>

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .services-carousel-track img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }
        @media (max-width: 768px) {
          .services-carousel-track > div { flex: 0 0 calc(85% - 10px) !important; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .services-carousel-track > div { flex: 0 0 calc(50% - 10px) !important; }
        }
      `}</style>
    </div>
  );
}
