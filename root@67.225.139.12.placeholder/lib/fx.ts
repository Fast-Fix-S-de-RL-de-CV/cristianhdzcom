/**
 * Conversión de moneda para cobranza en Stripe.
 *
 * El sitio mantiene precios en USD como single source of truth (todos los
 * cursos, libros y planes están priced en USD en DB). Pero Stripe en LATAM
 * sólo activa OXXO + SPEI cuando la session está en MXN.
 *
 * Solución: creamos las Stripe Checkout Sessions en MXN convirtiendo USD
 * → MXN al vuelo con una tasa fija conservadora. Las orders en DB siguen
 * guardando `totalCents` en USD cents (reporting, tier, leaderboards no
 * cambian). En `metadata.stripeChargeMxnCents` guardamos lo realmente
 * cobrado en pesos para auditoría/reconciliación.
 *
 * Tasa conservadora: 1 USD = 18 MXN.
 *   - Hoy (may 2026) USD/MXN ~17.0–17.5 → cobramos 3% extra ≈ cubre la
 *     comisión de Stripe (3.6% + IVA).
 *   - Si el peso se devalúa, podemos subir esta constante sin tocar
 *     precios públicos.
 *   - Si se aprecia mucho, ganamos más margen.
 */

export const MXN_PER_USD = 18;

/** Convierte USD cents → MXN cents redondeando hacia arriba. */
export function usdCentsToMxnCents(usdCents: number): number {
  return Math.ceil(usdCents * MXN_PER_USD);
}

/** Convierte USD enteros → MXN cents. */
export function usdToMxnCents(usd: number): number {
  return Math.ceil(usd * MXN_PER_USD * 100);
}
