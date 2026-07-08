import { z } from "zod";
import { DEFAULT_BOOKING_AVAILABILITY, slugifyBookingTitle } from "@/lib/booking-shared";
import { resolveTimezone } from "@/lib/timezone";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const bookingAvailabilitySchema = z.array(
  z.object({
    day: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    enabled: z.boolean().optional(),
  }),
);

export const bookingQuestionSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(180),
  type: z.enum(["text", "textarea", "select"]),
  options: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  required: z.boolean().optional(),
});

export const bookingServiceBaseSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(220).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  hostName: z.string().trim().max(120).nullable().optional(),
  hostAvatarUrl: z.string().trim().max(2000).nullable().optional(),
  currency: z.string().trim().length(3).default("USD").transform((v) => v.toUpperCase()),
  priceUsd: z.coerce.number().int().min(0).max(100000).default(0),
  requiresPayment: z.boolean().default(false),
  durationMinutes: z.coerce.number().int().min(10).max(240).default(30),
  bufferMinutes: z.coerce.number().int().min(0).max(120).default(10),
  minNoticeHours: z.coerce.number().int().min(0).max(720).default(2),
  maxDaysAhead: z.coerce.number().int().min(1).max(365).default(30),
  timezone: z.string().trim().max(80).default("America/Mazatlan").transform((v) => resolveTimezone(v)),
  locationType: z.enum(["virtual", "presencial", "phone_call", "other"]).default("virtual"),
  locationLabel: z.string().trim().max(200).nullable().optional(),
  confirmationText: z.string().trim().max(2000).nullable().optional(),
  notificationEmail: z.string().trim().email().max(320).nullable().optional().or(z.literal("").transform(() => null)),
  requirePhone: z.boolean().default(true),
  requireEmail: z.boolean().default(true),
  availability: bookingAvailabilitySchema.default(DEFAULT_BOOKING_AVAILABILITY),
  questions: z.array(bookingQuestionSchema).max(8).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const bookingServiceBodySchema = bookingServiceBaseSchema.transform((data) => ({
  ...data,
  slug: slugifyBookingTitle(data.slug || data.title),
}));
