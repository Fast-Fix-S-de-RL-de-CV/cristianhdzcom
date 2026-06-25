import { z } from "zod";

/**
 * Zod schema compartido entre POST y PUT de /api/admin/services.
 * Vive en `_schema.ts` (underscore) para que Next.js no lo trate como route export.
 */
export const serviceBodySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido"),
  name: z.string().min(1).max(120),
  domain: z.string().max(120).nullable().optional(),
  kind: z.enum(["saas", "software", "consulting", "agency", "service"]).optional(),
  tagline: z.string().max(80).nullable().optional(),
  description: z.string().nullable().optional(),
  glyph: z.string().max(4).nullable().optional(),
  hue: z.number().int().min(0).max(360).optional(),
  badge: z.string().max(40).nullable().optional(),
  metricLabel: z.string().max(80).nullable().optional(),
  priceLabel: z.string().max(60).nullable().optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().nullable().optional(),
  coverVideoUrl: z.string().nullable().optional(),
  isCtaCard: z.boolean().optional(),
  showLiveBadge: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
