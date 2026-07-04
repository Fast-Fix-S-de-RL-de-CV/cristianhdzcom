import { z } from "zod";

/** Validación compartida de un slide del hero (usada por las rutas de admin). */
export const slideBody = z.object({
  mediaType: z.enum(["image", "video"]).default("image"),
  imageUrl: z.string().max(2000).nullable().optional(),
  videoUrl: z.string().max(2000).nullable().optional(),
  title: z.string().max(160).nullable().optional(),
  subtitle: z.string().max(2000).nullable().optional(),
  ctaLabel: z.string().max(60).nullable().optional(),
  ctaHref: z.string().max(2000).nullable().optional(),
  cta2Label: z.string().max(60).nullable().optional(),
  cta2Href: z.string().max(2000).nullable().optional(),
  textPosition: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});
