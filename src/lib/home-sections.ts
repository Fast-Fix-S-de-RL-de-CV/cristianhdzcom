/**
 * Contenido configurable del Home por tenant (ver ARCHITECTURE_SAAS.md).
 *
 * site_settings.homeSections (jsonb, nullable):
 *   - NULL  → tenant sin override (cristianhdz): el Home renderiza su JSX ORIGINAL
 *             sin cambios (garantía de no romperlo).
 *   - objeto → el Home renderiza cada sección desde esta config (templada).
 *
 * Cada sección trae `show` (mostrar/ocultar — depende del negocio) + su copy.
 * Las secciones data-driven (talleres/programas/empresas) toman las TARJETAS del
 * contenido del tenant; aquí solo se configura el encabezado + visibilidad.
 */

import { z } from "zod";

export type PathColor = "accent" | "warm" | "ink";

export type PathCard = {
  eyebrow?: string;
  tag?: string;
  title?: string;
  desc?: string;
  kpi?: string;
  ctaLabel?: string;
  href?: string;
  color?: PathColor;
  imageUrl?: string;
};

export type Phase = { title?: string; desc?: string; imageUrl?: string };

export type SectionCopy = {
  show?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
};

export type HomeSections = {
  paths?: { show?: boolean; eyebrow?: string; title?: string; intro?: string; cards?: PathCard[] };
  talleres?: SectionCopy;
  programas?: SectionCopy;
  empresas?: SectionCopy;
  metodo?: { show?: boolean; eyebrow?: string; title?: string; subtitle?: string; phases?: Phase[] };
  finalCta?: {
    show?: boolean;
    chip?: string;
    title?: string;
    subtitle?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
  };
};

/**
 * Default GENÉRICO para tenants ≠ cristianhdz (se siembra al crear tenant y por
 * migración a los existentes). Las secciones muy específicas (paths/metodo) van
 * ocultas por default; el resto visibles con copy neutral.
 */
export const HOME_SECTIONS_DEFAULT: HomeSections = {
  paths: {
    show: false,
    eyebrow: "Lo que hacemos",
    title: "Cómo trabajamos.",
    intro: "Elige el punto de entrada que mejor se ajuste a lo que necesitas hoy.",
    cards: [],
  },
  talleres: {
    show: true,
    eyebrow: "Eventos · en vivo y on-demand",
    title: "Aprende en vivo.",
    subtitle: "Sesiones y webinars para aplicar lo que aprendes en tiempo real.",
    ctaLabel: "Ver todos los eventos →",
  },
  programas: {
    show: true,
    eyebrow: "Catálogo",
    title: "Programas y cursos.",
    subtitle: "Contenido profesional con acceso completo y comunidad.",
    ctaLabel: "Ver todos los programas →",
  },
  empresas: {
    show: true,
    eyebrow: "Servicios",
    title: "Cómo te podemos ayudar.",
    subtitle: "Nuestros productos y servicios.",
    ctaLabel: "Ver todo →",
  },
  metodo: { show: false, eyebrow: "Método", title: "Nuestro método.", subtitle: "", phases: [] },
  finalCta: {
    show: true,
    chip: "EMPIEZA HOY",
    title: "Da el primer paso.",
    subtitle: "Únete y empieza ahora mismo.",
    primaryLabel: "Empezar →",
    secondaryLabel: "Ver más",
  },
};

/** Validación (zod) del payload de homeSections que manda el admin. */
const zStr = z.string().max(400);
const zPathCard = z.object({
  eyebrow: zStr.optional(),
  tag: zStr.optional(),
  title: zStr.optional(),
  desc: z.string().max(1200).optional(),
  kpi: zStr.optional(),
  ctaLabel: zStr.optional(),
  href: zStr.optional(),
  color: z.enum(["accent", "warm", "ink"]).optional(),
  imageUrl: zStr.optional(),
});
const zSectionCopy = z.object({
  show: z.boolean().optional(),
  eyebrow: zStr.optional(),
  title: zStr.optional(),
  subtitle: z.string().max(1200).optional(),
  ctaLabel: zStr.optional(),
});
export const homeSectionsSchema = z.object({
  paths: z
    .object({
      show: z.boolean().optional(),
      eyebrow: zStr.optional(),
      title: zStr.optional(),
      intro: z.string().max(1200).optional(),
      cards: z.array(zPathCard).max(12).optional(),
    })
    .optional(),
  talleres: zSectionCopy.optional(),
  programas: zSectionCopy.optional(),
  empresas: zSectionCopy.optional(),
  metodo: z
    .object({
      show: z.boolean().optional(),
      eyebrow: zStr.optional(),
      title: zStr.optional(),
      subtitle: z.string().max(1200).optional(),
      phases: z.array(z.object({ title: zStr.optional(), desc: z.string().max(1200).optional(), imageUrl: zStr.optional() })).max(12).optional(),
    })
    .optional(),
  finalCta: z
    .object({
      show: z.boolean().optional(),
      chip: zStr.optional(),
      title: zStr.optional(),
      subtitle: z.string().max(1200).optional(),
      primaryLabel: zStr.optional(),
      secondaryLabel: zStr.optional(),
    })
    .optional(),
});

/** Slug del tenant semilla (su Home se renderiza con el JSX original). */
export const SEED_TENANT_SLUG = "cristianhdz";

/**
 * Resuelve la config efectiva del Home para un tenant.
 *   objeto guardado → esa config.
 *   NULL + tenant semilla → null (el Home renderiza su JSX ORIGINAL, idéntico).
 *   NULL + otro tenant → default genérico.
 */
export function resolveHomeSections(
  raw: HomeSections | null | undefined,
  slug: string,
): HomeSections | null {
  if (raw) return raw;
  if (slug === SEED_TENANT_SLUG) return null;
  return HOME_SECTIONS_DEFAULT;
}
