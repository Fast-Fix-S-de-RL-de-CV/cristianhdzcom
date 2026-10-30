import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { and, asc, eq, gt, ne, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Hero3D } from "@/components/marketing/Hero3D";
import { HeroSlider } from "@/components/marketing/HeroSlider";
import { PathsSection } from "@/components/marketing/home/PathsSection";
import { TalleresSection } from "@/components/marketing/home/TalleresSection";
import { ProgramasSection } from "@/components/marketing/home/ProgramasSection";
import { EmpresasSection } from "@/components/marketing/home/EmpresasSection";
import { MetodoSection } from "@/components/marketing/home/MetodoSection";
import { FinalCtaSection } from "@/components/marketing/home/FinalCtaSection";
import { resolveHomeSectionOrder, resolveHomeSections, HOME_SECTIONS_DEFAULT } from "@/lib/home-sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const { tp } = ctx;
  const now = new Date();
  const [user, featured, talleres, services, heroRows, slidesRows] = await Promise.all([
    getCurrentUser(),
    // Programas y certificaciones (excluye talleres — esos viven en su propia
    // sección de banners arriba). Trae varios para alimentar el carrusel.
    db
      .select()
      .from(schema.programs)
      .where(
        and(
          eq(schema.programs.tenantId, ctx.tenant.id),
          eq(schema.programs.isActive, true),
          ne(schema.programs.type, "taller"),
        ),
      )
      .orderBy(asc(schema.programs.sortOrder))
      .limit(12),
    // Talleres en vivo: evergreen siempre + próximos en fecha (≤ 60 días)
    db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.tenantId, ctx.tenant.id),
          or(
            eq(schema.events.isEvergreen, true),
            gt(schema.events.startsAt, now),
          ),
        ),
      )
      .orderBy(
        // Evergreen primero (siempre disponibles), después por fecha más próxima
        sql`${schema.events.isEvergreen} desc, ${schema.events.startsAt} asc`,
      )
      .limit(4),
    // Empresas y servicios del estudio (alimenta la sección "Empresas y Servicios").
    db
      .select()
      .from(schema.services)
      .where(
        and(
          eq(schema.services.tenantId, ctx.tenant.id),
          eq(schema.services.isActive, true),
        ),
      )
      .orderBy(asc(schema.services.sortOrder))
      .limit(24),
    // Site settings del tenant — controla el hero y el contenido del home.
    db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.tenantId, ctx.tenant.id))
      .limit(1),
    // Slides del hero (cuando heroType='slider').
    db
      .select()
      .from(schema.heroSlides)
      .where(and(eq(schema.heroSlides.tenantId, ctx.tenant.id), eq(schema.heroSlides.isActive, true)))
      .orderBy(asc(schema.heroSlides.sortOrder)),
  ]);
  const hero = heroRows[0] ?? null;
  const heroType = hero?.heroType ?? "slider";
  const heroSlides = slidesRows.map((s) => ({
    id: s.id,
    mediaType: s.mediaType,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    title: s.title,
    subtitle: s.subtitle,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    cta2Label: s.cta2Label,
    cta2Href: s.cta2Href,
    textPosition: s.textPosition,
  }));

  // Contenido configurable del resto del Home. null = cristianhdz (JSX original);
  // objeto = tenant con config (merge con defaults para tener todas las secciones).
  const rawSections = resolveHomeSections(hero?.homeSections, ctx.tenant.slug);
  const sec = rawSections === null ? null : { ...HOME_SECTIONS_DEFAULT, ...rawSections };
  const sectionOrder = resolveHomeSectionOrder(sec?.order);

  const programsMapped = featured.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    type: p.type,
    accent: p.accent,
    coverUrl: p.coverUrl,
    coverKind: p.coverKind,
    durationLabel: p.durationLabel,
    modulesCount: p.modulesCount,
    priceUsd: p.priceUsd,
    priceCompareUsd: p.priceCompareUsd,
    bullets: (p.bullets as string[] | null) ?? [],
  }));
  const servicesMapped = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    domain: s.domain,
    kind: s.kind,
    tagline: s.tagline,
    description: s.description,
    glyph: s.glyph,
    hue: s.hue,
    badge: s.badge,
    metricLabel: s.metricLabel,
    priceLabel: s.priceLabel,
    ctaLabel: s.ctaLabel,
    ctaUrl: s.ctaUrl,
    isCtaCard: s.isCtaCard,
    showLiveBadge: s.showLiveBadge,
    coverVideoUrl: s.coverVideoUrl,
    coverUrl: s.coverUrl,
  }));

  // Próximo taller en vivo con fecha real (no evergreen). Si no hay, el CTA
  // final muestra un texto genérico en vez de una fecha inventada.
  const nextLiveTaller = talleres.find(
    (t) => !t.isEvergreen && t.startsAt && new Date(t.startsAt) > now,
  );
  const nextLiveLabel = nextLiveTaller
    ? `PRÓXIMO · ${new Date(nextLiveTaller.startsAt).toLocaleString("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).toUpperCase()}`
    : null;

  return (
    <div>
      <Nav />

      {/* HERO — configurable por tenant (site_settings.heroType).
          '3d' = markup ORIGINAL sin cambios (cristianhdz). 'slider' = carrusel de medios. */}
      {heroType === "3d" ? (
        <section
          id="inicio"
          className="home-hero-3d"
          aria-label={`${ctx.branding.siteName} — Inicio`}
          style={{
            position: "relative",
            height: "100svh",
            minHeight: 560,
            overflow: "hidden",
            background: "#050B1A",
          }}
        >
          {/* H1 real (oculto visualmente) para SEO/accesibilidad: el nombre y el
              titulo se muestran renderizados en 3D dentro del canvas. */}
          <h1
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              margin: -1,
              padding: 0,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {hero
              ? `${hero.heroTitle} ${hero.heroSubtitleAccent ?? ""} ${hero.heroSubtitleRest ?? ""}`.trim()
              : ctx.branding.siteName}
          </h1>

          {/* Visual 3D interactivo (Three.js, in-page): arrastra para rotar en
              desktop; la rueda hace scroll normal de la página. Ver Hero3D.tsx.
              name/subtitle: null en cristianhdz → defaults idénticos. */}
          <Hero3D
            name={hero?.hero3dName ?? undefined}
            subtitle={hero?.hero3dSubtitle ?? undefined}
          />
        </section>
      ) : (
        <HeroSlider
          id="inicio"
          slides={heroSlides}
          height={hero?.heroHeight ?? "full"}
          fit={hero?.heroImageFit ?? "cover"}
          siteName={ctx.branding.siteName}
        />
      )}

      {sectionOrder.map((key) => {
        if (key === "paths") return <PathsSection key={key} config={sec === null ? null : sec.paths ?? null} tp={tp} />;
        if (key === "talleres") return <TalleresSection key={key} config={sec === null ? null : sec.talleres ?? null} talleres={talleres} tp={tp} />;
        if (key === "programas") return <ProgramasSection key={key} config={sec === null ? null : sec.programas ?? null} programs={programsMapped} tp={tp} />;
        if (key === "empresas") return <EmpresasSection key={key} config={sec === null ? null : sec.empresas ?? null} services={servicesMapped} tp={tp} />;
        if (key === "metodo") return <MetodoSection key={key} config={sec === null ? null : sec.metodo ?? null} />;
        return (
          <FinalCtaSection
            key={key}
            config={sec === null ? null : sec.finalCta ?? null}
            hasUser={!!user}
            nextLiveLabel={nextLiveLabel}
            tp={tp}
          />
        );
      })}

      <Footer />
    </div>
  );
}
