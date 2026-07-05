import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { calculateAvailableSlots, hasBookingConflict } from "@/lib/booking";
import { sendEmail } from "@/lib/email";
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
      status: "scheduled",
    })
    .returning();

  const [owner] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, ctx.tenant.id), inArray(schema.users.role, ["admin", "superadmin"])))
    .orderBy(asc(schema.users.createdAt))
    .limit(1);
  const notifyTo = service.notificationEmail || owner?.email;
  const when = formatInZone(startsAt, service.timezone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (notifyTo) {
    sendEmail({
      to: notifyTo,
      replyTo: data.email,
      subject: `Nueva reserva: ${service.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2>Nueva reserva</h2>
          <p><strong>${esc(service.title)}</strong></p>
          <p><strong>Fecha:</strong> ${esc(when)} (${esc(service.timezone)})</p>
          <p><strong>Nombre:</strong> ${esc(data.name)}</p>
          ${data.email ? `<p><strong>Email:</strong> <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>` : ""}
          ${data.phone ? `<p><strong>Teléfono:</strong> ${esc(data.phone)}</p>` : ""}
          ${data.notes ? `<p><strong>Notas:</strong><br>${esc(data.notes)}</p>` : ""}
        </div>
      `,
      text: `Nueva reserva: ${service.title}\nFecha: ${when}\nNombre: ${data.name}\nEmail: ${data.email || "—"}\nTelefono: ${data.phone || "—"}`,
    }).catch((err) => console.error("[bookings] notify email:", err));
  }

  if (data.email) {
    sendEmail({
      to: data.email,
      subject: `Tu reserva en ${ctx.branding.siteName}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2>Reserva confirmada</h2>
          <p>Hola ${esc(data.name)}, tu horario quedó reservado.</p>
          <p><strong>${esc(service.title)}</strong></p>
          <p><strong>Fecha:</strong> ${esc(when)} (${esc(service.timezone)})</p>
          ${service.locationLabel ? `<p><strong>Ubicación:</strong> ${esc(service.locationLabel)}</p>` : ""}
          ${service.confirmationText ? `<p>${esc(service.confirmationText)}</p>` : ""}
        </div>
      `,
      text: `Reserva confirmada\n${service.title}\nFecha: ${when}`,
    }).catch((err) => console.error("[bookings] customer email:", err));
  }

  return NextResponse.json({ reservation: { id: reservation.id, startsAt: reservation.startsAt } });
}
