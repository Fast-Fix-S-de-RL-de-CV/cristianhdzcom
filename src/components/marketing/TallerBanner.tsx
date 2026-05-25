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
 * Banner horizontal estilo "paid ad" para talleres en vivo y evergreen.
 * Layout: imagen ancha (≈ 4:3 o 16:9) en una mitad + texto del otro lado.
 *
 * Lógica de fecha:
 *   - isEvergreen = true  → muestra evergreenScheduleHint (ej "Cada miércoles 7pm"),
 *                            badge "✦ EVERGREEN · DISPONIBLE SIEMPRE".
 *   - isEvergreen = false → muestra fecha real del startsAt + duración.
 *
 * Lógica de precio:
 *   - includedInMembership: pinta chip dorado "INCLUIDO EN ORO/BLACK".
 *   - priceUsd > 0:         muestra precio.
 *   - else:                 "GRATIS".
 */
export function TallerBanner({
  taller,
  flip = false,
}: {
  taller: TallerBannerRow;
  flip?: boolean;
}) {
  const startsAtDate = taller.startsAt ? new Date(taller.startsAt) : null;
  const dateLabel = taller.isEvergreen
    ? taller.evergreenScheduleHint || "Disponible al inscribirte"
    : startsAtDate
      ? formatDateLong(startsAtDate)
      : "Próxima fecha por confirmar";

  const priceLabel =
    taller.includedInMembership
      ? `INCLUIDO EN ${taller.includedInMembership.toUpperCase()}+`
      : taller.priceUsd && taller.priceUsd > 0
        ? `$${taller.priceUsd} USD`
        : "GRATIS";
  const isFree = !taller.includedInMembership && (!taller.priceUsd || taller.priceUsd === 0);

  const cover = (
    <div
      style={{
        position: "relative",
        aspectRatio: "4/3",
        borderRadius: 14,
        overflow: "hidden",
        background: taller.coverUrl
          ? "transparent"
          : "linear-gradient(135deg, oklch(35% 0.05 50), oklch(20% 0.04 60))",
        boxShadow: "0 20px 50px rgba(15,17,21,0.18)",
      }}
    >
      {taller.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={taller.coverUrl}
          alt=""
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: 28,
            color: "white",
          }}
        >
          <span className="serif" style={{ fontSize: 32, lineHeight: 1.1, opacity: 0.9 }}>
            {taller.title}
          </span>
        </div>
      )}
      {/* Badges encima */}
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
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
  );

  const text = (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
      {taller.tagline && (
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 10 }}
        >
          {taller.tagline.toUpperCase()}
        </span>
      )}
      <h3 className="serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", lineHeight: 1.05, marginBottom: 14 }}>
        {taller.title}
      </h3>
      {taller.description && (
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 18 }}>
          {taller.description.length > 180 ? taller.description.slice(0, 178) + "…" : taller.description}
        </p>
      )}
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 22, fontSize: 13 }}>
        <Meta icon="📅" label={dateLabel} />
        <Meta icon="⏱" label={`${taller.durationMinutes} min`} />
        {taller.host && <Meta icon="🎙" label={taller.host} />}
      </div>
      <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href={taller.link || `/programas`}
          style={{
            padding: "12px 22px",
            background: "var(--ink)",
            color: "white",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isFree ? "Apartar mi lugar gratis" : taller.isEvergreen ? "Verlo ahora" : "Reservar lugar"} →
        </Link>
        <span
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 700,
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
            letterSpacing: "0.04em",
          }}
        >
          {priceLabel}
        </span>
        {taller.capacity != null && !taller.isEvergreen && (
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {taller.attending}/{taller.capacity} reservados
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        gap: 32,
        padding: 24,
        borderRadius: 18,
        background: "white",
        border: "1px solid var(--line)",
        alignItems: "stretch",
      }}
      className="taller-banner"
    >
      {flip ? text : cover}
      {flip ? cover : text}
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
    warm: { bg: "rgba(255,255,255,0.9)", color: "#A85A2B" },
    hot: { bg: "rgba(255,255,255,0.9)", color: "#A85A2B" },
  };
  const m = map[variant];
  return (
    <span
      className="mono"
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        background: m.bg,
        color: m.color,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)" }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </span>
  );
}

function formatDateLong(d: Date): string {
  return d.toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
