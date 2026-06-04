/**
 * Sistema de Tier Score & Membresía
 *
 * Modelo completo documentado en `docs/EXPERIENCE_MODEL.md`. Resumen:
 *
 *   Tier Score = min(100%, USD_pagado / $1000 × 100%)
 *
 *   $1 USD pagado → 10 puntos de score
 *   Tope: 10000 puntos = 100%
 *
 * Los tiers (Visitor → Bronze → Silver → Gold → Black) se derivan del score.
 *
 * Esta función es la única fuente de verdad. NUNCA actualizar `users.tier`
 * o `users.tierScore` manualmente — siempre vía `recomputeUserTier()` para
 * que el ledger quede consistente.
 */

import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";

export type Tier = "visitor" | "bronze" | "silver" | "gold" | "black";

export const TIER_THRESHOLDS: Record<Tier, { min: number; max: number; minUsd: number; maxUsd: number | null }> = {
  visitor: { min: 0, max: 0, minUsd: 0, maxUsd: 0 },
  bronze: { min: 1, max: 2499, minUsd: 1, maxUsd: 249 },
  silver: { min: 2500, max: 4999, minUsd: 250, maxUsd: 499 },
  gold: { min: 5000, max: 7899, minUsd: 500, maxUsd: 789 },
  black: { min: 7900, max: 10000, minUsd: 790, maxUsd: null },
};

export const TIER_META: Record<
  Tier,
  {
    label: string;
    emoji: string;
    color: string;
    bg: string;
    border: string;
    description: string;
  }
> = {
  visitor: {
    label: "Visitante",
    emoji: "🚪",
    color: "#6E7A91",
    bg: "rgba(110, 122, 145, 0.10)",
    border: "rgba(110, 122, 145, 0.25)",
    description: "Aún no eres parte. Compra cualquier producto para entrar.",
  },
  bronze: {
    label: "Bronce",
    emoji: "🥉",
    color: "#A85A2B",
    bg: "rgba(168, 90, 43, 0.10)",
    border: "rgba(168, 90, 43, 0.30)",
    description: "Cliente activo. Lees y comentas en la comunidad.",
  },
  silver: {
    label: "Plata",
    emoji: "🥈",
    color: "#5C6B82",
    bg: "rgba(92, 107, 130, 0.10)",
    border: "rgba(92, 107, 130, 0.30)",
    description: "Posteas, subes archivos hasta 5MB, ves perfiles privados.",
  },
  gold: {
    label: "Oro",
    emoji: "🥇",
    color: "#B88523",
    bg: "rgba(216, 168, 63, 0.14)",
    border: "rgba(216, 168, 63, 0.45)",
    description: "Mastermind Oro semanal. Acceso a contenido premium del feed.",
  },
  black: {
    label: "Black",
    emoji: "🖤",
    color: "#0B2548",
    bg: "rgba(6, 27, 54, 0.10)",
    border: "rgba(6, 27, 54, 0.30)",
    description: "Inner Circle. Llamada 1:1 mensual con Cristian. Acceso a TODO.",
  },
};

const TIER_ORDER: Tier[] = ["visitor", "bronze", "silver", "gold", "black"];

/* ─────────── Pure helpers (sin DB) ─────────── */

/** Convierte un score 0-10000 al tier correspondiente. */
export function tierFromScore(score: number): Tier {
  if (score >= TIER_THRESHOLDS.black.min) return "black";
  if (score >= TIER_THRESHOLDS.gold.min) return "gold";
  if (score >= TIER_THRESHOLDS.silver.min) return "silver";
  if (score >= TIER_THRESHOLDS.bronze.min) return "bronze";
  return "visitor";
}

/** El siguiente tier o `null` si ya estás en black. */
export function nextTier(current: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/**
 * Cuánto USD te falta para alcanzar el siguiente tier, dado tu score actual.
 * Devuelve null si ya estás en black.
 */
export function usdToNextTier(currentScore: number): number | null {
  const current = tierFromScore(currentScore);
  const next = nextTier(current);
  if (!next) return null;
  const nextThreshold = TIER_THRESHOLDS[next].min; // score points
  const pointsNeeded = Math.max(0, nextThreshold - currentScore);
  return Math.ceil(pointsNeeded / 10); // 10 points = $1
}

/** Convierte USD pagado total a score, capeado en 10000. */
export function scoreFromUsd(usd: number): number {
  return Math.min(10000, Math.max(0, Math.round(usd * 10)));
}

/** Convierte score (0-10000) a porcentaje legible (0-100, 1 decimal). */
export function scoreToPercent(score: number): number {
  return Math.round(score / 100 * 10) / 10;
}

/* ─────────── DB operations ─────────── */

/**
 * Recalcula el tier de un usuario desde cero, sumando todas sus orders
 * con status='succeeded'. Devuelve el nuevo score + tier + delta vs
 * el valor previo (útil para el ledger).
 *
 * Esta función es **idempotente**: llamarla 10 veces con la misma data
 * produce el mismo resultado. Por eso es safe llamarla después de cualquier
 * mutación de orders (compra, refund, etc.).
 */
export async function recomputeUserTier(
  userId: string,
  opts?: { reason?: string; sourceOrderId?: string },
): Promise<{ newScore: number; newTier: Tier; deltaScore: number; lifetimeSpendCents: number }> {
  // Sumar todas las orders pagadas del user.
  const [agg] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.orders.totalCents}), 0)::int`,
    })
    .from(schema.orders)
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "succeeded")));

  const lifetimeSpendCents = Number(agg?.total ?? 0);
  const usdPaid = lifetimeSpendCents / 100;
  const newScore = scoreFromUsd(usdPaid);
  const newTier = tierFromScore(newScore);

  // Leer el score previo para calcular delta.
  const [prev] = await db
    .select({ tierScore: schema.users.tierScore })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const prevScore = prev?.tierScore ?? 0;
  const deltaScore = newScore - prevScore;

  // Update user.
  await db
    .update(schema.users)
    .set({
      tierScore: newScore,
      tier: newTier,
      lifetimeSpendCents,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  // Log al ledger SOLO si hubo cambio (evita ruido).
  if (deltaScore !== 0) {
    await db.insert(schema.experienceLedger).values({
      userId,
      deltaScore,
      newScore,
      reason: opts?.reason ?? "recompute",
      sourceOrderId: opts?.sourceOrderId ?? null,
    });
  }

  return { newScore, newTier, deltaScore, lifetimeSpendCents };
}

/**
 * Backfill para correr una sola vez sobre la DB existente. Itera todos los
 * users con orders y recomputa su tier desde cero. Devuelve { processed, ...stats }.
 */
export async function backfillAllTiers(): Promise<{
  processed: number;
  byTier: Record<Tier, number>;
}> {
  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users);

  const byTier: Record<Tier, number> = {
    visitor: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
    black: 0,
  };
  let processed = 0;

  for (const u of users) {
    const { newTier } = await recomputeUserTier(u.id, { reason: "backfill" });
    byTier[newTier]++;
    processed++;
  }

  return { processed, byTier };
}
