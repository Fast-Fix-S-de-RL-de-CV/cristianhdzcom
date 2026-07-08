import { and, eq, gt, gte, lt, lte, ne, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BookingAvailability } from "@/db/schema";
import { DEFAULT_BOOKING_AVAILABILITY, slugifyBookingTitle } from "@/lib/booking-shared";
import {
  addDaysToDateStr,
  dateStrInZone,
  dayOfWeekInZone,
  DEFAULT_TIMEZONE,
  formatInZone,
  resolveTimezone,
  zonedWallTimeToUtc,
} from "@/lib/timezone";

export type BookingServiceRow = typeof schema.bookingServices.$inferSelect;

export type PublicSlot = {
  time: string;
  utc: string;
};

export { DEFAULT_BOOKING_AVAILABILITY, slugifyBookingTitle };

export function normalizeAvailability(input: unknown): BookingAvailability {
  if (!Array.isArray(input)) return DEFAULT_BOOKING_AVAILABILITY;
  const clean = input
    .map((item) => {
      const row = item as Record<string, unknown>;
      const day = Number(row.day);
      const startTime = String(row.startTime ?? "");
      const endTime = String(row.endTime ?? "");
      if (!Number.isInteger(day) || day < 0 || day > 6) return null;
      if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return null;
      return { day, startTime, endTime, enabled: row.enabled !== false };
    })
    .filter(Boolean) as BookingAvailability;
  return clean.length ? clean : DEFAULT_BOOKING_AVAILABILITY;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function calculateAvailableSlots(opts: {
  service: BookingServiceRow;
  date: string;
  clientTimezone?: string | null;
}): Promise<{ slots: PublicSlot[]; timezone: string; businessTimezone: string }> {
  const service = opts.service;
  const businessTimezone = resolveTimezone(service.timezone, DEFAULT_TIMEZONE);
  const clientTimezone = resolveTimezone(opts.clientTimezone, businessTimezone);
  const durationMs = service.durationMinutes * 60_000;
  const step = Math.max(5, service.durationMinutes + service.bufferMinutes);
  const dayStartUtc = zonedWallTimeToUtc(opts.date, "00:00:00", clientTimezone);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000 - 1);
  const availability = normalizeAvailability(service.availability);
  const candidates: Date[] = [];

  for (const offset of [-1, 0, 1]) {
    const dateInClientRange = addDaysToDateStr(opts.date, offset);
    const noonUtc = zonedWallTimeToUtc(dateInClientRange, "12:00:00", clientTimezone);
    const businessDate = dateStrInZone(noonUtc, businessTimezone);
    const businessDow = dayOfWeekInZone(noonUtc, businessTimezone);
    const windows = availability.filter((a) => a.day === businessDow && a.enabled !== false);

    for (const window of windows) {
      const start = minutesOf(window.startTime);
      const end = minutesOf(window.endTime);
      if (end <= start) continue;
      for (let minute = start; minute + service.durationMinutes <= end; minute += step) {
        const hh = String(Math.floor(minute / 60)).padStart(2, "0");
        const mm = String(minute % 60).padStart(2, "0");
        const slot = zonedWallTimeToUtc(businessDate, `${hh}:${mm}:00`, businessTimezone);
        if (slot >= dayStartUtc && slot <= dayEndUtc) candidates.push(slot);
      }
    }
  }

  if (!candidates.length) return { slots: [], timezone: clientTimezone, businessTimezone };

  const now = new Date();
  const earliest = new Date(now.getTime() + service.minNoticeHours * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + service.maxDaysAhead * 24 * 60 * 60 * 1000);
  const queryStart = new Date(dayStartUtc.getTime() - 24 * 60 * 60 * 1000);
  const queryEnd = new Date(dayEndUtc.getTime() + 24 * 60 * 60 * 1000);
  const existing = await db
    .select({
      startsAt: schema.bookingReservations.startsAt,
      endsAt: schema.bookingReservations.endsAt,
    })
    .from(schema.bookingReservations)
    .where(
      and(
        eq(schema.bookingReservations.serviceId, service.id),
        ne(schema.bookingReservations.status, "cancelled"),
        or(ne(schema.bookingReservations.status, "pending_payment"), gt(schema.bookingReservations.expiresAt, now)),
        gte(schema.bookingReservations.startsAt, queryStart),
        lte(schema.bookingReservations.startsAt, queryEnd),
      ),
    );

  const seen = new Set<string>();
  const slots = candidates
    .filter((start) => start >= earliest && start <= maxDate)
    .sort((a, b) => a.getTime() - b.getTime())
    .filter((start) => {
      const end = new Date(start.getTime() + durationMs);
      return !existing.some((r) => overlaps(start, end, r.startsAt, r.endsAt));
    })
    .map((start) => ({
      time: formatInZone(start, clientTimezone, { hour: "2-digit", minute: "2-digit", hour12: false }),
      utc: start.toISOString(),
    }))
    .filter((slot) => {
      if (seen.has(slot.time)) return false;
      seen.add(slot.time);
      return true;
    });

  return { slots, timezone: clientTimezone, businessTimezone };
}

export async function hasBookingConflict(serviceId: string, startsAt: Date, endsAt: Date): Promise<boolean> {
  const now = new Date();
  const [conflict] = await db
    .select({ id: schema.bookingReservations.id })
    .from(schema.bookingReservations)
    .where(
      and(
        eq(schema.bookingReservations.serviceId, serviceId),
        ne(schema.bookingReservations.status, "cancelled"),
        or(ne(schema.bookingReservations.status, "pending_payment"), gt(schema.bookingReservations.expiresAt, now)),
        or(
          and(gte(schema.bookingReservations.startsAt, startsAt), lt(schema.bookingReservations.startsAt, endsAt)),
          and(gt(schema.bookingReservations.endsAt, startsAt), lte(schema.bookingReservations.endsAt, endsAt)),
          and(lte(schema.bookingReservations.startsAt, startsAt), gte(schema.bookingReservations.endsAt, endsAt)),
        ),
      ),
    )
    .limit(1);
  return !!conflict;
}
