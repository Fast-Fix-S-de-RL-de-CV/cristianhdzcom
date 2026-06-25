/**
 * Tiny video URL parser. Only Vimeo and YouTube are supported today; the
 * shape is generic so we can plug Wistia / Mux later without changing
 * call sites.
 */
export type ParsedVideo = { provider: "vimeo" | "youtube"; id: string };

const VIMEO_RE = [
  /player\.vimeo\.com\/video\/(\d+)/i,
  // URLs de gestión / canales / grupos del dashboard de Vimeo.
  /vimeo\.com\/(?:manage\/videos|channels\/[\w-]+|groups\/[\w-]+\/videos|album\/\d+\/video|video)\/(\d+)/i,
  // URL pública normal (incluye unlisted con hash: vimeo.com/123456/abcdef).
  /vimeo\.com\/(\d+)/i,
];
const YT_RE = [
  /youtube\.com\/watch\?v=([\w-]{6,})/i,
  /youtu\.be\/([\w-]{6,})/i,
  /youtube\.com\/embed\/([\w-]{6,})/i,
  /youtube\.com\/shorts\/([\w-]{6,})/i,
  /youtube\.com\/live\/([\w-]{6,})/i,
  /youtube\.com\/v\/([\w-]{6,})/i,
];

export function parseVideoUrl(input: string): ParsedVideo | null {
  if (!input) return null;
  const trimmed = input.trim();
  for (const re of VIMEO_RE) {
    const m = trimmed.match(re);
    if (m && m[1]) return { provider: "vimeo", id: m[1] };
  }
  for (const re of YT_RE) {
    const m = trimmed.match(re);
    if (m && m[1]) return { provider: "youtube", id: m[1] };
  }
  return null;
}

/** Build an embeddable iframe URL for the given provider/id. */
export function embedUrl(provider: string, id: string): string {
  if (provider === "vimeo") {
    return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&color=C9A227`;
  }
  if (provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  }
  return "";
}

/**
 * Build a *background* embed URL for a video used as a card cover: autoplay,
 * muted, looped, no controls. Returns null when the input doesn't parse to a
 * known provider (so the caller falls back to the gradient cover).
 */
export function coverEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = parseVideoUrl(input);
  if (!v) return null;
  if (v.provider === "vimeo") {
    // background=1 implica autoplay + loop + muted + sin controles.
    return `https://player.vimeo.com/video/${v.id}?background=1&dnt=1`;
  }
  return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&loop=1&playlist=${v.id}&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1`;
}
