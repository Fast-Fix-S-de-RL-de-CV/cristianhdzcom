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
};

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
        minHeight: 200,
      }}
    >
      {/* IMAGEN — mitad izquierda
          Patrón YouTube/Spotify: imagen completa (object-fit: contain)
          + halo blureado del mismo color detrás para llenar bordes vacíos.
          Así una imagen 1:1 o 16:9 se ve íntegra sin recortes. */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-2)",
          minHeight: 200,
          overflow: "hidden",
        }}
      >
        {taller.coverUrl ? (
          <>
            {/* Capa 1: halo blureado de la misma imagen */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${cssQuoteUrl(taller.coverUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(24px) saturate(1.3) brightness(0.92)",
                transform: "scale(1.15)",
                opacity: 0.85,
              }}
            />
            {/* Capa 2: imagen completa centrada */}
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
                src={taller.coverUrl}
                alt=""
                loading="lazy"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  boxShadow: "0 6px 20px rgba(15,17,21,0.15)",
                }}
              />
            </div>
          </>
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
        {/* Badges sobrepuestos */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            zIndex: 2,
          }}
        >
          {taller.isEvergreen ? (
            <Badge variant="evergreen">✦ EVERGREEN</Badge>
          ) : taller.isLive ? (
            <Badge variant="live">● EN VIVO</Badge>
          ) : (
            <Badge variant="warm">EN VIVO PRÓXIMAMENTE</Badge>
          )}
          {taller.hot && <Badge variant="hot">🔥 HOT</Badge>}
        </div>
      </div>

      {/* TEXTO — mitad derecha */}
      <div
        style={{
          padding: "18px 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {index != null && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              TALLER {String(index).padStart(2, "0")}
            </span>
          )}
          {taller.tagline && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                letterSpacing: "0.08em",
                paddingLeft: index != null ? 10 : 0,
                borderLeft: index != null ? "1px solid var(--line)" : "none",
              }}
            >
              {taller.tagline.toUpperCase()}
            </span>
          )}
        </div>
        <h3
          className="serif"
          style={{
            fontSize: "clamp(18px, 2vw, 24px)",
            lineHeight: 1.15,
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
              fontSize: 13,
              color: "var(--ink-2)",
              lineHeight: 1.45,
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
            gap: 12,
            flexWrap: "wrap",
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          <span className="mono">📅 {dateLabel}</span>
          <span className="mono">⏱ {taller.durationMinutes} min</span>
        </div>

        <div
          className="row"
          style={{
            gap: 8,
            alignItems: "center",
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={taller.link || `/programas`}
            style={{
              padding: "8px 14px",
              background: "var(--ink)",
              color: "white",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {isFree ? "Apartar gratis" : taller.isEvergreen ? "Verlo ahora" : "Reservar"} →
          </Link>
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "5px 9px",
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
              letterSpacing: "0.04em",
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
  variant,
  children,
}: {
  variant: "evergreen" | "live" | "warm" | "hot";
  children: React.ReactNode;
}) {
  const map = {
    evergreen: { bg: "rgba(11, 37, 72, 0.9)", color: "#F2C65A" },
    live: { bg: "#DC4949", color: "white" },
    warm: { bg: "rgba(255,255,255,0.92)", color: "#A85A2B" },
    hot: { bg: "rgba(255,255,255,0.92)", color: "#A85A2B" },
  };
  const m = map[variant];
  return (
    <span
      className="mono"
      style={{
        padding: "3px 7px",
        borderRadius: 999,
        background: m.bg,
        color: m.color,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.06em",
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

/** Escapa la URL para CSS `url(...)`. */
function cssQuoteUrl(url: string): string {
  return url.replace(/"/g, '\\"').replace(/\)/g, "\\)");
}
