import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx, resolveBranding } from "@/lib/tenant";
import { planOf } from "@/lib/plans";
import type { TenantBranding } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/branding — branding actual del tenant (resuelto con defaults)
 *                           + slug + customDomain + plan.
 * PUT /api/admin/branding — merge parcial sobre tenants.branding (jsonb).
 *
 * Solo admins DEL TENANT (requireAdmin ya valida el realm). hideMimarcaBadge
 * solo se acepta si el plan lo permite (planOf(tenant).hideMimarcaBadge);
 * si no, se ignora silenciosamente.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex #RRGGBB");

const urlish = z
  .string()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "URL inválida");

const socialShape = z.object({
  instagram: z.string().max(300).optional(),
  facebook: z.string().max(300).optional(),
  youtube: z.string().max(300).optional(),
  tiktok: z.string().max(300).optional(),
  x: z.string().max(300).optional(),
  linkedin: z.string().max(300).optional(),
});

const seoShape = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(260).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  ogImageUrl: urlish.nullable().optional(),
  canonicalUrl: z.string().max(500).nullable().optional(),
  robots: z.enum(["index,follow", "noindex,nofollow"]).optional(),
});

const bookingPageShape = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().max(140).optional(),
  description: z.string().max(360).optional(),
  primaryCtaLabel: z.string().max(50).optional(),
  secondaryCtaLabel: z.string().max(50).optional(),
  catalogEyebrow: z.string().max(80).optional(),
  catalogTitle: z.string().max(120).optional(),
});

const Body = z.object({
  siteName: z.string().min(1).max(80).optional(),
  accent: hexColor.optional(),
  ink: hexColor.optional(),
  bg: hexColor.optional(),
  navBg: hexColor.optional(),
  navText: hexColor.optional(),
  buttonText: hexColor.optional(),
  logoUrl: urlish.nullable().optional(),
  faviconUrl: urlish.nullable().optional(),
  seo: seoShape.optional(),
  footerText: z.string().max(300).optional(),
  footerLinks: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        href: z.string().min(1).max(300),
      }),
    )
    .max(8)
    .optional(),
  navItems: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        href: z
          .string()
          .min(1)
          .max(500)
          .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v) || v.startsWith("mailto:") || v.startsWith("tel:"), "URL inválida"),
        isVisible: z.boolean().optional(),
        openInNewTab: z.boolean().optional(),
      }),
    )
    .max(12)
    .optional(),
  bookingPage: bookingPageShape.optional(),
  aboutPage: z
    .object({
      gallerySlides: z
        .array(
          z.object({
            img: z.string().max(500).optional(),
            title: z.string().max(160).optional(),
            subtitle: z.string().max(160).optional(),
            description: z.string().max(1200).optional(),
            cta: z.string().max(60).optional(),
          }),
        )
        .max(8)
        .optional(),
      storyEyebrow: z.string().max(80).optional(),
      storyTitle: z.string().max(180).optional(),
      storyBody1: z.string().max(4000).optional(),
      storyBody2: z.string().max(4000).optional(),
      statsEyebrow: z.string().max(80).optional(),
      statsTitle: z.string().max(180).optional(),
      quoteEyebrow: z.string().max(80).optional(),
      quoteText: z.string().max(2000).optional(),
      quoteAttrib: z.string().max(120).optional(),
      extraSections: z.array(z.object({ eyebrow: z.string().max(80).optional(), title: z.string().max(180).optional(), body: z.string().max(4000).optional() })).max(8).optional(),
      ctaCards: z.array(z.object({ eyebrow: z.string().max(80).optional(), title: z.string().max(180).optional(), body: z.string().max(1200).optional(), label: z.string().max(80).optional(), href: z.string().max(500).optional() })).max(4).optional(),
    })
    .optional(),
  social: socialShape.optional(),
  hideMimarcaBadge: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  return NextResponse.json({
    branding: ctx.branding,
    slug: ctx.tenant.slug,
    customDomain: ctx.tenant.customDomain,
    domainVerified: ctx.tenant.domainVerified,
    plan: ctx.tenant.plan,
    planStatus: ctx.tenant.planStatus,
    hideBadgeAllowed: planOf(ctx.tenant).hideMimarcaBadge,
  });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const current = (ctx.tenant.branding ?? {}) as TenantBranding;
  const patch: TenantBranding = { ...data };

  // Gate por plan: hideMimarcaBadge solo en planes que lo incluyen (pro).
  if (data.hideMimarcaBadge !== undefined && !planOf(ctx.tenant).hideMimarcaBadge) {
    delete patch.hideMimarcaBadge;
  }

  // "" en logo/favicon = quitar (normaliza a null para no guardar strings vacíos).
  if (patch.logoUrl === "") patch.logoUrl = null;
  if (patch.faviconUrl === "") patch.faviconUrl = null;

  // Social: descarta redes vacías (el editor manda el objeto completo).
  if (data.social) {
    const clean: NonNullable<TenantBranding["social"]> = {};
    for (const [key, value] of Object.entries(data.social)) {
      if (typeof value === "string" && value.trim()) {
        clean[key as keyof NonNullable<TenantBranding["social"]>] = value.trim();
      }
    }
    patch.social = clean;
  }

  if (data.seo) {
    patch.seo = {
      title: data.seo.title?.trim() || undefined,
      description: data.seo.description?.trim() || undefined,
      keywords: Array.isArray(data.seo.keywords) ? data.seo.keywords.map((k) => k.trim()).filter(Boolean) : [],
      ogImageUrl: data.seo.ogImageUrl || null,
      canonicalUrl: data.seo.canonicalUrl?.trim() || null,
      robots: data.seo.robots || "index,follow",
    };
  }

  const next: TenantBranding = { ...current, ...patch };

  const [updated] = await db
    .update(schema.tenants)
    .set({ branding: next })
    .where(eq(schema.tenants.id, ctx.tenant.id))
    .returning();

  return NextResponse.json({ ok: true, branding: resolveBranding(updated) });
}
