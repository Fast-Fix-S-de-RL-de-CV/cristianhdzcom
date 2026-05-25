import type { CSSProperties } from "react";

type Props = {
  coverUrl: string | null | undefined;
  coverKind: "image" | "video" | string | null | undefined;
  /** Big serif fallback when there's no cover (e.g. "01", "02"). */
  fallback?: string;
  /** Accent color used for the fallback number/text. */
  accent?: string;
  /** Container height in px. */
  height?: number;
  /** Use aspect-ratio instead of fixed height (e.g. "4/5", "16/9"). */
  aspectRatio?: string;
  /** Border radius in px. */
  radius?: number;
  /** Bottom border (used inside cards). */
  bottomDivider?: boolean;
  /** Style overrides. */
  style?: CSSProperties;
  /** Optional className passthrough. */
  className?: string;
  /**
   * Cómo encajar la imagen en el contenedor:
   *   - 'contain' (default): muestra la imagen COMPLETA sin cortarla. Para
   *     evitar bordes vacíos, renderea la misma imagen como fondo blureado
   *     detrás (técnica YouTube/Spotify).
   *   - 'cover': recorta la imagen para llenar el contenedor. Útil cuando
   *     sabes que la imagen ya viene en el aspect ratio correcto.
   */
  fit?: "contain" | "cover";
};

/**
 * Renderiza la portada de un programa/curso con dos modos:
 *
 *   fit='contain' (DEFAULT) — la imagen se ve completa, centrada. Si su
 *     aspect ratio no coincide con el contenedor (ej. imagen 1:1 en card
 *     ancha), los lados se llenan con la MISMA imagen blureada de fondo.
 *     Es lo que hacen YouTube y Spotify con videos verticales / álbumes
 *     cuadrados en cards rectangulares: no se ve cropped y conserva el
 *     mood cromático.
 *
 *   fit='cover' — comportamiento clásico, llena recortando. Solo úsalo si
 *     estás seguro que la imagen viene con el aspect correcto.
 *
 * Para videos siempre usa cover (los videos UI suelen estar pensados así).
 */
export function CourseCover({
  coverUrl,
  coverKind,
  fallback,
  accent = "var(--accent)",
  height,
  aspectRatio,
  radius = 0,
  bottomDivider = false,
  style,
  className,
  fit = "contain",
}: Props) {
  const wrapperStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius,
    width: "100%",
    background: "var(--bg-2)",
    ...(height ? { height } : null),
    ...(aspectRatio ? { aspectRatio } : null),
    ...(bottomDivider ? { borderBottom: "1px solid var(--line)" } : null),
    ...style,
  };

  // Real cover present → render media.
  if (coverUrl && coverUrl.trim() !== "") {
    if (coverKind === "video") {
      // Videos siempre usan cover — están pensados así por defecto.
      return (
        <div style={wrapperStyle} className={className}>
          <video
            src={coverUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      );
    }

    // Imagen: contain (default) o cover.
    if (fit === "cover") {
      return (
        <div style={wrapperStyle} className={className}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      );
    }

    // fit === "contain" → la imagen se ve completa.
    // Detrás de ella va la misma imagen pero blureada y escalada, para que
    // los lados vacíos no se vean como un cuadro gris feo.
    return (
      <div style={wrapperStyle} className={className}>
        {/* Capa 1: imagen blureada de fondo (mismo URL, scaled + blurred). */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${cssQuoteUrl(coverUrl)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) saturate(1.4) brightness(0.9)",
            transform: "scale(1.15)",
            opacity: 0.85,
          }}
        />
        {/* Capa 2: la imagen real, completa y centrada. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
              boxShadow: "0 8px 24px rgba(15,17,21,0.18)",
            }}
          />
        </div>
      </div>
    );
  }

  // Fallback: keep the existing "ph" placeholder + big serif numeral.
  return (
    <div className={`ph ${className ?? ""}`.trim()} style={wrapperStyle}>
      {fallback ? (
        <div className="serif" style={{ fontSize: 88, color: accent, opacity: 0.5 }}>
          {fallback}
        </div>
      ) : null}
    </div>
  );
}

/** Escapa la URL para meterla en una propiedad CSS `url(...)` sin romper. */
function cssQuoteUrl(url: string): string {
  return url.replace(/"/g, '\\"').replace(/\)/g, "\\)");
}
