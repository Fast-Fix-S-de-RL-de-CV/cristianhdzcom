"use client";
import { useEffect, useRef } from "react";

/**
 * Fondo WebGL "Blazing Rifts" para el hero del home.
 *
 * - Carga Three.js + el motor de forma diferida (dynamic import) solo en
 *   cliente, así no entra al bundle del resto del sitio ni al SSR.
 * - Respeta prefers-reduced-motion: si está activo, no monta nada
 *   (se queda el fondo estático del hero).
 * - Se posiciona absoluto detrás del contenido del hero (pointer-events:none).
 */
export function HeroRifts() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Accesibilidad + dispositivos modestos: no animar si el usuario lo pidió.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    // En móviles bajamos la carga (menos partículas / menos formas de fondo).
    const isSmall = window.innerWidth < 760;

    import("./heroRifts.engine.js")
      .then((mod) => {
        if (cancelled || !ref.current) return;
        cleanup = mod.startRifts(ref.current, {
          particleCount: isSmall ? 6000 : 14000,
          backCount: isSmall ? 120 : 200,
        });
      })
      .catch((e) => {
        // Si WebGL falla o la lib no carga, el hero simplemente queda sin efecto.
        console.error("[HeroRifts] no se pudo iniciar:", e);
      });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
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
        // Mezcla suave con el fondo claro del hero — el efecto es oscuro/fuego,
        // así que lo atenuamos para no romper la legibilidad del texto navy.
        opacity: 0.9,
      }}
    />
  );
}
