"use client";
import { useEffect, useRef } from "react";

/**
 * Fondo WebGL "Blazing Rifts" para el hero (tal cual el zip original,
 * incluyendo su fondo naranja).
 *
 * - Three.js + motor cargados por dynamic import (solo cliente, code-split).
 * - Zoom ALEJADO por default; al hacer scroll hacia abajo el cubo se acerca
 *   (zoom-in) mientras el hero se va hacia arriba.
 * - Respeta prefers-reduced-motion (no monta nada).
 * - pointer-events:none — el contenido del hero queda por encima.
 */
export function HeroRifts() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let handle: { setZoomProgress: (p: number) => void; cleanup: () => void } | null = null;
    let cancelled = false;
    let rafPending = false;

    const isSmall = window.innerWidth < 760;

    // Calcula el progreso de scroll a través del hero: 0 arriba del todo,
    // 1 cuando el hero ya se desplazó una altura completa hacia arriba.
    function computeProgress() {
      const node = ref.current;
      if (!node) return 0;
      const rect = node.getBoundingClientRect();
      const h = rect.height || 1;
      const p = -rect.top / h; // 0 en el tope, crece al bajar
      return Math.max(0, Math.min(1, p));
    }

    function onScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (handle) handle.setZoomProgress(computeProgress());
      });
    }

    import("./heroRifts.engine.js")
      .then((mod) => {
        if (cancelled || !ref.current) return;
        handle = mod.startRifts(ref.current, {
          particleCount: isSmall ? 6000 : 14000,
          backCount: isSmall ? 120 : 200,
        });
        // Estado inicial del zoom según la posición actual de scroll.
        handle.setZoomProgress(computeProgress());
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
      })
      .catch((e) => {
        console.error("[HeroRifts] no se pudo iniciar:", e);
      });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (handle) handle.cleanup();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
