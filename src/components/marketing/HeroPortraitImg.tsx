"use client";
import { useState } from "react";

/**
 * Mini wrapper del <img> del hero con manejo defensivo de error.
 *
 * Si la imagen falla a cargar (404, CORS, archivo borrado, etc.), el
 * componente esconde el `<img>` y deja visible solo el gradient azul de
 * fondo del contenedor padre. Sin broken-image icon, sin layout shift.
 *
 * Existe porque page.tsx es server component (no puede usar event handlers
 * directos como `onError`).
 */
export function HeroPortraitImg({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center top",
        display: "block",
      }}
    />
  );
}
