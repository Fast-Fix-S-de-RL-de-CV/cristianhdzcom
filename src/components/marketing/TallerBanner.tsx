import Link from "next/link";

export type TallerBannerRow = {
  id: string;
  title: string;
  description: string | null;
  host: string | null;
  startsAt: Date | string;
  durationMinutes: number;
  isLive: boolean;
  hot: boolean;
  capacity: number | null;
  attending: number;
  link: string | null;
  priceUsd: number | null;
  includedInMembership: string | null;
  coverUrl: string | null;
  isEvergreen: boolean;
  evergreenScheduleHint: string | null;
  tagline: string | null;
  recordingUrl: string | null;
  badge1Text?: string | null;
  badge1Color?: string | null;
  badge2Text?: string | null;
  badge2Color?: string | null;
};

type BadgeColor = "red" | "navy" | "warm" | "green" | "gold" | "muted" | "accent";

/**
 * Banner horizontal COMPACTO para listado vertical de talleres.
 *
 * Layout: 50/50 imagen-texto, altura fija (~220px desktop, ~auto en mobile)
 * — la mitad del tamaño del banner grande anterior. Pensado para listar 4-6
 * talleres uno debajo del otro sin que la página se vuelva infinita.
 *
 * El `index` se usa como numeración visual ("TALLER 01", "TALLER 02"…) en el
 * eyebrow superior, para que el usuario perciba el orden curado de
 * importancia.
 */
export function TallerBanner({
  taller,
  index,
}: {
  taller: TallerBannerRow;
  index?: number;
}) {
  const startsAtDate = taller.startsAt ? new Date(taller.startsAt) : null;
  const dateLabel = taller.isEvergreen
    ? taller.evergreenScheduleHint || "Disponible al inscribirte"
    : startsAtDate
      ? formatDateShort(startsAtDate)
      : "Próxima fecha por confirmar";

  const priceLabel = taller.includedInMembership
    ? `INCLUIDO EN ${taller.includedInMembership.toUpperCase()}+`
    : taller.priceUsd && taller.priceUsd > 0
      ? `$${taller.priceUsd} USD`
      : "GRATIS";
  const isFree = !taller.includedInMembership && (!taller.priceUsd || taller.priceUsd === 0);

  return (
    <div
      className="taller-banner-compact"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        padding: 0,
        borderRadius: 14,
        background: "white",
        border: "1px solid var(--line)",
        overflow: "hidden",
      }}
    >
      {/* IMAGEN — mitad izquierda con aspect-ratio fijo 3:1.
          La imagen sube al admin con dimensiones obligatorias 1500×500 (3:1)
          y aquí se renderiza full-bleed (object-fit: cover, sin halo, sin
          padding). Si por algún motivo el aspect difiere, cover recorta;
          nunca hay bordes vacíos. */}
      <div
        className="taller-banner-img"
        style={{
          position: "relative",
          background: "var(--bg-2)",
          aspectRatio: "3 / 1",
          overflow: "hidden",
        }}
      >
        {taller.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={taller.coverUrl}
            alt=""
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, oklch(35% 0.05 50), oklch(20% 0.04 60))",
              display: "flex",
              alignItems: "flex-end",
              padding: 20,
              color: "white",
            }}
          >
            <span className="serif" style={{ fontSize: 22, lineHeight: 1.1, opacity: 0.9 }}>
              {taller.title}
            </span>
          </div>
        )}
      </div>

      {/* TEXTO — mitad derecha
          Compactado: padding moderado, gaps mínimos, fila única para
          badges + numeración + tagline. El alto del bloque debe quedar
          alineado al alto natural de la imagen (aspect-ratio 3:1 del lado
          izquierdo), sin estirar hacia abajo. */}
      <div
        className="taller-banner-text"
        style={{
          padding: "clamp(14px, 1.6vw, 22px) clamp(18px, 2vw, 28px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        {/* Línea única: badges + TALLER 0X + tagline */}
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Badge 1 — custom o default según estado del taller */}
          {(() => {
            const text = taller.badge1Text?.trim();
            const color = (taller.badge1Color as BadgeColor) ?? null;
            if (text) return <Badge color={color ?? "navy"}>{text}</Badge>;
            if (taller.isEvergreen) return <Badge color="navy">✦ EVERGREEN</Badge>;
            if (taller.isLive) return <Badge color="red">● EN VIVO</Badge>;
            return <Badge color="warm">EN VIVO PRÓXIMAMENTE</Badge>;
          })()}
          {/* Badge 2 — custom o "HOT" default si hot=true */}
          {(() => {
            const text = taller.badge2Text?.trim();
            const color = (taller.badge2Color as BadgeColor) ?? null;
            if (text) return <Badge color={color ?? "warm"}>{text}</Badge>;
            if (taller.hot) return <Badge color="warm">🔥 HOT</Badge>;
            return null;
          })()}
          {index != null && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--accent)",
                letterSpacing: "0.1em",
                fontWeight: 800,
                paddingLeft: 4,
              }}
            >
              TALLER {String(index).padStart(2, "0")}
            </span>
          )}
          {taller.tagline && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--muted)",
                letterSpacing: "0.08em",
              }}
            >
              · {taller.tagline.toUpperCase()}
            </span>
          )}
        </div>

        <h3
          className="serif"
          style={{
            fontSize: "clamp(22px, 2.4vw, 32px)",
            lineHeight: 1.1,
            margin: 0,
            color: "var(--ink)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {taller.title}
        </h3>
        {taller.description && (
          <p
            style={{
              fontSize: "clamp(13px, 0.95vw, 15px)",
              color: "var(--ink-2)",
              lineHeight: 1.4,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {taller.description}
          </p>
        )}
        <div
          className="row"
          style={{
            gap: 14,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <span className="mono">📅 {dateLabel}</span>
          <span className="mono">⏱ {taller.durationMinutes} min</span>
        </div>

        <div
          className="row"
          style={{
            gap: 10,
            alignItems: "center",
            marginTop: 4,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={taller.link || `/programas`}
            style={{
              padding: "10px 20px",
              background: "var(--ink)",
              color: "white",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            {isFree ? "Apartar gratis" : taller.isEvergreen ? "Verlo ahora" : "Reservar"} →
          </Link>
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "8px 14px",
              borderRadius: 999,
              background: isFree
                ? "color-mix(in srgb, var(--green-soft) 60%, white)"
                : taller.includedInMembership
                  ? "color-mix(in srgb, var(--accent) 18%, white)"
                  : "var(--bg-2)",
              color: isFree
                ? "var(--green-strong)"
                : taller.includedInMembership
                  ? "var(--accent)"
                  : "var(--ink)",
              border: "1px solid var(--line)",
              letterSpacing: "0.05em",
            }}
          >
            {priceLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: BadgeColor;
  children: React.ReactNode;
}) {
  // Paleta de badges para fondo blanco. Cualquier color del enum aquí debe
  // verse legible en card blanco.
  const map: Record<BadgeColor, { bg: string; color: string; border: string }> = {
    red: { bg: "#DC4949", color: "white", border: "transparent" },
    navy: { bg: "rgba(11, 37, 72, 0.95)", color: "#F2C65A", border: "transparent" },
    warm: {
      bg: "color-mix(in srgb, #A85A2B 12%, white)",
      color: "#A85A2B",
      border: "color-mix(in srgb, #A85A2B 28%, white)",
    },
    green: {
      bg: "color-mix(in srgb, var(--green-strong, #2da064) 14%, white)",
      color: "var(--green-strong, #2da064)",
      border: "color-mix(in srgb, var(--green-strong, #2da064) 32%, white)",
    },
    gold: {
      bg: "color-mix(in srgb, var(--accent, #D8A83F) 18%, white)",
      color: "var(--accent, #D8A83F)",
      border: "color-mix(in srgb, var(--accent, #D8A83F) 38%, white)",
    },
    muted: {
      bg: "var(--bg-2)",
      color: "var(--ink-2)",
      border: "var(--line)",
    },
    accent: {
      bg: "var(--accent, #D8A83F)",
      color: "white",
      border: "transparent",
    },
  };
  const m = map[color] ?? map.muted;
  return (
    <span
      className="mono"
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function formatDateShort(d: Date): string {
  return d.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

