/**
 * SVG icons for the sendero nodes. Six variants, each drawn inline so it
 * inherits stroke/fill via CSS. We avoid emoji on purpose — at the visual
 * weight the path nodes use (~90px circles), emojis look amateur.
 */
export type ModuleIconKind =
  | "play"       // current module
  | "gauge"      // performance / data
  | "pulse"      // observability / project
  | "boxes"      // background jobs / cubes
  | "clipboard"  // testing
  | "chest"      // security / boss project
  | "flag"       // start
  | "trophy";    // finished

export function ModuleSvgIcon({
  kind,
  size = 36,
  color = "white",
}: {
  kind: ModuleIconKind;
  size?: number;
  color?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "block" },
  };
  switch (kind) {
    case "play":
      return (
        <svg {...common}>
          <polygon points="8,4.5 20,12 8,19.5" fill={color} stroke="none" />
        </svg>
      );
    case "gauge":
      return (
        <svg {...common}>
          <path d="M4 17a8 8 0 1 1 16 0" />
          <line x1="12" y1="17" x2="16.5" y2="8.5" />
          <circle cx="12" cy="17" r="1.4" fill={color} stroke="none" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...common} strokeWidth={2.4}>
          <polyline points="2,12 6,12 9,5 13,19 16,12 22,12" />
        </svg>
      );
    case "boxes":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.2" />
          <rect x="13" y="4" width="7" height="7" rx="1.2" />
          <rect x="4" y="13" width="7" height="7" rx="1.2" />
          <rect x="13" y="13" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="16" rx="2" />
          <rect x="9" y="3" width="6" height="4" rx="1" fill={color} stroke="none" />
          <polyline points="8.5,13 11,15.5 15.5,10.5" />
        </svg>
      );
    case "chest":
      return (
        <svg {...common}>
          <rect x="3" y="10" width="18" height="11" rx="1.4" />
          <path d="M3 10 a 9 6 0 0 1 18 0" />
          <line x1="12" y1="10" x2="12" y2="21" />
          <rect x="10.5" y="13.5" width="3" height="2.5" rx="0.4" fill={color} stroke="none" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <line x1="6" y1="3" x2="6" y2="22" />
          <path d="M6 4 L18 5.5 L15 9 L18 12 L6 11 Z" fill={color} stroke="none" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 4 h10 v5 a5 5 0 0 1 -10 0 z" />
          <path d="M7 6 H4 a0 0 0 0 0 0 0 a3 3 0 0 0 3 3" />
          <path d="M17 6 h3 a0 0 0 0 1 0 0 a3 3 0 0 1 -3 3" />
          <path d="M9 21 h6" />
          <path d="M12 14 v7" />
        </svg>
      );
  }
}

/** Small overlay shown in the corner of the node. */
export function NodeBadgeIcon({ kind, size = 14 }: { kind: "check" | "lock"; size?: number }) {
  if (kind === "check") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="5,12 10,17 19,7" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      stroke="white"
      strokeWidth={1.5}
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" strokeLinecap="round" />
    </svg>
  );
}
