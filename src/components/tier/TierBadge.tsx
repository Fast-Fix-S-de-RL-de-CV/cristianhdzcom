import { TIER_META, type Tier } from "@/lib/experience";

/**
 * Badge compacto del tier — usado en el sidebar del alumno, en la lista
 * de miembros, en la tabla de admin, en posts de la comunidad.
 */
export function TierBadge({
  tier,
  size = "sm",
  showEmoji = true,
}: {
  tier: Tier;
  size?: "xs" | "sm" | "md";
  showEmoji?: boolean;
}) {
  const meta = TIER_META[tier];
  const fontSize = size === "xs" ? 9 : size === "sm" ? 10 : 12;
  const padding = size === "xs" ? "2px 6px" : size === "sm" ? "3px 8px" : "5px 12px";
  return (
    <span
      className="mono"
      title={meta.description}
      style={{
        fontSize,
        padding,
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        fontWeight: 700,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {showEmoji && <span aria-hidden style={{ fontSize: fontSize + 2 }}>{meta.emoji}</span>}
      {meta.label.toUpperCase()}
    </span>
  );
}
