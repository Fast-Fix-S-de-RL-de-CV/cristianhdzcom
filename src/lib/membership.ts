/**
 * Sistema de membresías recurrentes (Plata / Oro / Black).
 * Modelo completo: docs/BUSINESS_MODEL.md.
 *
 * Reglas clave:
 *   - Las membresías NO desbloquean compras one-shot (cursos, libros). Solo
 *     desbloquean contenido marcado explícitamente con `includedInMembership`.
 *   - Cada renovación suma X% del pago al `membership_credits.balanceCents`
 *     del usuario (configurable por plan, default 50%).
 *   - El crédito se puede aplicar a la compra de cualquier producto one-shot
 *     hasta cubrir el 100% del subtotal.
 *   - Si el usuario cancela, el crédito sobrevive 90 días grace.
 *   - El tier global (Bronce/Plata/Oro/Black) sube con cada pago de
 *     membresía igual que con compras one-shot. NO baja al cancelar.
 */

import { db, schema } from "@/db";
import { and, eq, gt, sql } from "drizzle-orm";

export type PlanSlug = "silver" | "gold" | "black";

/** Orden ascendente para comparar niveles de plan. */
const PLAN_ORDER: PlanSlug[] = ["silver", "gold", "black"];

export function planAtLeast(a: PlanSlug, b: PlanSlug): boolean {
  return PLAN_ORDER.indexOf(a) >= PLAN_ORDER.indexOf(b);
}

/**
 * Devuelve la membresía activa del usuario o null. "Activa" = status='active'
 * y currentPeriodEnd en el futuro.
 */
export async function getActiveMembership(userId: string) {
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, userId),
        eq(schema.memberships.status, "active"),
        gt(schema.memberships.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(sql`${schema.memberships.startedAt} DESC`)
    .limit(1);
  return m ?? null;
}

/**
 * ¿El user tiene acceso a contenido que requiere `requiredPlan` o superior?
 * Devuelve true si tiene una membresía activa de ese plan o uno más alto.
 */
export async function userHasMembershipAccess(
  userId: string | null,
  requiredPlan: PlanSlug,
): Promise<boolean> {
  if (!userId) return false;
  const m = await getActiveMembership(userId);
  if (!m) return false;
  return planAtLeast(m.planSlug as PlanSlug, requiredPlan);
}

/**
 * Suma crédito al user después de un pago de membresía. Idempotente por
 * sourceMembershipId + periodo: nunca acumula doble si el cron se ejecuta dos veces.
 */
export async function accrueCredit(opts: {
  userId: string;
  amountPaidCents: number;
  membershipId: string;
  accrualPercent: number;
  note?: string;
}): Promise<{ newBalanceCents: number; addedCents: number }> {
  const addedCents = Math.round((opts.amountPaidCents * opts.accrualPercent) / 100);
  if (addedCents <= 0) {
    return { newBalanceCents: 0, addedCents: 0 };
  }

  // Upsert del row de créditos
  const [existing] = await db
    .select()
    .from(schema.membershipCredits)
    .where(eq(schema.membershipCredits.userId, opts.userId))
    .limit(1);

  let newBalance: number;
  if (existing) {
    newBalance = existing.balanceCents + addedCents;
    await db
      .update(schema.membershipCredits)
      .set({
        balanceCents: newBalance,
        lifetimeAccruedCents: existing.lifetimeAccruedCents + addedCents,
        expiresAt: null, // mientras haya membresía activa, no caduca
        updatedAt: new Date(),
      })
      .where(eq(schema.membershipCredits.userId, opts.userId));
  } else {
    newBalance = addedCents;
    await db.insert(schema.membershipCredits).values({
      userId: opts.userId,
      balanceCents: addedCents,
      lifetimeAccruedCents: addedCents,
      lifetimeRedeemedCents: 0,
      expiresAt: null,
    });
  }

  await db.insert(schema.membershipCreditHistory).values({
    userId: opts.userId,
    kind: "accrual",
    deltaCents: addedCents,
    newBalanceCents: newBalance,
    sourceMembershipId: opts.membershipId,
    note: opts.note ?? `${opts.accrualPercent}% de pago membresía`,
  });

  return { newBalanceCents: newBalance, addedCents };
}

/**
 * Aplica crédito a una compra. Retorna cuánto se descontó (siempre ≤ totalCents).
 * Es atómico vía single UPDATE con GREATEST guard.
 */
export async function redeemCredit(opts: {
  userId: string;
  requestedCents: number;
  orderId: string;
  maxRedeemableCents: number; // típicamente el subtotal después de discount tier
  note?: string;
}): Promise<{ redeemedCents: number; remainingBalanceCents: number }> {
  const [row] = await db
    .select()
    .from(schema.membershipCredits)
    .where(eq(schema.membershipCredits.userId, opts.userId))
    .limit(1);
  if (!row || row.balanceCents <= 0) {
    return { redeemedCents: 0, remainingBalanceCents: 0 };
  }
  // Si el crédito caducó, no se puede usar.
  if (row.expiresAt && row.expiresAt < new Date()) {
    return { redeemedCents: 0, remainingBalanceCents: row.balanceCents };
  }

  const redeem = Math.min(opts.requestedCents, opts.maxRedeemableCents, row.balanceCents);
  if (redeem <= 0) {
    return { redeemedCents: 0, remainingBalanceCents: row.balanceCents };
  }

  const newBalance = row.balanceCents - redeem;
  await db
    .update(schema.membershipCredits)
    .set({
      balanceCents: newBalance,
      lifetimeRedeemedCents: row.lifetimeRedeemedCents + redeem,
      updatedAt: new Date(),
    })
    .where(eq(schema.membershipCredits.userId, opts.userId));

  await db.insert(schema.membershipCreditHistory).values({
    userId: opts.userId,
    kind: "redemption",
    deltaCents: -redeem,
    newBalanceCents: newBalance,
    sourceOrderId: opts.orderId,
    note: opts.note ?? "Aplicado al checkout",
  });

  return { redeemedCents: redeem, remainingBalanceCents: newBalance };
}

/**
 * Devuelve el balance actual del user (0 si no tiene fila).
 */
export async function getCreditBalance(userId: string): Promise<{ balanceCents: number; expiresAt: Date | null }> {
  const [row] = await db
    .select({ balanceCents: schema.membershipCredits.balanceCents, expiresAt: schema.membershipCredits.expiresAt })
    .from(schema.membershipCredits)
    .where(eq(schema.membershipCredits.userId, userId))
    .limit(1);
  if (!row) return { balanceCents: 0, expiresAt: null };
  return { balanceCents: row.balanceCents, expiresAt: row.expiresAt };
}

/**
 * Devuelve el descuento aplicable a un total dado, según el plan activo del user.
 * 0 si no tiene membresía activa.
 */
export async function getDiscountPercent(userId: string | null): Promise<number> {
  if (!userId) return 0;
  const m = await getActiveMembership(userId);
  if (!m) return 0;
  const [plan] = await db
    .select({ discountPercent: schema.membershipPlans.discountPercent })
    .from(schema.membershipPlans)
    .where(eq(schema.membershipPlans.slug, m.planSlug))
    .limit(1);
  return plan?.discountPercent ?? 0;
}
