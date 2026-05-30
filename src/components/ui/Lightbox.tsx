"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Lightbox / galería global.
 *
 * Se monta una sola vez en el root layout. Por delegación de eventos, cualquier
 * <img class="zoomable"> del sitio se vuelve clickeable y abre una galería
 * fullsize elegante (backdrop oscuro con blur, imagen centrada, prev/next,
 * contador, teclado ←/→/Esc, swipe táctil, click-fondo para cerrar).
 *
 * Agrupación: imágenes con el mismo atributo data-gallery="<nombre>" se navegan
 * juntas (prev/next). Sin data-gallery → se abre solo esa imagen.
 *
 * No requiere tocar cada componente con onClick: basta con poner la clase
 * `zoomable` (y opcionalmente data-gallery) en el <img>.
 */
type Item = { src: string; alt: string };

export function Lightbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const open = items.length > 0;

  // Delegación: capturar clicks en cualquier img.zoomable.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const el = e.target as HTMLElement | null;
      const img = el?.closest?.("img.zoomable") as HTMLImageElement | null;
      if (!img) return;
      e.preventDefault();
      e.stopPropagation();

      const group = img.getAttribute("data-gallery");
      let imgs: HTMLImageElement[];
      if (group) {
        imgs = Array.from(
          document.querySelectorAll<HTMLImageElement>(
            `img.zoomable[data-gallery="${group.replace(/"/g, '\\"')}"]`,
          ),
        );
      } else {
        imgs = [img];
      }
      const list: Item[] = imgs.map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" }));
      const start = Math.max(0, imgs.indexOf(img));
      setItems(list);
      setIndex(start);
    }
    // Capture phase para ganarle a navegaciones (Link) cuando aplique.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = useCallback(() => setItems([]), []);
  const prev = useCallback(
    () => setIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0)),
    [items.length],
  );
  const next = useCallback(
    () => setIndex((i) => (items.length ? (i + 1) % items.length : 0)),
    [items.length],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  if (!open) return null;
  const cur = items[index];
  const many = items.length > 1;

  // Swipe táctil
  let touchX = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchX = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(8, 14, 26, 0.86)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 4vw, 48px)",
        animation: "lb-fade 180ms ease",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Cerrar */}
      <button
        aria-label="Cerrar"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        style={{ ...iconBtn, top: 16, right: 16, position: "fixed" }}
      >
        ✕
      </button>

      {/* Prev */}
      {many && (
        <button
          aria-label="Anterior"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          style={{ ...iconBtn, left: "clamp(8px, 2vw, 28px)" }}
        >
          ‹
        </button>
      )}

      {/* Imagen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={cur.src}
        src={cur.src}
        alt={cur.alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: 14,
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          animation: "lb-zoom 220ms cubic-bezier(.2,.8,.2,1)",
        }}
      />

      {/* Next */}
      {many && (
        <button
          aria-label="Siguiente"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          style={{ ...iconBtn, right: "clamp(8px, 2vw, 28px)" }}
        >
          ›
        </button>
      )}

      {/* Pie: alt + contador */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.82)",
          fontSize: 13,
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.04em",
          pointerEvents: "none",
        }}
      >
        {cur.alt ? <span style={{ marginRight: many ? 12 : 0 }}>{cur.alt}</span> : null}
        {many ? <span style={{ opacity: 0.7 }}>{index + 1} / {items.length}</span> : null}
      </div>

      <style>{`
        @keyframes lb-fade { from { opacity: 0; } }
        @keyframes lb-zoom { from { opacity: 0; transform: scale(0.94); } }
      `}</style>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  transform: "translateY(-50%)",
  width: 46,
  height: 46,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(6px)",
  zIndex: 10000,
};
