import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ServicesCarousel } from "@/components/marketing/ServicesCarousel";
import { ServicesGrid, type ServiceCard } from "@/components/marketing/ServicesGrid";

export const dynamic = "force-dynamic";

/**
 * /empresas — Catálogo de las empresas y SaaS del estudio.
 *
 * Reutiliza la tabla `services` (misma que alimenta la sección del home).
 * Arriba: carrusel en dirección inversa (a juego con el del home).
 * Abajo: grid completo para quien quiera ver todo de golpe.
 */
export default async function EmpresasPage() {
  const rows = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder));

  const services: ServiceCard[] = rows.map((s) => ({
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
  }));

  const realCount = services.filter((s) => !s.isCtaCard).length;

  return (
    <div>
      <Nav />

      {/* HERO */}
      <section className="sec" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <Eyebrow>Estudio · Empresas y Servicios</Eyebrow>
        <h1 style={{ fontSize: "clamp(48px, 7vw, 88px)", marginTop: 16, maxWidth: 1000, lineHeight: 0.98 }}>
          Las empresas que construí
          <br />
          como <span style={{ color: "var(--accent)" }}>arquitecto de software</span>.
        </h1>
        <p style={{ fontSize: 20, color: "var(--ink-2)", maxWidth: 720, marginTop: 22, lineHeight: 1.5 }}>
          {realCount > 0
            ? `${realCount} ${realCount === 1 ? "marca en operación" : "marcas en operación"}: SaaS productizados, software a la medida, consultoría y agencia. Soy empresario y experto en negocios y programación — consultor de IA y arquitecto de software. Puedes usarlas en tu empresa hoy.`
            : "SaaS productizados, software a la medida, consultoría y agencia. Empresario, experto en negocios y programación, consultor de IA y arquitecto de software."}
        </p>
      </section>

      {/* CARRUSEL (dirección inversa) */}
      {services.length > 0 && (
        <section className="sec" style={{ paddingTop: 0, paddingBottom: 56 }}>
          <ServicesCarousel services={services} />
        </section>
      )}

      <div className="rule" />

      {/* GRID COMPLETO */}
      <section className="sec">
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Catálogo completo</Eyebrow>
            <h2 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginTop: 14 }}>
              Todas mis empresas.
            </h2>
          </div>
          <p style={{ maxWidth: 380, color: "var(--muted)", lineHeight: 1.55, fontSize: 15 }}>
            ¿Necesitas software a medida o sumarte como cliente de alguno de los SaaS? Escríbeme y lo
            vemos.
          </p>
        </div>
        <ServicesGrid services={services} />
      </section>

      {/* CTA */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Card style={{ padding: 56, textAlign: "center", background: "var(--bg-2)" }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", marginBottom: 16 }}>
            ¿Quieres una empresa así para tu negocio?
          </h2>
          <p style={{ fontSize: 17, color: "var(--ink-2)", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.5 }}>
            En la agencia construimos software a medida con IA, o puedes empezar usando uno de los SaaS
            que ya están en producción.
          </p>
          <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:info@cristianhdz.com">
              <Button size="lg">Hablar con la agencia →</Button>
            </a>
            <Link href="/programas">
              <Button size="lg" variant="ghost">
                Ver programas
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
