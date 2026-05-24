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
};

/**
 * Renders a program's cover (uploaded image or video) with a graceful fallback.
 * The fallback preserves the existing visual rhythm of cards using the big
 * serif numeral (01, 02, 03…) when no media is set.
 *
 * - `image`  →  responsive <img> with object-fit: cover
 * - `video`  →  muted, autoplaying loop (acts as animated cover)
 * - empty    →  placeholder block with the `fallback` text in serif
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
}: Props) {
  const wrapperStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius,
    width: "100%",
    ...(height ? { height } : null),
    ...(aspectRatio ? { aspectRatio } : null),
    ...(bottomDivider ? { borderBottom: "1px solid var(--line)" } : null),
    ...style,
  };

  // Real cover present → render media.
  if (coverUrl && coverUrl.trim() !== "") {
    if (coverKind === "video") {
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
    // Default to image (image, or any non-video kind).
    return (
      <div style={wrapperStyle} className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
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
