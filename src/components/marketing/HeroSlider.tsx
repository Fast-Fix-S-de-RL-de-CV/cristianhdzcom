"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "@/components/tenant/TenantProvider";

/**
 * HeroSlider — carrusel del home configurable por el tenant (patrón tiendasyscom).
 * Cada slide es imagen o video (mp4/webm subido o URL YouTube/Vimeo). Autoplay con
 * duración por tipo, dots + flechas, y overlay de texto/CTAs por posición.
 */

export type HeroSlide = {
  id: string;
  mediaType: string; // image | video
  imageUrl: string | null;
  videoUrl: string | null;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  cta2Label: string | null;
  cta2Href: string | null;
  textPosition: string; // {top|center|bottom}-{left|center|right}
};

const HEIGHTS: Record<string, string> = {
  sm: "380px",
  md: "520px",
  lg: "70svh",
  full: "100svh",
};

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith("/uploads/");
}

function posStyle(textPosition: string): React.CSSProperties {
  const [v = "center", h = "center"] = (textPosition || "center-center").split("-");
  const alignItems = v === "top" ? "flex-start" : v === "bottom" ? "flex-end" : "center";
  const justify = h === "left" ? "flex-start" : h === "right" ? "flex-end" : "center";
  const textAlign = (h === "left" ? "left" : h === "right" ? "right" : "center") as React.CSSProperties["textAlign"];
  return { alignItems, justifyContent: justify, textAlign };
}

function SlideMedia({ slide, fit }: { slide: HeroSlide; fit: string }) {
  const objectFit = (fit === "contain" ? "contain" : "cover") as React.CSSProperties["objectFit"];
  const base: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit };

  if (slide.mediaType === "video" && slide.videoUrl) {
    const url = slide.videoUrl;
    if (isDirectVideo(url)) {
      return (
        <video
          src={url}
          poster={slide.imageUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          style={base}
        />
      );
    }
    const yt = youtubeId(url);
    if (yt) {
      const src = `https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&playsinline=1&rel=0`;
      return <iframe src={src} allow="autoplay; encrypted-media" style={{ ...base, border: 0 }} />;
    }
    const vm = vimeoId(url);
    if (vm) {
      const src = `https://player.vimeo.com/video/${vm}?autoplay=1&muted=1&loop=1&background=1`;
      return <iframe src={src} allow="autoplay" style={{ ...base, border: 0 }} />;
    }
  }
  // imagen (o fallback si el video no matchea)
  if (slide.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.imageUrl} alt={slide.title ?? ""} style={base} />;
  }
  return <div style={{ ...base, background: "var(--navy, #0A1E3A)" }} />;
}

export function HeroSlider({
  slides,
  height = "full",
  fit = "cover",
  siteName,
}: {
  slides: HeroSlide[];
  height?: string;
  fit?: string;
  siteName: string;
}) {
  const { tp } = useTenant();
  const [idx, setIdx] = useState(0);
  const active = slides[idx];
  const containerHeight = HEIGHTS[height] ?? HEIGHTS.full;

  const link = (href: string | null) => {
    if (!href) return "#";
    if (/^https?:\/\//.test(href) || href.startsWith("#")) return href;
    return href.startsWith("/") ? tp(href) : href;
  };

  // Autoplay: imagen 6.5s, video 12s. Se reinicia al cambiar de slide.
  const duration = useMemo(() => (active?.mediaType === "video" ? 12000 : 6500), [active]);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), duration);
    return () => clearTimeout(t);
  }, [idx, duration, slides.length]);

  // Empty state (sin slides): hero branded para que el home nunca quede en blanco.
  if (slides.length === 0) {
    return (
      <section
        aria-label={`${siteName} — Inicio`}
        style={{
          position: "relative",
          height: containerHeight,
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background:
            "radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--gold, #C8A951) 22%, transparent), transparent), var(--navy, #0A1E3A)",
          color: "white",
          padding: 24,
        }}
      >
        <div>
          <div
            className="mono"
            style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}
          >
            {siteName}
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(40px, 7vw, 84px)", marginTop: 12, lineHeight: 1.02 }}>
            Bienvenido a {siteName}.
          </h1>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`${siteName} — Inicio`}
      style={{ position: "relative", height: containerHeight, minHeight: 420, overflow: "hidden", background: "#050B1A" }}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== idx}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 700ms ease",
            pointerEvents: i === idx ? "auto" : "none",
          }}
        >
          <SlideMedia slide={s} fit={fit} />
          {/* Overlay oscuro para legibilidad */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.25) 100%)",
            }}
          />
          {/* Contenido */}
          {(s.title || s.subtitle || s.ctaLabel || s.cta2Label) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                padding: "clamp(24px, 6vw, 96px)",
                color: "white",
                ...posStyle(s.textPosition),
              }}
            >
              <div style={{ maxWidth: 780 }}>
                {s.title && (
                  <h1 className="serif" style={{ fontSize: "clamp(36px, 6vw, 76px)", lineHeight: 1.04, margin: 0 }}>
                    {s.title}
                  </h1>
                )}
                {s.subtitle && (
                  <p style={{ fontSize: "clamp(16px, 2vw, 22px)", lineHeight: 1.5, marginTop: 14, opacity: 0.94 }}>
                    {s.subtitle}
                  </p>
                )}
                {(s.ctaLabel || s.cta2Label) && (
                  <div className="row" style={{ gap: 12, marginTop: 26, flexWrap: "wrap", justifyContent: "inherit" }}>
                    {s.ctaLabel && (
                      <a
                        href={link(s.ctaHref)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "12px 22px",
                          borderRadius: 10,
                          background: "var(--gold, #C8A951)",
                          color: "#1a1200",
                          fontWeight: 700,
                          fontSize: 15,
                          textDecoration: "none",
                        }}
                      >
                        {s.ctaLabel}
                      </a>
                    )}
                    {s.cta2Label && (
                      <a
                        href={link(s.cta2Href)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "12px 22px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.12)",
                          border: "1px solid rgba(255,255,255,0.5)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: 15,
                          textDecoration: "none",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        {s.cta2Label}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            style={arrowStyle("left")}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            style={arrowStyle("right")}
          >
            ›
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 18,
              left: 0,
              right: 0,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Ir al slide ${i + 1}`}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 26 : 9,
                  height: 9,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: i === idx ? "var(--gold, #C8A951)" : "rgba(255,255,255,0.55)",
                  transition: "width 300ms ease",
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 16,
    transform: "translateY(-50%)",
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.4)",
    background: "rgba(0,0,0,0.28)",
    color: "white",
    fontSize: 26,
    lineHeight: 1,
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  };
}
