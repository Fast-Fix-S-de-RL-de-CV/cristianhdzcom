import Link from "next/link";
import {
  TIER_META,
  TIER_THRESHOLDS,
  nextTier,
  scoreToPercent,
  tierFromScore,
  usdToNextTier,
  type Tier,
} from "@/lib/experience";

/**
 * Card grande "Tu Tier" para usar en /cuenta. Muestra el tier actual,
 * la barra 0-100%, próximo tier y CTA "ver productos para subir".
 */
export function TierProgressCard({
  tier,
  tierScore,
  lifetimeSpendCents,
}: {
  tier: Tier;
  tierScore: number;
  lifetimeSpendCents: number;
}) {
  const meta = TIER_META[tier];
  const percent = scoreToPercent(tierScore);
  const lifetimeUsd = Math.round(lifetimeSpendCents / 100);
  const upcoming = nextTier(tier);
  const toNext = usdToNextTier(tierScore);

  return (
    <div
      style={{
        padding: 28,
        borderRadius: 16,
        background: `linear-gradient(180deg, ${meta.bg}, white 70%)`,
        border: `1px solid ${meta.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header con tier actual */}
      <div
        className="row"
        style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            TU NIVEL ACTUAL
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 38 }}>{meta.emoji}</span>
            <div>
              <div className="serif" style={{ fontSize: 32, color: meta.color, lineHeight: 1 }}>
                {meta.label}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {percent.toFixed(1)}% · ${lifetimeUsd.toLocaleString("es-MX")} invertidos
              </div>
            </div>
          </div>
        </div>
        {upcoming && toNext != null && toNext > 0 && (
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
              SIGUIENTE
            </div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>
              {TIER_META[upcoming].emoji} {TIER_META[upcoming].label}
            </div>
            <div className="mono" style={{ fontSize: 11, color: meta.color, marginTop: 2, fontWeight: 700 }}>
              ${toNext} para subir
            </div>
          </div>
        )}
      </div>

      {/* Barra 0-100% */}
      <div
        style={{
          height: 14,
          background: "rgba(15, 17, 21, 0.08)",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 10,
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, percent)}%`,
            background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}cc 100%)`,
            borderRadius: 999,
            transition: "width 600ms",
          }}
        />
        {/* Marcadores de los tiers */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          {[25, 50, 79].map((p) => (
            <div
              key={p}
              style={{
                position: "absolute",
                left: `${p}%`,
                top: -3,
                width: 1,
                height: 20,
                background: "rgba(15, 17, 21, 0.25)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Etiquetas de tiers debajo */}
      <div className="row" style={{ justifyContent: "space-between", marginTop: 6, marginBottom: 18 }}>
        {(["bronze", "silver", "gold", "black"] as Tier[]).map((t) => {
          const reached = TIER_THRESHOLDS[t].min <= tierScore;
          const m = TIER_META[t];
          return (
            <div
              key={t}
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: reached ? m.color : "var(--muted)",
                opacity: reached ? 1 : 0.5,
                fontWeight: reached ? 700 : 500,
                letterSpacing: "0.04em",
              }}
            >
              {m.emoji} {m.label.toUpperCase()}
              <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 400, marginTop: 1 }}>
                ${TIER_THRESHOLDS[t].minUsd}+
              </div>
            </div>
          );
        })}
      </div>

      {/* Descripción + CTA */}
      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: "white",
          border: "1px solid var(--line)",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.5,
        }}
      >
        {meta.description}
      </div>

      {upcoming && toNext != null && toNext > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/programas"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: meta.color,
              color: "white",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Subir a {TIER_META[upcoming].label} →
          </Link>
          <Link
            href="/libros"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: "white",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ver libros
          </Link>
        </div>
      )}
    </div>
  );
}
