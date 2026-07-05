import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sendTenantEmail } from "@/lib/email";
import { formatInZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
    if (token !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 55 * 60_000);
  const to = new Date(now.getTime() + 65 * 60_000);

  const rows = await db
    .select({
      id: schema.bookingReservations.id,
      tenantId: schema.bookingReservations.tenantId,
      startsAt: schema.bookingReservations.startsAt,
      timezone: schema.bookingReservations.timezone,
      customerName: schema.bookingReservations.customerName,
      customerEmail: schema.bookingReservations.customerEmail,
      serviceTitle: schema.bookingServices.title,
      locationLabel: schema.bookingServices.locationLabel,
      confirmationText: schema.bookingServices.confirmationText,
      tenantName: schema.tenants.name,
      tenantBranding: schema.tenants.branding,
      remindersEnabled: schema.emailSettings.enableBookingReminders,
    })
    .from(schema.bookingReservations)
    .innerJoin(schema.bookingServices, eq(schema.bookingReservations.serviceId, schema.bookingServices.id))
    .innerJoin(schema.tenants, eq(schema.bookingReservations.tenantId, schema.tenants.id))
    .leftJoin(schema.emailSettings, eq(schema.bookingReservations.tenantId, schema.emailSettings.tenantId))
    .where(
      and(
        isNull(schema.bookingReservations.reminderSentAt),
        inArray(schema.bookingReservations.status, ["scheduled", "confirmed"]),
        gte(schema.bookingReservations.startsAt, from),
        lte(schema.bookingReservations.startsAt, to),
      ),
    )
    .limit(100);

  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.customerEmail || row.remindersEnabled === false) {
      skipped += 1;
      continue;
    }
    const siteName = (row.tenantBranding as { siteName?: string } | null)?.siteName || row.tenantName;
    const when = formatInZone(row.startsAt, row.timezone, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const result = await sendTenantEmail({
      tenantId: row.tenantId,
      to: row.customerEmail,
      subject: `Recordatorio: tu reserva es en 1 hora`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <h2>Tu reserva es en 1 hora</h2>
          <p>Hola ${esc(row.customerName)}, te recordamos tu cita con <strong>${esc(siteName)}</strong>.</p>
          <p><strong>${esc(row.serviceTitle)}</strong></p>
          <p><strong>Fecha:</strong> ${esc(when)} (${esc(row.timezone)})</p>
          ${row.locationLabel ? `<p><strong>Ubicación:</strong> ${esc(row.locationLabel)}</p>` : ""}
          ${row.confirmationText ? `<p>${esc(row.confirmationText)}</p>` : ""}
        </div>
      `,
      text: `Tu reserva es en 1 hora\n${row.serviceTitle}\nFecha: ${when}`,
    });
    if (result.ok) {
      sent += 1;
      await db
        .update(schema.bookingReservations)
        .set({ reminderSentAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.bookingReservations.id, row.id));
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, sent, skipped });
}
