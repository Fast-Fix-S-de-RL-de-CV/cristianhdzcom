import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { coverEmbedUrl } from "@/lib/video";

export type ServiceCard = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  kind: string;
  tagline: string | null;
  description: string | null;
  glyph: string | null;
  hue: number;
  badge: string | null;
  metricLabel: string | null;
  priceLabel: string | null;
  ctaLabel: string;
  ctaUrl: string | null;
  isCtaCard: boolean;
  showLiveBadge: boolean;
  coverVideoUrl: string | null;
};

/**
 * Grid de "Empresas y Servicios" del home. Render fiel al diseño anterior
 * (que vivía hardcoded en page.tsx) pero ahora alimentado desde la DB.
 *
 * Cada card tiene:
 *   - Banner superior con gradiente OKLCH parametrizado por `hue`
 *   - Glyph centrado en cuadrado blanco (las iniciales: "B", "TS", "M+"…)
 *   - Badge top-left ("INSIGNIA", "NUEVO"…) opcional
 *   - Chip "● EN VIVO" top-right opcional
 *   - Dominio abajo izquierda
 *   - Sección de texto con tagline, name, descripción
 *   - Métrica destacada en dorado a la derecha del tagline
 *   - Precio y CTA en el footer
 *
 * Las cards con `isCtaCard=true` rompen el patrón: fondo de líneas
 * diagonales, glyph grande "+", texto "Tu producto aquí".
 */
export function ServicesGrid({ services }: { services: ServiceCard[] }) {
  return (
    <div className="grid-3" style={{ gap: 20 }}>
      {services.map((s) => (
        <ServiceCardItem key={s.id} service={s} />
      ))}
    </div>
  );
}

export function ServiceCardItem({
  service: s,
  staticCover = false,
}: {
  service: ServiceCard;
  /** Si true, ignora el video de portada (lo usa el carrusel para no autoplayear N iframes en movimiento). */
  staticCover?: boolean;
}) {
  const isCta = s.isCtaCard;
  const accent = `oklch(42% 0.14 ${s.hue})`;
  const coverVideo = !isCta && !staticCover ? coverEmbedUrl(s.coverVideoUrl) : null;
  const bannerBg = isCta
    ? "repeating-linear-gradient(135deg, var(--bg-2) 0 1px, transparent 1px 10px), var(--bg)"
    : `linear-gradient(135deg, oklch(58% 0.18 ${s.hue}), oklch(42% 0.14 ${s.hue}))`;

  const cardInner = (
    <Card hover style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Banner / portada superior — formato cuadrado (1:1), más alto */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: coverVideo ? "#0b1220" : bannerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {coverVideo && (
          <>
            <iframe
              src={coverVideo}
              title={s.name}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                // 16:9 que CUBRE el cuadrado (recorta los lados) en vez de letterbox.
                // Alto = 100% del cuadrado; ancho = 16/9 de ese alto. scale() = overscan
                // para que no quede ninguna línea del gradiente arriba/abajo.
                width: "177.78%",
                height: "100%",
                transform: "translate(-50%, -50%) scale(1.06)",
                border: 0,
                pointerEvents: "none",
              }}
            />
            {/* Scrim para legibilidad del badge/dominio sobre cualquier video */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)",
              }}
            />
          </>
        )}
        {!isCta && (
          <>
            {s.badge && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.18)",
                  color: "white",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  borderRadius: 999,
                  letterSpacing: "0.08em",
                  backdropFilter: "blur(8px)",
                }}
              >
                {s.badge}
              </span>
            )}
            {s.showLiveBadge && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  padding: "4px 10px",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  borderRadius: 999,
                  letterSpacing: "0.08em",
                }}
              >
                ● EN VIVO
              </span>
            )}
            {!coverVideo && (
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 26,
                  background: "rgba(255,255,255,0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 46,
                  color: accent,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  fontWeight: 600,
                }}
              >
                {s.glyph ?? s.name.charAt(0)}
              </div>
            )}
            {s.domain && (
              <span
                className="mono"
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: 16,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.08em",
                }}
              >
                {s.domain}
              </span>
            )}
          </>
        )}
        {isCta && (
          <div style={{ textAlign: "center", color: "var(--muted)" }}>
            <div className="serif" style={{ fontSize: 64, color: "var(--ink)" }}>
              {s.glyph ?? "+"}
            </div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
              TU PRODUCTO AQUÍ
            </div>
          </div>
        )}
      </div>

      {/* Texto */}
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          {s.tagline && (
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em" }}>
              {s.tagline}
            </span>
          )}
          {!isCta && s.metricLabel && (
            <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>
              {s.metricLabel}
            </span>
          )}
        </div>
        <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05 }}>
          {s.name}
        </h3>
        {s.description && (
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>{s.description}</p>
        )}
        <div className="rule" />
        <div className="between">
          {s.priceLabel && <span style={{ fontSize: 14, fontWeight: 600 }}>{s.priceLabel}</span>}
          <Button variant={isCta ? "primary" : "ghost"} size="sm">
            {s.ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );

  if (s.ctaUrl) {
    const isExternal = /^https?:\/\//.test(s.ctaUrl) || s.ctaUrl.startsWith("mailto:");
    if (isExternal) {
      return (
        <a
          href={s.ctaUrl}
          target={s.ctaUrl.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          {cardInner}
        </a>
      );
    }
    return (
      <Link href={s.ctaUrl} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        {cardInner}
      </Link>
    );
  }
  return cardInner;
}
