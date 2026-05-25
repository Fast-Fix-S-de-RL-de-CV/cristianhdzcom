import { TIER_THRESHOLDS, type Tier } from "@/lib/experience";

/**
 * Helpers para decidir qué partes de un post son visibles a un viewer dado.
 *
 * Tres niveles de paywall:
 *
 *   1. **Visitante anónimo** → ve preview (300 chars del body), título,
 *      autor, counts. Body completo y adjuntos blureados con CTA "Regístrate
 *      gratis". El HTML sigue siendo crawleable por Google (mismo contenido
 *      llega al server), solo el preview es lo "decorado" para el browser.
 *
 *   2. **Registrado con tier < required** → ve body completo, pero adjuntos
 *      (PDFs, videos, links premium) blureados con CTA "Sube a {tier} para
 *      desbloquear los archivos".
 *
 *   3. **Registrado con tier ≥ required** → ve todo sin restricción.
 *
 * El "required" se calcula así:
 *   - Si el post tiene `minTierRequired` → ese es el bar.
 *   - Si no, pero el post tiene adjuntos → usa `authorTierAtPost`.
 *   - Si no tiene ni uno ni otro → libre para registrados.
 */

const TIER_ORDER: Tier[] = ["visitor", "bronze", "silver", "gold", "black"];

/** Compara dos tiers: returns true si `a` >= `b`. */
export function tierAtLeast(a: Tier, b: Tier): boolean {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b);
}

export type PostVisibility = {
  /** Puede ver el body completo. */
  canSeeBody: boolean;
  /** Puede ver los adjuntos (PDFs, links, videos). */
  canSeeAttachments: boolean;
  /** Por qué se le está mostrando un paywall — usado para el CTA copy. */
  reason: "ok" | "anonymous" | "below_min_tier" | "below_author_tier";
  /** Qué tier necesita para desbloquear (solo si reason !== 'ok'). */
  requiredTier: Tier | null;
};

export function getPostVisibility(opts: {
  viewerTier: Tier | null;
  postMinTierRequired: string | null;
  postAuthorTierAtPost: string | null;
  hasAttachments: boolean;
}): PostVisibility {
  const { viewerTier, postMinTierRequired, postAuthorTierAtPost, hasAttachments } = opts;

  // Anónimo: solo preview, todo lo demás blureado.
  if (!viewerTier || viewerTier === "visitor") {
    return {
      canSeeBody: false,
      canSeeAttachments: false,
      reason: "anonymous",
      requiredTier: "bronze", // necesita registrarse + comprar lo mínimo
    };
  }

  // Si el post tiene minTierRequired (override manual del admin) → es el bar
  if (postMinTierRequired) {
    const required = postMinTierRequired as Tier;
    if (!isTier(required)) return openVisibility();
    if (!tierAtLeast(viewerTier, required)) {
      return {
        canSeeBody: false,
        canSeeAttachments: false,
        reason: "below_min_tier",
        requiredTier: required,
      };
    }
  }

  // Adjuntos: si el post tiene adjuntos, usar el authorTierAtPost.
  // Si el viewer no califica, ve body pero no adjuntos.
  if (hasAttachments && postAuthorTierAtPost) {
    const authorTier = postAuthorTierAtPost as Tier;
    if (isTier(authorTier) && !tierAtLeast(viewerTier, authorTier)) {
      return {
        canSeeBody: true,
        canSeeAttachments: false,
        reason: "below_author_tier",
        requiredTier: authorTier,
      };
    }
  }

  return openVisibility();
}

function openVisibility(): PostVisibility {
  return { canSeeBody: true, canSeeAttachments: true, reason: "ok", requiredTier: null };
}

function isTier(s: string): s is Tier {
  return TIER_ORDER.includes(s as Tier);
}

/**
 * USD que le falta al viewer para alcanzar el tier requerido.
 * Útil para el CTA "Te faltan $X para desbloquear".
 */
export function usdToReachTier(viewerScore: number, target: Tier): number {
  const targetScore = TIER_THRESHOLDS[target].min;
  return Math.max(0, Math.ceil((targetScore - viewerScore) / 10));
}

/**
 * Preview del body para SEO + UI bloqueada. Corta en frase completa cuando
 * es posible, agrega "..." al final.
 */
export function buildPreview(body: string, maxLen = 300): string {
  if (!body) return "";
  if (body.length <= maxLen) return body;
  const cut = body.slice(0, maxLen);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > maxLen * 0.6) return cut.slice(0, lastDot + 1) + " …";
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace) + "…";
}
