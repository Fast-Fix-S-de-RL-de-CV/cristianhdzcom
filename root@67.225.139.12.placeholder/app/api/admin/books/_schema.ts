import { z } from "zod";

/**
 * Shared Zod schema for book create/update endpoints. Lives in `_schema.ts`
 * (underscore prefix) so Next.js doesn't treat it as a route export.
 */
export const bookBodySchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido"),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(240).nullable().optional(),
  description: z.string().nullable().optional(),
  coverUrl: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || v === "" || /^https?:\/\//.test(v) || v.startsWith("/"), "URL inválida"),
  pages: z.number().int().min(0).max(9999).nullable().optional(),

  priceDigitalUsd: z.number().int().min(0).max(99999).nullable().optional(),
  pricePrintUsd: z.number().int().min(0).max(99999).nullable().optional(),
  priceCompareUsd: z.number().int().min(0).max(99999).nullable().optional(),
  priceBundleUsd: z.number().int().min(0).max(99999).nullable().optional(),

  hasDigital: z.boolean().optional(),
  hasPhysical: z.boolean().optional(),
  stockPhysical: z.number().int().min(0).nullable().optional(),
  digitalFileUrl: z.string().nullable().optional(),

  isBundle: z.boolean().optional(),
  bundleIncludes: z
    .object({
      books: z.array(z.string()).optional(),
      programs: z.array(z.string()).optional(),
    })
    .optional(),

  ratingAvg: z.number().int().min(0).max(50).nullable().optional(),
  ratingCount: z.number().int().min(0).optional(),
  bullets: z.array(z.string().max(200)).max(20).optional(),
  accent: z.enum(["warm", "accent", "ink"]).optional(),
  badge: z.string().max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});
