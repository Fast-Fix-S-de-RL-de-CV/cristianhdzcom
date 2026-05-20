/**
 * Money helpers. We store all program prices as **integer** (units of the
 * currency, never cents) because most of our currencies don't have decimal
 * pricing at this scale (you don't sell a course for $99.50 USD).
 *
 * Currencies supported today:
 *   - USD: $99 USD
 *   - MXN: $1,800 MXN
 *   - EUR: €99 EUR
 *
 * Adding a new currency = adding a row to CURRENCY_META.
 */

export type Currency = "USD" | "MXN" | "EUR";

export const SUPPORTED_CURRENCIES: Currency[] = ["USD", "MXN", "EUR"];

export const CURRENCY_META: Record<
  Currency,
  { symbol: string; locale: string; label: string }
> = {
  USD: { symbol: "$", locale: "en-US", label: "USD · Dólar" },
  MXN: { symbol: "$", locale: "es-MX", label: "MXN · Peso mexicano" },
  EUR: { symbol: "€", locale: "es-ES", label: "EUR · Euro" },
};

/**
 * Formats `1800` + `MXN` → `"$1,800 MXN"`.
 * Formats `99`   + `USD` → `"$99 USD"`.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: Currency = "USD",
  opts: { withCurrency?: boolean; minimumFractionDigits?: number } = {},
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const formatted = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: opts.minimumFractionDigits ?? 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const out = `${meta.symbol}${formatted}`;
  return opts.withCurrency === false ? out : `${out} ${currency}`;
}

/** Just the number, locale-grouped, no symbol. Useful inside <input>. */
export function formatGrouping(amount: number | null | undefined, currency: Currency = "USD"): string {
  if (amount == null || Number.isNaN(amount)) return "";
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  return new Intl.NumberFormat(meta.locale, { maximumFractionDigits: 0 }).format(amount);
}

/** Parse a user-typed string into an integer (strips $, spaces, commas, dots). */
export function parseAmount(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d-]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Smart auto-suggestions for the full pricing strategy given a base price.
 * Used when the admin enters the "price único" and we pre-fill the other
 * fields with sensible defaults.
 */
export function suggestPricing(basePrice: number): {
  priceCompare: number;
  installmentCount: number;
  installmentPrice: number;
  pricePerMonth: number;
  pricePerYear: number;
} {
  // Anchor (tachado) = 1.7× base, rounded up to a "psychological" number.
  const priceCompare = roundUpPretty(Math.round(basePrice * 1.7));
  // Default plan = 6 monthly payments with a +15% markup over base.
  const installmentCount = 6;
  const installmentPrice = roundUpPretty(Math.round((basePrice * 1.15) / installmentCount));
  // Monthly sub assumes 18 months retention → price ≈ base / 12 * 1.25
  const pricePerMonth = roundUpPretty(Math.round(basePrice / 12 + basePrice * 0.04));
  // Yearly sub = 10 months of the monthly price (2 months off as "anchor")
  const pricePerYear = roundUpPretty(Math.round(pricePerMonth * 10));
  return { priceCompare, installmentCount, installmentPrice, pricePerMonth, pricePerYear };
}

function roundUpPretty(n: number): number {
  if (n <= 0) return 0;
  if (n < 20) return n;
  if (n < 200) return Math.ceil(n / 5) * 5;
  if (n < 2000) return Math.ceil(n / 10) * 10;
  if (n < 20_000) return Math.ceil(n / 50) * 50;
  return Math.ceil(n / 100) * 100;
}
