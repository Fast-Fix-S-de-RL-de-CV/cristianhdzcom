import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { recomputeUserTier } from "@/lib/experience";
import { accrueCredit, type PlanSlug } from "@/lib/membership";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/checkout/membership
 *
 * Crea (o reanuda) una suscripción a un plan de membresía. Mismo patrón
 * que /api/checkout/book: si el comprador no tiene cuenta, se la creamos
 * automáticamente y lo dejamos logueado.
 *
 * Body: { planSlug, billingCycle, buyer: { name, email } }
 *
 * En modo demo (sin STRIPE_SECRET_KEY): marca la membresía como `active`
 * con currentPeriodEnd = ahora + 30 días (o 365 días si yearly).
 * Acumula crédito desde el primer pago.
 */
const Body = z.object({
  planSlug: z.enum(["silver", "gold", "black"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  buyer: z.object({
    name: z.string().min(2).max(200),
    email: z.string().email().toLowerCase().trim(),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const { planSlug, billingCycle, buyer } = parsed.data;

  // 1. Cargar el plan
  const [plan] = await db
    .select()
    .from(schema.membershipPlans)
    .where(and(eq(schema.membershipPlans.slug, planSlug), eq(schema.membershipPlans.isActive, true)))
    .limit(1);
  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  // 2. Validar cupo (Black tiene maxSeats = 50)
  if (plan.maxSeats != null && plan.activeMembers >= plan.maxSeats) {
    return NextResponse.json(
      {
        error: "seats_full",
        message: `Cupo agotado en ${plan.label} (${plan.maxSeats} miembros). Únete a la lista de espera.`,
      },
      { status: 409 },
    );
  }

  // 3. Resolver user_id (auto-crear si no existe)
  const me = await getCurrentUser();
  let userId: string;
  let createdNewAccount = false;
  let tempPassword: string | null = null;

  if (me) {
    userId = me.id;
  } else {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${buyer.email}`)
      .limit(1);
    if (existingUser) {
      userId = existingUser.id;
    } else {
      tempPassword = nanoid(12);
      const passwordHash = await hashPassword(tempPassword);
      const [created] = await db
        .insert(schema.users)
        .values({
          email: buyer.email,
          name: buyer.name,
          passwordHash,
          role: "member",
        })
        .returning({ id: schema.users.id });
      userId = created.id;
      createdNewAccount = true;
      await createSession(userId);
    }
  }

  // 4. ¿Ya tiene una membresía activa? Si sí, evita dobles.
  const [existing] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.status, "active")))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      {
        error: "already_subscribed",
        message: `Ya tienes una suscripción activa de ${existing.planSlug}. Cancela primero desde /cuenta/membresia.`,
      },
      { status: 409 },
    );
  }

  // 5. Precio
  const priceUsd =
    billingCycle === "yearly" && plan.priceUsdYearly ? plan.priceUsdYearly : plan.priceUsdMonthly;
  const totalCents = priceUsd * 100;

  // 6. Calcular currentPeriodEnd
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // 7. Crear orden + suscripción + acumular crédito + sumar al cupo
  // (En prod con Stripe esto sería un PaymentIntent. Aquí va directo a succeeded.)
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      email: buyer.email,
      name: buyer.name,
      status: "succeeded",
      subtotalCents: totalCents,
      totalCents,
      currency: "usd",
      paymentMethod: "card",
      metadata: {
        kind: "membership",
        planSlug,
        billingCycle,
        planLabel: plan.label,
      } as Record<string, unknown>,
      paidAt: now,
    })
    .returning();

  const [membership] = await db
    .insert(schema.memberships)
    .values({
      userId,
      planSlug,
      status: "active",
      billingCycle,
      priceUsd,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    })
    .returning();

  // 8. Incrementar activeMembers del plan (denormalizado para queries rápidas)
  await db
    .update(schema.membershipPlans)
    .set({ activeMembers: sql`${schema.membershipPlans.activeMembers} + 1` })
    .where(eq(schema.membershipPlans.id, plan.id));

  // 9. Acumular crédito del primer pago
  const { addedCents } = await accrueCredit({
    userId,
    amountPaidCents: totalCents,
    membershipId: membership.id,
    accrualPercent: plan.creditAccrualPercent,
    note: `Pago inicial ${plan.label} ${billingCycle}`,
  });

  // 10. Recalcular tier del user (cada $ cuenta hacia Bronce/Plata/Oro/Black)
  await recomputeUserTier(userId, { reason: "order_paid", sourceOrderId: order.id }).catch(() => {});

  // 11. Activity log + email
  await db
    .insert(schema.activity)
    .values({
      kind: "membership",
      icon: plan.emoji,
      text: `${buyer.name.split(" ")[0]} se unió a ${plan.label} ${billingCycle === "yearly" ? "anual" : ""}`.trim(),
      color: plan.badgeColor ?? "var(--accent)",
    })
    .catch(() => undefined);

  sendEmail({
    to: buyer.email,
    subject: `Bienvenido a ${plan.label} ${plan.emoji}`,
    html: membershipWelcomeEmailHtml({
      firstName: buyer.name.split(" ")[0],
      planLabel: plan.label,
      planEmoji: plan.emoji,
      billingCycle,
      priceUsd,
      tempPassword,
      creditAdded: Math.round(addedCents / 100),
    }),
  }).catch((err) => console.error("[checkout/membership] email failed:", err));

  return NextResponse.json({
    ok: true,
    membershipId: membership.id,
    orderId: order.id,
    createdNewAccount,
    redirectTo: `/cuenta/membresia?welcome=${planSlug}${createdNewAccount ? "&new=1" : ""}`,
  });
}

/* ─────────── Email template ─────────── */

function membershipWelcomeEmailHtml(opts: {
  firstName: string;
  planLabel: string;
  planEmoji: string;
  billingCycle: string;
  priceUsd: number;
  tempPassword: string | null;
  creditAdded: number;
}): string {
  const { firstName, planLabel, planEmoji, billingCycle, priceUsd, tempPassword, creditAdded } = opts;
  const passwordBlock = tempPassword
    ? `<div style="margin:20px 0;padding:14px 18px;background:#F4EDD9;border:1px solid #D8A83F;border-radius:10px;">
        <p style="margin:0 0 6px;font-size:12px;color:#1A3458;font-weight:600;">🔑 Tu cuenta está lista</p>
        <p style="margin:0;font-size:12px;color:#1A3458;line-height:1.5;">Contraseña temporal: <code style="background:white;padding:4px 8px;border-radius:4px;border:1px solid #D9D2BF;">${tempPassword}</code></p>
        <p style="margin:8px 0 0;font-size:11px;color:#6E7A91;">Cámbiala en cristianhdz.com/cuenta</p>
      </div>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;margin:0;padding:24px;background:#F8F4E6;color:#1A3458;">
    <div style="max-width:600px;margin:0 auto;background:white;padding:32px;border-radius:14px;">
      <div style="font-size:48px;margin-bottom:16px;">${planEmoji}</div>
      <h1 style="font-size:28px;margin:0 0 12px;color:#0B2548;">¡Bienvenido a ${planLabel}, ${firstName}!</h1>
      <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
        Tu suscripción <strong>${planLabel} ${billingCycle === "yearly" ? "anual" : "mensual"}</strong> está activa por <strong>$${priceUsd} USD</strong>.
      </p>
      ${passwordBlock}
      ${creditAdded > 0 ? `<div style="margin:20px 0;padding:14px 18px;background:#E8F5E8;border-left:3px solid #2da064;border-radius:6px;">
        <p style="margin:0;font-size:13px;color:#1A3458;"><strong>💰 +$${creditAdded} de crédito acumulado.</strong></p>
        <p style="margin:6px 0 0;font-size:12px;color:#6E7A91;">Lo puedes aplicar a cualquier curso, libro o consultoría. Se acumula cada mes que renueves.</p>
      </div>` : ""}
      <div style="text-align:center;margin:28px 0;">
        <a href="https://cristianhdz.com/comunidad" style="display:inline-block;background:#0B2548;color:#FAF3DC;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          Entrar a la comunidad →
        </a>
      </div>
      <p style="font-size:13px;color:#6E7A91;line-height:1.6;margin:16px 0 0;">
        Algún problema, escríbeme a <a href="mailto:info@cristianhdz.com" style="color:#D8A83F;font-weight:600;">info@cristianhdz.com</a>.
      </p>
    </div></body></html>`;
}
