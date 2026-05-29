import Link from "next/link";
import { db, schema } from "@/db";
import { and, asc, eq, gt, ne, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TallerBanner } from "@/components/marketing/TallerBanner";
import { ProgramsCarousel } from "@/components/marketing/ProgramsCarousel";
import { ServicesCarousel } from "@/components/marketing/ServicesCarousel";
import { HeroPortraitImg } from "@/components/marketing/HeroPortraitImg";
import { getSiteSettings, renderMarkdownLight } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const PATHS = [
  {
    eyebrow: "CAMINO · A",
    tag: "USA MIS SAAS",
    title: "Mejora tu negocio con nuestros productos.",
    desc: "Tenemos 5 SaaS en producción para PyMEs: punto de venta, tienda online, rifas, marketing y servicios profesionales. Empieza desde $19/mes.",
    cta: "Ver SaaS",
    kpi: "5 productos · LATAM",
    color: "warm" as const,
    href: "/#saas",
  },
  {
    eyebrow: "CAMINO · B",
    tag: "APRENDE NEGOCIOS",
    title: "Aprende a hacer negocios con IA.",
    desc: "Mis 2 libros y mis programas para empezar sin dinero, validar y escalar por internet. Para empresarios, empleados y profesionales.",
    cta: "Ver programas",
    kpi: "2 libros + generación",
    color: "accent" as const,
    href: "/programas",
  },
  {
    eyebrow: "CAMINO · C",
    tag: "APRENDE A PROGRAMAR",
    title: "Aprende a programar con IA — profesional.",
    desc: "Sendero estilo Duolingo, mentorías 1:1 y proyectos reales. De cero a entregar productos como un senior — usando agentes y modelos de frontera.",
    cta: "Ver plataforma",
    kpi: "12 módulos · certificación",
    color: "ink" as const,
    href: "/programas/programacion-con-ia",
  },
];

export default async function HomePage() {
  const now = new Date();
  const [user, featured, talleres, services, hero] = await Promise.all([
    getCurrentUser(),
    // Programas y certificaciones (excluye talleres — esos viven en su propia
    // sección de banners arriba). Trae varios para alimentar el carrusel.
    db
      .select()
      .from(schema.programs)
      .where(
        and(
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
        or(
          eq(schema.events.isEvergreen, true),
          gt(schema.events.startsAt, now),
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
      .where(eq(schema.services.isActive, true))
      .orderBy(asc(schema.services.sortOrder))
      .limit(12),
    // Site settings singleton — controla todo el hero (título, bio, foto, etc).
    getSiteSettings(),
  ]);

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

      {/* HERO */}
      <section className="sec" style={{ paddingTop: 64, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
        <div className="mesh" />
        <div className="hero-orbit">
          <div className="orbit-ring" style={{ width: 900, height: 900, top: -200, right: -300 }} />
          <div
            className="orbit-ring"
            style={{ width: 1300, height: 1300, top: -400, right: -500, animationDuration: "120s", animationDirection: "reverse" }}
          />
        </div>

        <div
          className="hero-grid"
          style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center", position: "relative" }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {hero.heroChip1Label && (
                <Chip variant="accent" dot pulse={hero.heroChip1Pulse} style={{ color: "var(--accent)" }}>
                  {hero.heroChip1Label}
                </Chip>
              )}
              {hero.heroChip2Label && <Chip>{hero.heroChip2Label}</Chip>}
            </div>
            <Eyebrow style={{ marginBottom: 18 }}>{hero.heroEyebrow}</Eyebrow>
            <h1 style={{ fontSize: "clamp(56px, 7vw, 96px)", marginBottom: 22, lineHeight: 0.95 }}>
              {hero.heroTitle}
            </h1>
            {(hero.heroSubtitleAccent || hero.heroSubtitleRest) && (
              <h2
                className="serif"
                style={{
                  fontSize: "clamp(24px, 3vw, 36px)",
                  lineHeight: 1.15,
                  color: "var(--ink-2)",
                  marginBottom: 28,
                  fontWeight: 500,
                }}
              >
                {hero.heroSubtitleAccent && (
                  <span style={{ color: "var(--accent)" }}>{hero.heroSubtitleAccent}</span>
                )}
                {hero.heroSubtitleAccent && hero.heroSubtitleRest && " "}
                {hero.heroSubtitleRest}
              </h2>
            )}
            {hero.heroBio1 && (
              <p style={{ fontSize: 19, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 580, marginBottom: 20 }}>
                {renderMarkdownLight(hero.heroBio1)}
              </p>
            )}
            {hero.heroBio2 && (
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, maxWidth: 560, marginBottom: 36 }}>
                {renderMarkdownLight(hero.heroBio2)}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Link href={user ? "/plataforma" : "/registro"}>
                <Button size="lg" shine>
                  {user ? "Ir a mi plataforma →" : hero.heroCtaPrimaryLabel}
                </Button>
              </Link>
              <Link href="#saas">
                <Button size="lg" variant="ghost">
                  {hero.heroCtaSecondaryLabel}
                </Button>
              </Link>
              <Link href="/programas">
                <Button size="lg" variant="ghost">
                  Programas
                </Button>
              </Link>
            </div>
          </div>

          {/* RIGHT: Portrait */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                aspectRatio: "4/5",
                borderRadius: 22,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 30px 60px rgba(15,17,21,0.18)",
                background: "linear-gradient(135deg, oklch(78% 0.04 245), oklch(68% 0.05 252))",
              }}
            >
              {hero.heroPortraitUrl ? (
                <HeroPortraitImg
                  src={hero.heroPortraitUrl}
                  alt={`${hero.heroTitle} — ${hero.heroSubtitleAccent ?? ""} ${hero.heroSubtitleRest ?? ""}`.trim()}
                />
              ) : null}
              {/* Overlay gradient sutil para legibilidad del chip inferior */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  bottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  zIndex: 2,
                }}
              >
                <div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.9)", letterSpacing: "0.12em" }}
                  >
                    {hero.heroPortraitFooterLine}
                  </div>
                  <div className="serif" style={{ fontSize: 26, color: "white", marginTop: 4, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                    {hero.heroTitle.replace(/\.$/, "")}
                  </div>
                </div>
                <Chip
                  style={{ background: "oklch(94% 0.05 145)", color: "oklch(40% 0.13 145)", borderColor: "transparent" }}
                >
                  {hero.heroPortraitChip}
                </Chip>
              </div>
            </div>

            {/* Floating credibility card */}
            <Card
              className="hero-credibility-float"
              style={{
                position: "absolute",
                bottom: -28,
                left: -36,
                padding: 16,
                width: 250,
                boxShadow: "0 16px 40px rgba(15,17,21,0.12)",
              }}
            >
              <Eyebrow style={{ marginBottom: 8 }}>Trayectoria</Eyebrow>
              <div className="grid-2" style={{ gap: 12 }}>
                {hero.heroStats.slice(0, 4).map((s, i) => (
                  <div key={i}>
                    <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>
                      {s.value}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Floating quote */}
            {hero.heroQuoteText && (
              <Card
                className="hero-quote-float"
                style={{ position: "absolute", top: 32, right: -28, padding: 16, width: 230, borderLeft: "3px solid var(--accent)" }}
              >
                <span className="serif" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: "var(--ink)" }}>
                  &ldquo;{hero.heroQuoteText}&rdquo;
                </span>
                {hero.heroQuoteAttrib && (
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, letterSpacing: "0.08em" }}>
                    {hero.heroQuoteAttrib}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* TRES CAMINOS */}
      <section className="sec">
        <div className="paths-header-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: 56, marginBottom: 64 }}>
          <div>
            <Eyebrow>Lo que hago</Eyebrow>
            <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>
              Tres formas
              <br />
              de trabajar <span style={{ color: "var(--accent)" }}>conmigo</span>.
            </h2>
          </div>
          <p style={{ fontSize: 18, color: "var(--ink-2)", lineHeight: 1.55, alignSelf: "end", maxWidth: 540 }}>
            Mismo origen — distintos puntos de entrada. Elige el que se parezca más a donde estás hoy.
          </p>
        </div>

        <div className="grid-3">
          {PATHS.map((c, i) => {
            const accentColor = c.color === "accent" ? "var(--accent)" : c.color === "warm" ? "var(--warm)" : "var(--ink)";
            const decoBg = c.color === "accent" ? "var(--accent-soft)" : c.color === "warm" ? "var(--warm-soft)" : "var(--bg-2)";
            return (
              <Link key={i} href={c.href} style={{ display: "block" }}>
                <Card
                  hover
                  style={{
                    padding: 28,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    minHeight: 420,
                    position: "relative",
                    overflow: "hidden",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 160,
                      height: 160,
                      borderRadius: "50%",
                      background: decoBg,
                    }}
                  />
                  <div className="between" style={{ position: "relative" }}>
                    <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: accentColor }}>
                      {c.eyebrow}
                    </span>
                    <Chip>{c.tag}</Chip>
                  </div>
                  <h3 className="serif" style={{ fontSize: 32, lineHeight: 1.05, position: "relative" }}>
                    {c.title}
                  </h3>
                  <p style={{ color: "var(--muted)", lineHeight: 1.55, fontSize: 15, flex: 1, position: "relative" }}>
                    {c.desc}
                  </p>
                  <div className="rule" />
                  <div className="between" style={{ position: "relative" }}>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                    >
                      {c.kpi}
                    </span>
                    <span className="serif" style={{ fontSize: 20 }}>
                      {c.cta} →
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="rule" />

      {/* TALLERES EN VIVO + EVERGREEN · banners horizontales */}
      {talleres.length > 0 && (
        <section className="sec">
          <div
            className="between"
            style={{ alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 24 }}
          >
            <div>
              <Eyebrow>Talleres · en vivo y on-demand</Eyebrow>
              <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16 }}>
                Aprende <span style={{ color: "var(--warm)" }}>de mí en vivo</span>.
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16, maxWidth: 600, lineHeight: 1.55 }}>
                Sesiones en vivo y webinars siempre disponibles (evergreen). Aplica lo que aprendes
                en tiempo real con casos reales.
              </p>
            </div>
            <Link href="/programas?filtro=taller">
              <Button variant="ghost">Ver todos los talleres →</Button>
            </Link>
          </div>

          {/* Lista vertical: 1 taller por fila, card horizontal compacta */}
          <div
            className="talleres-banners"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {talleres.map((t, i) => (
              <TallerBanner key={t.id} taller={t} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      <div className="rule" />

      {/* PROGRAMAS Y CERTIFICACIONES · carrusel horizontal con toggle inline */}
      {featured.length > 0 && (
        <section className="sec">
          <div
            className="between"
            style={{ alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 24 }}
          >
            <div>
              <Eyebrow>Catálogo · 2026</Eyebrow>
              <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16 }}>
                Programas y <span style={{ color: "var(--accent)" }}>Certificaciones</span>.
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16, maxWidth: 600, lineHeight: 1.55 }}>
                Contenido grabado profesional, módulos completos con plan de pagos, comunidad
                propia del curso y garantía 30 días. Da click en "Más info" para ver qué incluye
                sin salir de aquí.
              </p>
            </div>
            <Link href="/programas">
              <Button variant="ghost">Ver todos los programas →</Button>
            </Link>
          </div>
          <ProgramsCarousel
            programs={featured.map((p) => ({
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
            }))}
          />
        </section>
      )}

      <div className="rule" />

      {/* EMPRESAS Y SERVICIOS — alimentado desde DB (admin/servicios) */}
      <section id="saas" className="sec" style={{ paddingTop: 80 }}>
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Estudio · Empresas y Servicios</Eyebrow>
            <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>
              Así es como te puedo ayudar
              <br />
              con mis <span style={{ color: "var(--accent)" }}>empresas</span>.
            </h2>
          </div>
          <p style={{ maxWidth: 360, color: "var(--muted)", lineHeight: 1.55, fontSize: 16 }}>
            SaaS productizados, software a medida, consultoría y agencia. Cada uno es un caso real de
            cómo aplicamos IA + negocios. Úsalos en tu empresa.
          </p>
        </div>

        {/* Carrusel en dirección inversa (a juego con el de programas) */}
        <ServicesCarousel
          services={services.map((s) => ({
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
          }))}
        />

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link href="/empresas">
            <Button variant="ghost">Ver todas mis empresas →</Button>
          </Link>
        </div>
      </section>

      <div className="rule" />

      {/* MÉTODO CH */}
      <section className="sec" style={{ background: "var(--bg-2)", borderRadius: 32, margin: "0 56px" }}>
        <div className="between" style={{ marginBottom: 56, alignItems: "flex-end", flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>02 · Método CH</Eyebrow>
            <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16, color: "var(--ink)" }}>
              De aprendiz a operador
              <br />
              en cuatro fases.
            </h2>
          </div>
          <span className="serif" style={{ fontSize: 22, color: "var(--muted)", maxWidth: 320, textAlign: "right" }}>
            Cada fase desbloquea una entrega real: cliente, prototipo, MRR o equipo.
          </span>
        </div>
        <div className="grid-4">
          {[
            ["Fundamentos", "Lenguaje, modelos, ética y arquitectura básica. Tu base sólida."],
            ["Práctica", "Construyes 4 productos cortos con IA. Empiezas a vender al cierre."],
            ["Negocio", "Validamos tu nicho, pricing y oferta. Lanzas con automatización."],
            ["Escala", "Cierras consultoría o entras a la agencia como operador certificado."],
          ].map(([t, d], i) => (
            <div
              key={t}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: 20,
                background: "white",
                borderRadius: 14,
                border: "1px solid var(--line)",
              }}
            >
              <div className="serif" style={{ fontSize: 56, color: "var(--accent)", lineHeight: 1, opacity: 0.85 }}>
                0{i + 1}
              </div>
              <h3 style={{ color: "var(--ink)", fontSize: 24 }}>{t}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="sec" style={{ paddingTop: 32 }}>
        <Card style={{ padding: 64, position: "relative", overflow: "hidden", background: "var(--bg-2)" }}>
          <div className="mesh" />
          <div
            className="final-cta-grid"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div>
              <Chip variant="ink">PUNTO DE PARTIDA</Chip>
              <h2 style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 24, marginBottom: 20 }}>
                Empieza con un <span style={{ color: "var(--accent)" }}>taller gratuito</span> esta semana.
              </h2>
              <p style={{ fontSize: 18, color: "var(--ink-2)", maxWidth: 540 }}>
                Entra a la comunidad, asiste a un taller en vivo y decide después si quieres certificarte o que nuestra agencia
                construya contigo.
              </p>
            </div>
            <div className="col">
              <Link href={user ? "/plataforma" : "/registro"}>
                <Button size="lg" style={{ width: "100%", justifyContent: "center" }}>
                  {user ? "Ir a mi plataforma →" : "Reservar taller gratis →"}
                </Button>
              </Link>
              <Link href="/programas">
                <Button size="lg" variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                  Ver programas pagos
                </Button>
              </Link>
              {nextLiveLabel && (
                <div style={{ fontSize: 12, color: "var(--muted)" }} className="mono">
                  {nextLiveLabel}
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
