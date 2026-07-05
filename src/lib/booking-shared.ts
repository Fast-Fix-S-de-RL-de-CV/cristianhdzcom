import type { BookingAvailability } from "@/db/schema";

export const DEFAULT_BOOKING_AVAILABILITY: BookingAvailability = [
  { day: 1, startTime: "09:00", endTime: "17:00", enabled: true },
  { day: 2, startTime: "09:00", endTime: "17:00", enabled: true },
  { day: 3, startTime: "09:00", endTime: "17:00", enabled: true },
  { day: 4, startTime: "09:00", endTime: "17:00", enabled: true },
  { day: 5, startTime: "09:00", endTime: "15:00", enabled: true },
];

export function slugifyBookingTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "servicio";
}
