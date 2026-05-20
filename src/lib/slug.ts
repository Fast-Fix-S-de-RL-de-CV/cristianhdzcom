/**
 * Slugify utilities.
 *
 * - `slugify` turns any text into a URL-safe lowercase slug:
 *      "Aprende a programar con IA" → "aprende-a-programar-con-ia"
 *      "Diseño UX/UI 2026" → "diseno-ux-ui-2026"
 *
 * - `sanitizeSlugInput` is the milder version applied LIVE as the user
 *   types inside the slug field, so the displayed value stays valid while
 *   still letting them tweak it. It strips invalid chars but doesn't
 *   collapse spaces (it just turns them into dashes) so cursor position
 *   stays predictable.
 *
 * - `isValidSlug` mirrors the server regex for client-side feedback.
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

/** Normalize-and-strip accents (NFD form + remove combining marks). */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Full slugify: produces a canonical slug from any title.
 * Always returns a valid string for `isValidSlug` (or empty if input is
 * blank/only-symbols).
 */
export function slugify(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9\s-]/g, " ") // drop everything that isn't a-z, 0-9, space, dash
    .trim()
    .replace(/[\s_]+/g, "-")        // spaces/underscores → dash
    .replace(/-+/g, "-")            // collapse dashes
    .replace(/^-|-$/g, "")          // trim leading/trailing dash
    .slice(0, 80);                  // hard cap to match DB column
}

/**
 * Less aggressive sanitizer for live typing in the slug field. Lowercases,
 * strips accents and invalid chars, replaces spaces with dashes, but does
 * NOT collapse multiple dashes (so the user can still see what they typed).
 */
export function sanitizeSlugInput(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
