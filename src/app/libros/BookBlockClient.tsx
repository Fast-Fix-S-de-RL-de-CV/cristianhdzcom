"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

/**
 * Versión animada del bloque de libro. Se activa cuando entra a viewport:
 *
 *   - Texto: palabras del título y subtítulo aparecen escalonadas (stagger).
 *   - Imagen: entra deslizándose desde el lado opuesto al texto.
 *   - Hover: la portada hace zoom suave (scale 1.05).
 *
 * Si es PNG con fondo transparente (caso normal de mockups 3D de libro),
 * no aplicamos borderRadius ni boxShadow para que solo se vea el contorno
 * del libro, no un rectángulo gris detrás.
 */
export function BookBlockClient(props: {
  slug: string;
  vol: string;
  accent: "warm" | "accent";
  title: string;
  desc: string;
  bullets: string[];
  digital: number;
  physical: number;
  priceCompare: number | null;
  hasDigital: boolean;
  hasPhysical: boolean;
  stockPhysical: number | null;
  rating: string;
  meta: string;
  coverGradient: string;
  coverUrl: string | null;
  flip?: boolean;
  crossSellBundleSlug: string | null;
  crossSellSavings: number | null;
}) {
  const {
    slug,
    vol,
    accent,
    title,
    desc,
    bullets,
    digital,
    physical,
    priceCompare,
    hasDigital,
    hasPhysical,
    stockPhysical,
    rating,
    meta,
    coverGradient,
    coverUrl,
    flip,
    crossSellBundleSlug,
    crossSellSavings,
  } = props;

  const accentColor = accent === "warm" ? "var(--warm)" : "var(--accent)";
  const hasCover = coverUrl != null && coverUrl.trim() !== "";

  // IntersectionObserver para activar la animación al entrar a viewport.
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Helpers de animación: cada texto aparece con stagger.
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const baseTransition = (delayMs: number) =>
    `opacity 700ms ${ease} ${delayMs}ms, transform 700ms ${ease} ${delayMs}ms`;

  /** Divide el título en palabras animables. */
  function StaggeredText({
    text,
    delay = 0,
    stepMs = 60,
    style,
  }: {
    text: string;
    delay?: number;
    stepMs?: number;
    style?: React.CSSProperties;
  }) {
    const words = text.split(" ");
    return (
      <>
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            style={{
              display: "inline-block",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(14px)",
              transition: baseTransition(delay + i * stepMs),
              willChange: "transform, opacity",
              ...style,
            }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </>
    );
  }

  const cover = (
    <div
      style={{
        position: "relative",
        // Entrada lateral: viene del lado opuesto al texto, opacidad 0→1
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateX(0)"
          : `translateX(${flip ? -60 : 60}px)`,
        transition: `opacity 900ms ${ease}, transform 900ms ${ease}`,
        willChange: "transform, opacity",
      }}
    >
      {hasCover ? (
        // PNG transparente: 70% del ancho del contenedor (30% más chica),
        // centrada, sin bordes ni sombra (para no romper la transparencia).
        // Hover: zoom suave.
        <div
          className="book-cover-hover"
          style={{
            width: "70%",
            margin: "0 auto",
            transition: `transform 500ms ${ease}`,
            willChange: "transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl!}
            alt={title}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
            }}
          />
        </div>
      ) : (
        // Fallback tipográfico (mantiene su estilo de portada con gradiente)
        <div style={{ aspectRatio: "3/4", position: "relative" }}>
          <div
            className="ph"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 4,
              background: coverGradient,
              border: "none",
              color: "var(--bg)",
              boxShadow:
                "0 30px 60px rgba(15,17,21,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset",
              flexDirection: "column",
              padding: 40,
              gap: 12,
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                opacity: 0.7,
              }}
            >
              {vol}
            </span>
            <span
              className="serif"
              style={{
                fontSize: 48,
                color: "var(--bg)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                alignSelf: "flex-start",
                textAlign: "left",
              }}
            >
              {title.replace(/\.$/, "")}
            </span>
            <span
              style={{
                marginTop: "auto",
                alignSelf: "flex-end",
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 500,
              }}
            >
              Cristian Hernández
            </span>
          </div>
        </div>
      )}
      <div
        className="row"
        style={{
          marginTop: 24,
          gap: 12,
          flexWrap: "wrap",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: baseTransition(500),
        }}
      >
        <Chip variant={accent === "warm" ? "warm" : "accent"}>{rating}</Chip>
        <Chip>{meta}</Chip>
        {hasPhysical &&
          stockPhysical != null &&
          stockPhysical < 50 &&
          stockPhysical > 0 && (
            <Chip variant="warm">🔥 Quedan {stockPhysical} firmadas</Chip>
          )}
      </div>
    </div>
  );

  const text = (
    <div>
      <span
        className="mono"
        style={{
          fontSize: 12,
          color: accentColor,
          letterSpacing: "0.08em",
          display: "inline-block",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: baseTransition(0),
        }}
      >
        {vol} · {accent === "warm" ? "NEGOCIOS" : "INTERNET"}
      </span>
      <h2
        style={{
          fontSize: 72,
          marginTop: 12,
          marginBottom: 20,
        }}
      >
        <StaggeredText text={title} delay={120} stepMs={80} />
      </h2>
      <p
        style={{
          fontSize: 18,
          lineHeight: 1.6,
          color: "var(--ink-2)",
          marginBottom: 24,
        }}
      >
        <StaggeredText text={desc} delay={420} stepMs={18} />
      </p>
      <div
        className="grid-2"
        style={{ gap: 16, marginBottom: 32 }}
      >
        {bullets.map((t, i) => (
          <div
            key={t}
            className="row"
            style={{
              gap: 10,
              fontSize: 14,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(10px)",
              transition: baseTransition(700 + i * 80),
            }}
          >
            <span style={{ color: accentColor }}>✦</span> {t}
          </div>
        ))}
      </div>
      <div
        className="row"
        style={{
          gap: 16,
          paddingTop: 24,
          borderTop: "1px solid var(--line)",
          flexWrap: "wrap",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: baseTransition(900 + bullets.length * 80),
        }}
      >
        {hasDigital && (
          <div>
            <div className="serif" style={{ fontSize: 44 }}>
              ${digital}
              {priceCompare && priceCompare > digital ? (
                <span
                  className="mono"
                  style={{
                    fontSize: 14,
                    color: "var(--muted)",
                    textDecoration: "line-through",
                    marginLeft: 8,
                    fontWeight: 400,
                  }}
                >
                  ${priceCompare}
                </span>
              ) : null}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              DIGITAL · USD
            </div>
          </div>
        )}
        {hasPhysical && (
          <div>
            <div className="serif" style={{ fontSize: 44 }}>
              ${physical}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              FÍSICO · ENVÍO LATAM
            </div>
          </div>
        )}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link href={`/blog`}>
            <Button size="lg" variant="ghost">
              Leer extracto
            </Button>
          </Link>
          <Link href={`/checkout/libro/${slug}`}>
            <Button size="lg">Comprar ahora →</Button>
          </Link>
        </div>
      </div>
      {crossSellBundleSlug && crossSellSavings && crossSellSavings > 0 && (
        <Link
          href={`/checkout/libro/${crossSellBundleSlug}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 18,
            padding: "8px 14px",
            background: "color-mix(in srgb, var(--accent) 12%, white)",
            color: "var(--accent)",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
            border:
              "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: baseTransition(1100 + bullets.length * 80),
          }}
        >
          💡 LLEVA LOS 2 LIBROS Y AHORRA ${crossSellSavings} →
        </Link>
      )}
    </div>
  );

  return (
    <section ref={sectionRef} className="sec" style={{ paddingTop: 80 }}>
      <div
        className="book-grid"
        style={{
          display: "grid",
          gridTemplateColumns: flip ? "1fr 0.85fr" : "0.85fr 1fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        {flip ? text : cover}
        {flip ? cover : text}
      </div>
      <style>{`
        .book-cover-hover:hover {
          transform: scale(1.05);
        }
      `}</style>
    </section>
  );
}
