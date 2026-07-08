import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { calculateAvailableSlots, hasBookingConflict } from "@/lib/booking";
import { sendTenantEmail } from "@/lib/email";
import { usdToMxnCents } from "@/lib/fx";
import { getStripeForTenant, requestOrigin } from "@/lib/stripe";
import { getTenantCtx } from "@/lib/tenant";
import { formatInZone, resolveTimezone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const ReservationBody = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(60).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  utc: z.string().datetime(),
  timezone: z.string().trim().max(80).optional(),
  answers: z.array(z.object({
    id: z.string().max(60),
    label: z.string().max(180),
    answer: z.string().max(1000),
  })).optional(),
});

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function getService(slug: string) {
  const ctx = await getTenantCtx();
  if (!ctx) return null;
  const [service] = await db
    .select()
    .from(schema.bookingServices)
    .where(and(eq(schema.bookingServices.tenantId, ctx.tenant.id), eq(schema.bookingServices.slug, slug)))
    .limit(1);
  if (!service || !service.isActive) return null;
  return { ctx, service };
}

export async function GET(_req: Request, routeCtx: { params: Promise<{ slug: string }> }) {
  const { slug } = await routeCtx.params;
  const found = await getService(slug);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { ctx, service } = found;
  return NextResponse.json({
    service: {
      id: service.id,
      slug: service.slug,
      title: service.title,
      subtitle: service.subtitle,
      description: service.description,
      hostName: service.hostName,
      hostAvatarUrl: service.hostAvatarUrl,
      currency: service.currency,
      priceUsd: service.priceUsd,
      requiresPayment: service.requiresPayment,
      durationMinutes: service.durationMinutes,
      maxDaysAhead: service.maxDaysAhead,
      timezone: service.timezone,
      locationType: service.locationType,
      locationLabel: service.locationLabel,
      confirmationText: service.confirmationText,
      requirePhone: service.requirePhone,
      requireEmail: service.requireEmail,
      questions: service.questions,
    },
    tenant: {
      siteName: ctx.branding.siteName,
      logoUrl: ctx.branding.logoUrl,
      accent: ctx.branding.accent,
      ink: ctx.branding.ink,
      bg: ctx.branding.bg,
    },
  });
}

export async function POST(req: Request, routeCtx: { params: Promise<{ slug: string }> }) {
  const { slug } = await routeCtx.params;
  const found = await getService(slug);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { ctx, service } = found;

  let data;
  try {
    data = ReservationBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (service.requireEmail && !data.email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }
  if (service.requirePhone && !data.phone) {
    return NextResponse.json({ error: "phone_required" }, { status: 400 });
  }
  if (service.requiresPayment && service.priceUsd > 0 && !data.email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const questions = Array.isArray(service.questions) ? service.questions : [];
  const answers = Array.isArray(data.answers) ? data.answers : [];
  for (const q of questions) {
    if (!q.required) continue;
    const answer = answers.find((a) => a.id === q.id)?.answer?.trim();
    if (!answer) return NextResponse.json({ error: "required_question", label: q.label }, { status: 400 });
  }

  const startsAt = new Date(data.utc);
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  const timezone = resolveTimezone(data.timezone, service.timezone);

  const date = formatInZone(startsAt, timezone, { year: "numeric", month: "2-digit", day: "2-digit" })
    .split("/")
    .reverse()
    .join("-");
  const available = await calculateAvailableSlots({ service, date, clientTimezone: timezone });
  if (!available.slots.some((slot) => slot.utc === startsAt.toISOString())) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }
  if (await hasBookingConflict(service.id, startsAt, endsAt)) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  const requiresPayment = service.requiresPayment && service.priceUsd > 0;
  const stripeClient = requiresPayment ? await getStripeForTenant(ctx.tenant.id) : null;
  if (requiresPayment && !stripeClient?.stripe && process.env.ALLOW_DEMO_CHECKOUT !== "1") {
    return NextResponse.json(
      { error: "payments_not_configured", message: "Este sitio aun no tiene pagos configurados." },
      { status: 400 },
    );
  }

  const [reservation] = await db
    .insert(schema.bookingReservations)
    .values({
      tenantId: ctx.tenant.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      timezone,
      customerName: data.name,
      customerEmail: data.email ?? null,
      customerPhone: data.phone ?? null,
      notes: data.notes ?? null,
      answers,
      status: requiresPayment ? "pending_payment" : "scheduled",
      expiresAt: requiresPayment ? new Date(Date.now() + 30 * 60 * 1000) : null,
    })
    .returning();

  if (requiresPayment) {
    if (process.env.ALLOW_DEMO_CHECKOUT === "1" && !stripeClient?.stripe) {
      await db
        .update(schema.bookingReservations)
        .set({ status: "scheduled", paidAt: new Date(), expiresAt: null, updatedAt: new Date() })
        .where(eq(schema.bookingReservations.id, reservation.id));
      await sendReservationEmails({ tenantId: ctx.tenant.id, siteName: ctx.branding.siteName, service, reservation: { ...reservation, status: "scheduled" } });
      return NextResponse.json({ reservation: { id: reservation.id, startsAt: reservation.startsAt }, demo: true });
    }

    try {
      const origin = requestOrigin(req);
      const session = await stripeClient!.stripe!.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "mxn",
              unit_amount: usdToMxnCents(service.priceUsd),
              product_data: {
                name: service.title,
                description: service.subtitle ?? service.description?.slice(0, 240) ?? undefined,
                images: service.hostAvatarUrl ? [service.hostAvatarUrl] : undefined,
              },
            },
          },
        ],
        customer_email: data.email,
        success_url: `${origin}${ctx.tp("/api/checkout/finish")}?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(ctx.tp(`/reservas?servicio=${service.slug}&booking=paid`))}`,
        cancel_url: `${origin}${ctx.tp(`/reservas?servicio=${service.slug}&cancelled=1`)}`,
        metadata: {
          kind: "booking",
          tenantId: ctx.tenant.id,
          bookingReservationId: reservation.id,
          bookingServiceId: service.id,
          buyerName: data.name,
          buyerEmail: data.email ?? "",
          serviceTitle: service.title,
        },
      });
      await db
        .update(schema.bookingReservations)
        .set({ stripeSessionId: session.id, updatedAt: new Date() })
        .where(eq(schema.bookingReservations.id, reservation.id));
      return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (e) {
      await db
        .update(schema.bookingReservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(schema.bookingReservations.id, reservation.id))
        .catch(() => undefined);
      console.error("[bookings] checkout:", e);
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
  }

  await sendReservationEmails({ tenantId: ctx.tenant.id, siteName: ctx.branding.siteName, service, reservation });

  return NextResponse.json({ reservation: { id: reservation.id, startsAt: reservation.startsAt } });
}

async function sendReservationEmails({
  tenantId,
  siteName,
  service,
  reservation,
}: {
  tenantId: string;
  siteName: string;
  service: typeof schema.bookingServices.$inferSelect;
  reservation: typeof schema.bookingReservations.$inferSelect;
}) {
  const [owner] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, tenantId), inArray(schema.users.role, ["admin", "superadmin"])))
    .orderBy(asc(schema.users.createdAt))
    .limit(1);
  const notifyTo = service.notificationEmail || owner?.email;
  const when = formatInZone(reservation.startsAt, service.timezone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (notifyTo) {
    sendTenantEmail({
      tenantId,
      to: notifyTo,
      replyTo: reservation.customerEmail ?? undefined,
      subject: `Nueva reserva: ${service.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2>Nueva reserva</h2>
          <p><strong>${esc(service.title)}</strong></p>
          <p><strong>Fecha:</strong> ${esc(when)} (${esc(service.timezone)})</p>
          <p><strong>Nombre:</strong> ${esc(reservation.customerName)}</p>
          ${reservation.customerEmail ? `<p><strong>Email:</strong> <a href="mailto:${esc(reservation.customerEmail)}">${esc(reservation.customerEmail)}</a></p>` : ""}
          ${reservation.customerPhone ? `<p><strong>Telefono:</strong> ${esc(reservation.customerPhone)}</p>` : ""}
          ${reservation.notes ? `<p><strong>Notas:</strong><br>${esc(reservation.notes)}</p>` : ""}
        </div>
      `,
      text: `Nueva reserva: ${service.title}\nFecha: ${when}\nNombre: ${reservation.customerName}\nEmail: ${reservation.customerEmail || "—"}\nTelefono: ${reservation.customerPhone || "—"}`,
    }).catch((err) => console.error("[bookings] notify email:", err));
  }

  if (reservation.customerEmail) {
    sendTenantEmail({
      tenantId,
      to: reservation.customerEmail,
      subject: `Tu reserva en ${siteName}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2>Reserva confirmada</h2>
          <p>Hola ${esc(reservation.customerName)}, tu horario quedo reservado.</p>
          <p><strong>${esc(service.title)}</strong></p>
          <p><strong>Fecha:</strong> ${esc(when)} (${esc(service.timezone)})</p>
          ${service.locationLabel ? `<p><strong>Ubicación:</strong> ${esc(service.locationLabel)}</p>` : ""}
          ${service.confirmationText ? `<p>${esc(service.confirmationText)}</p>` : ""}
        </div>
      `,
      text: `Reserva confirmada\n${service.title}\nFecha: ${when}`,
    }).catch((err) => console.error("[bookings] customer email:", err));
  }
}
