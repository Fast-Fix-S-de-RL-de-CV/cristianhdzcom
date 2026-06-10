/**
 * Cliente Stripe y helpers de finalización idempotente.
 *
 * Flujo general:
 *  1. Frontend → POST /api/checkout(/book|/membership)
 *  2. Server crea Stripe Checkout Session con metadata { kind, ...payload }
 *     y devuelve { url } al frontend.
 *  3. Frontend → window.location = url → user paga en Stripe.
 *  4. Stripe → POST /api/stripe/webhook con `checkout.session.completed`.
 *  5. Webhook (o la página de confirmación como fallback) llama a
 *     finalizeCheckoutSession(session), que:
 *       - Para programas/libros crea/encuentra el Order (idempotente).
 *       - Para membresías crea/encuentra la Membership.
 *       - Crea cuenta si no existe, abre sesión si es el comprador.
 *       - Acumula crédito, recalcula tier, mete actividad y manda email.
 *
 * IDempotencia: la búsqueda usa metadata->>'stripeSessionId' contra el id
 * de la session. Si ya existe un order con ese session id, no se duplica.
 */

import Stripe from "stripe";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "@/lib/auth";
import { recomputeUserTier } from "@/lib/experience";
import { accrueCredit, type PlanSlug } from "@/lib/membership";
import { basePrice } from "@/lib/book-bumps";
import { bookPurchaseEmailHtml, purchaseAccessEmailHtml, sendEmail } from "@/lib/email";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

/**
 * Singleton del cliente. Si la env var no está set, `getStripe` lanza un
 * error claro — el caller decide cómo responder (típicamente 503).
 */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurado. Configura .env del servidor.",
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(SECRET_KEY, {
      // Pin a la versión que el SDK instalado declara como default.
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export function isStripeLive(): boolean {
  return SECRET_KEY.startsWith("sk_live_");
}

export function isStripeConfigured(): boolean {
  return SECRET_KEY.length > 0;
}

/* ─────────── URLs base para success/cancel ─────────── */
export function siteUrl(): string {
  const v =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "https://cristianhdz.com";
  return v.replace(/\/$/, "");
}

/* ─────────── Tipos compartidos para metadata ─────────── */
export type ProgramCheckoutMeta = {
  kind: "program";
  programId: string;
  buyerName: string;
  buyerEmail: string;
  country?: string;
  phone?: string;
  bumpsJson: string; // JSON.stringify de [{id,title,priceCents}]
  couponCode?: string;
};

export type BookCheckoutMeta = {
  kind: "book";
  bookSlug: string;
  bookTitle: string;
  format: "digital" | "physical" | "bundle";
  buyerName: string;
  buyerEmail: string;
  shippingJson?: string; // JSON.stringify de shipping address si aplica
  bumpsJson: string; // JSON.stringify de [{slug,variant,priceUsd,title}]
};

export type MembershipCheckoutMeta = {
  kind: "membership";
  planSlug: PlanSlug;
  billingCycle: "monthly" | "yearly";
  buyerName: string;
  buyerEmail: string;
};

/* ─────────── Resolver / crear user desde un email ─────────── */
/**
 * Obtiene o crea un user por email. Devuelve { userId, createdNewAccount, tempPassword }.
 * `tempPassword` solo viene set cuando se creó la cuenta en este call.
 */
async function resolveUserByEmail(email: string, name: string): Promise<{
  userId: string;
  createdNewAccount: boolean;
  tempPassword: string | null;
}> {
  const lower = email.toLowerCase();
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${lower}`)
    .limit(1);
  if (existing) return { userId: existing.id, createdNewAccount: false, tempPassword: null };

  const tempPassword = nanoid(12);
  const passwordHash = await hashPassword(tempPassword);
  const [created] = await db
    .insert(schema.users)
    .values({ email: lower, name, passwordHash, role: "member" })
    .returning({ id: schema.users.id });
  return { userId: created.id, createdNewAccount: true, tempPassword };
}

/* ─────────── Buscar order ya creado por session id (idempotencia) ─────────── */
async function findOrderBySessionId(sessionId: string) {
  const [row] = await db
    .select()
    .from(schema.orders)
    .where(sql`${schema.orders.metadata}->>'stripeSessionId' = ${sessionId}`)
    .limit(1);
  return row ?? null;
}

async function findMembershipBySessionId(sessionId: string) {
  // Membresía guarda session id en metadata del order asociado.
  const order = await findOrderBySessionId(sessionId);
  if (!order) return null;
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(eq(schema.memberships.userId, order.userId!))
    .orderBy(sql`${schema.memberships.startedAt} DESC`)
    .limit(1);
  return m ?? null;
}

/* ─────────── Finalizar una session (idempotente) ─────────── */
/**
 * Procesa una Stripe Checkout Session completada. Idempotente: si ya se
 * procesó (existe order con session.id en metadata), retorna lo previo.
 *
 * Llamada desde:
 *  - El webhook `/api/stripe/webhook` (canónico, server-to-server).
 *  - Las páginas de confirmación como fallback ante race del webhook.
 */
export async function finalizeCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{
  orderId: string;
  kind: "program" | "book" | "membership";
  createdNewAccount: boolean;
}> {
  // Si la session no está pagada (cancel/expired/incomplete), no procesar.
  if (
    session.payment_status !== "paid" &&
    // Para mode=subscription, payment_status puede ser "no_payment_required"
    // y la suscripción se considera activa via subscription object.
    session.mode !== "subscription"
  ) {
    throw new Error(`session_not_paid_${session.payment_status}`);
  }

  // Serializar webhook vs página de confirmación / finish: ambos pueden
  // llegar en el mismo instante. El advisory lock por session id hace que
  // el segundo espere a que el primero commitee, y el re-check dentro del
  // lock garantiza que no se dupliquen orders/crédito/cupones.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${session.id}))`);

    // ¿Ya se procesó? (re-check DENTRO del lock)
    const existing = await findOrderBySessionId(session.id);
    if (existing) {
      const meta = (existing.metadata ?? {}) as { kind?: "program" | "book" | "membership" };
      return {
        orderId: existing.id,
        kind: meta.kind ?? "program",
        createdNewAccount: false,
      };
    }

    const meta = session.metadata ?? {};
    const kind = meta.kind as "program" | "book" | "membership" | undefined;
    if (!kind) throw new Error("session_missing_metadata_kind");

    if (kind === "program") return finalizeProgramOrder(session);
    if (kind === "book") return finalizeBookOrder(session);
    if (kind === "membership") return finalizeMembershipOrder(session);
    throw new Error(`unknown_kind_${kind}`);
  });
}

/* ────────────────── PROGRAM ────────────────── */
async function finalizeProgramOrder(session: Stripe.Checkout.Session) {
  const m = (session.metadata ?? {}) as Record<string, string>;
  const programId = m.programId;
  const buyerName = m.buyerName ?? "";
  const buyerEmail = (m.buyerEmail ?? "").toLowerCase();
  const country = m.country || undefined;
  const phone = m.phone || undefined;
  const couponCode = m.couponCode || undefined;
  const bumps = m.bumpsJson ? (JSON.parse(m.bumpsJson) as Array<{ id: string; title: string; priceCents: number }>) : [];

  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.id, programId))
    .limit(1);
  if (!program) throw new Error("program_not_found");

  // Resolver user.
  const resolved = await resolveUserByEmail(buyerEmail, buyerName);

  // Persistir country/phone si vinieron y la cuenta es nueva (no pisamos datos existentes).
  if (resolved.createdNewAccount && (country || phone)) {
    await db
      .update(schema.users)
      .set({ country: country ?? null, phone: phone ?? null })
      .where(eq(schema.users.id, resolved.userId));
  }

  const bumpsCents = bumps.reduce((s, b) => s + (b.priceCents ?? 0), 0);
  const subtotalCents = program.priceUsd * 100 + bumpsCents;

  let discountCents = 0;
  if (couponCode) {
    const code = couponCode.toUpperCase();
    const [coupon] = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.code, code))
      .limit(1);
    if (coupon?.active) {
      // Consumir un uso de forma atómica. Si usesLeft es null → ilimitado
      // (no se decrementa). Si es un entero, el WHERE uses_left > 0 evita
      // canjes de más en condiciones de carrera; solo aplicamos el descuento
      // si el consumo tuvo éxito (o si es ilimitado).
      let canApply = coupon.usesLeft == null;
      if (coupon.usesLeft != null) {
        const consumed = await db
          .update(schema.coupons)
          .set({ usesLeft: sql`${schema.coupons.usesLeft} - 1` })
          .where(and(eq(schema.coupons.code, code), sql`${schema.coupons.usesLeft} > 0`))
          .returning({ id: schema.coupons.id });
        canApply = consumed.length > 0;
      }
      if (canApply) {
        discountCents =
          coupon.kind === "amount"
            ? coupon.value
            : Math.round((subtotalCents * coupon.value) / 100);
      }
    }
  }
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: resolved.userId,
      email: buyerEmail,
      name: buyerName,
      programId: program.id,
      status: "succeeded",
      subtotalCents,
      discountCents,
      bumpsCents,
      totalCents,
      currency: "usd",
      paymentMethod: "card",
      couponCode,
      bumps,
      metadata: {
        kind: "program",
        stripeSessionId: session.id,
        stripePaymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        stripeCustomer:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
      } as Record<string, unknown>,
      paidAt: new Date(),
    })
    // Defensa en profundidad: índice único por expresión sobre
    // metadata->>'stripeSessionId' (además del advisory lock del caller).
    .onConflictDoNothing()
    .returning();

  if (!order) {
    const existing = await findOrderBySessionId(session.id);
    if (existing) return { orderId: existing.id, kind: "program" as const, createdNewAccount: false };
    throw new Error("order_conflict_unresolved");
  }

  await db
    .insert(schema.enrollments)
    .values({ userId: resolved.userId, programId: program.id, status: "active" })
    .onConflictDoNothing();

  await recomputeUserTier(resolved.userId, {
    reason: "order_paid",
    sourceOrderId: order.id,
  }).catch((e) => console.error("[stripe.finalize program] tier:", e));

  // Cuenta creada en este checkout → mandar la contraseña temporal por
  // correo (la página de confirmación se lo promete al comprador).
  if (resolved.tempPassword) {
    const firstName = buyerName.split(" ")[0] || buyerName;
    sendEmail({
      to: buyerEmail,
      subject: `Tu acceso a "${program.title}" está listo`,
      html: purchaseAccessEmailHtml({
        firstName,
        itemTitle: program.title,
        tempPassword: resolved.tempPassword,
      }),
    }).catch((err) => console.error("[stripe.finalize program] email:", err));
  }

  await db
    .insert(schema.activity)
    .values({
      kind: "purchase",
      icon: "💳",
      text: `${buyerName.split(" ")[0]} compró ${program.title} · $${(totalCents / 100).toFixed(0)}`,
      color: "var(--accent)",
    })
    .catch(() => undefined);

  return {
    orderId: order.id,
    kind: "program" as const,
    createdNewAccount: resolved.createdNewAccount,
  };
}

/* ────────────────── BOOK ────────────────── */
async function finalizeBookOrder(session: Stripe.Checkout.Session) {
  const m = (session.metadata ?? {}) as Record<string, string>;
  const bookSlug = m.bookSlug;
  const format = (m.format ?? "digital") as "digital" | "physical" | "bundle";
  const buyerName = m.buyerName ?? "";
  const buyerEmail = (m.buyerEmail ?? "").toLowerCase();
  const shipping = m.shippingJson ? JSON.parse(m.shippingJson) : null;
  const bumps = m.bumpsJson
    ? (JSON.parse(m.bumpsJson) as Array<{ slug: string; variant: "digital" | "physical" | "bundle"; priceUsd: number; title: string }>)
    : [];

  const [product] = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.slug, bookSlug))
    .limit(1);
  if (!product) throw new Error("book_not_found");

  const resolved = await resolveUserByEmail(buyerEmail, buyerName);

  if (resolved.createdNewAccount && (shipping?.country || shipping?.phone)) {
    await db
      .update(schema.users)
      .set({ country: shipping?.country ?? null, phone: shipping?.phone ?? null })
      .where(eq(schema.users.id, resolved.userId));
  }

  const baseUsd = basePrice(product as never, format);
  const bumpsUsd = bumps.reduce((s, b) => s + b.priceUsd, 0);
  const totalCents = (baseUsd + bumpsUsd) * 100;

  // Decrementar stock de físicos best-effort
  if (format === "physical" && product.stockPhysical != null) {
    await db
      .update(schema.books)
      .set({ stockPhysical: sql`GREATEST(${schema.books.stockPhysical} - 1, 0)` })
      .where(eq(schema.books.id, product.id));
  }
  for (const bump of bumps) {
    if (bump.variant === "physical") {
      await db
        .update(schema.books)
        .set({ stockPhysical: sql`GREATEST(${schema.books.stockPhysical} - 1, 0)` })
        .where(eq(schema.books.slug, bump.slug));
    }
  }

  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: resolved.userId,
      email: buyerEmail,
      name: buyerName,
      programId: null,
      status: "succeeded",
      subtotalCents: baseUsd * 100,
      discountCents: 0,
      bumpsCents: bumpsUsd * 100,
      taxCents: 0,
      totalCents,
      currency: "usd",
      paymentMethod: "card",
      bumps: bumps.map((b) => ({
        id: `${b.slug}-${b.variant}`,
        title: b.title,
        priceCents: b.priceUsd * 100,
      })),
      metadata: {
        kind: "book",
        stripeSessionId: session.id,
        stripePaymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        stripeCustomer:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
        bookSlug: product.slug,
        bookTitle: product.title,
        format,
        isBundle: product.isBundle,
        shipping: shipping ?? null,
      } as Record<string, unknown>,
      paidAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (!order) {
    const existing = await findOrderBySessionId(session.id);
    if (existing) return { orderId: existing.id, kind: "book" as const, createdNewAccount: false };
    throw new Error("order_conflict_unresolved");
  }

  await recomputeUserTier(resolved.userId, {
    reason: "order_paid",
    sourceOrderId: order.id,
  }).catch((e) => console.error("[stripe.finalize book] tier:", e));

  const firstName = buyerName.split(" ")[0] || buyerName;
  const isPhysicalDelivery = format === "physical" || (format === "bundle" && product.hasPhysical);
  sendEmail({
    to: buyerEmail,
    subject: `Tu copia de "${product.title}" está lista`,
    html: bookPurchaseEmailHtml({
      firstName,
      bookTitle: product.title,
      format,
      isPhysical: isPhysicalDelivery,
      tempPassword: resolved.tempPassword,
      digitalFileUrl: product.digitalFileUrl ?? null,
    }),
  }).catch((err) => console.error("[stripe.finalize book] email:", err));

  await db
    .insert(schema.activity)
    .values({
      kind: "purchase",
      icon: "📖",
      text: `${firstName} compró ${product.title} · $${baseUsd + bumpsUsd}`,
      color: "var(--accent)",
    })
    .catch(() => undefined);

  return {
    orderId: order.id,
    kind: "book" as const,
    createdNewAccount: resolved.createdNewAccount,
  };
}

/* ────────────────── MEMBERSHIP ────────────────── */
async function finalizeMembershipOrder(session: Stripe.Checkout.Session) {
  const m = (session.metadata ?? {}) as Record<string, string>;
  const planSlug = m.planSlug as PlanSlug;
  const billingCycle = (m.billingCycle ?? "monthly") as "monthly" | "yearly";
  const buyerName = m.buyerName ?? "";
  const buyerEmail = (m.buyerEmail ?? "").toLowerCase();

  const [plan] = await db
    .select()
    .from(schema.membershipPlans)
    .where(and(eq(schema.membershipPlans.slug, planSlug), eq(schema.membershipPlans.isActive, true)))
    .limit(1);
  if (!plan) throw new Error("plan_not_found");

  const resolved = await resolveUserByEmail(buyerEmail, buyerName);

  // Verificar que no haya ya membresía activa para evitar doble cobro.
  const [activeAlready] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, resolved.userId), eq(schema.memberships.status, "active")))
    .limit(1);
  if (activeAlready) {
    // Stripe ya cobró pero el user ya tenía suscripción. Marcar el order como
    // pagado igual (auditoría) y dejar la membership existente intacta.
    console.warn("[stripe.finalize membership] user ya tenía membresía activa", resolved.userId);
  }

  const priceUsd =
    billingCycle === "yearly" && plan.priceUsdYearly ? plan.priceUsdYearly : plan.priceUsdMonthly;
  const totalCents = priceUsd * 100;

  // Stripe session.subscription puede ser string id u objeto expandido.
  const stripeSubId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const stripeCustId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  // currentPeriodEnd desde Stripe si está expandido, sino calculamos.
  const now = new Date();
  let periodEnd: Date;
  const sub = typeof session.subscription === "object" ? session.subscription : null;
  if (sub && sub.current_period_end) {
    periodEnd = new Date(sub.current_period_end * 1000);
  } else {
    periodEnd = new Date(now);
    if (billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: resolved.userId,
      email: buyerEmail,
      name: buyerName,
      status: "succeeded",
      subtotalCents: totalCents,
      totalCents,
      currency: "usd",
      paymentMethod: "card",
      metadata: {
        kind: "membership",
        stripeSessionId: session.id,
        stripeSubscriptionId: stripeSubId,
        stripeCustomer: stripeCustId,
        planSlug,
        billingCycle,
        planLabel: plan.label,
      } as Record<string, unknown>,
      paidAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (!order) {
    const existing = await findOrderBySessionId(session.id);
    if (existing) return { orderId: existing.id, kind: "membership" as const, createdNewAccount: false };
    throw new Error("order_conflict_unresolved");
  }

  let membershipId: string;
  if (!activeAlready) {
    const [created] = await db
      .insert(schema.memberships)
      .values({
        userId: resolved.userId,
        planSlug,
        status: "active",
        billingCycle,
        priceUsd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      })
      .returning();
    membershipId = created.id;

    await db
      .update(schema.membershipPlans)
      .set({ activeMembers: sql`${schema.membershipPlans.activeMembers} + 1` })
      .where(eq(schema.membershipPlans.id, plan.id));
  } else {
    membershipId = activeAlready.id;
  }

  await accrueCredit({
    userId: resolved.userId,
    amountPaidCents: totalCents,
    membershipId,
    accrualPercent: plan.creditAccrualPercent,
    note: `Pago inicial ${plan.label} ${billingCycle}`,
  }).catch((e) => console.error("[stripe.finalize membership] accrue:", e));

  await recomputeUserTier(resolved.userId, {
    reason: "order_paid",
    sourceOrderId: order.id,
  }).catch(() => {});

  // Cuenta creada en este checkout → mandar la contraseña temporal por correo.
  if (resolved.tempPassword) {
    const firstName = buyerName.split(" ")[0] || buyerName;
    sendEmail({
      to: buyerEmail,
      subject: `Bienvenido a ${plan.label} — tu cuenta está lista`,
      html: purchaseAccessEmailHtml({
        firstName,
        itemTitle: `Membresía ${plan.label}`,
        tempPassword: resolved.tempPassword,
      }),
    }).catch((err) => console.error("[stripe.finalize membership] email:", err));
  }

  await db
    .insert(schema.activity)
    .values({
      kind: "membership",
      icon: plan.emoji,
      text: `${buyerName.split(" ")[0]} se unió a ${plan.label} ${billingCycle === "yearly" ? "anual" : ""}`.trim(),
      color: plan.badgeColor ?? "var(--accent)",
    })
    .catch(() => undefined);

  return {
    orderId: order.id,
    kind: "membership" as const,
    createdNewAccount: resolved.createdNewAccount,
  };
}

/* La sesión web del comprador se abre en GET /api/checkout/finish (Route
 * Handler, único contexto donde Next permite escribir cookies). Las páginas
 * de confirmación NO pueden setear cookies durante el render. */
