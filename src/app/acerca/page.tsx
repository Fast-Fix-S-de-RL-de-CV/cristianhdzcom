import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getSiteSettings, renderMarkdownLight } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/**
 * /acerca — Página personal dedicada a Cristian Hernández.
 *
 * Toda la información biográfica viene de `site_settings` (la misma fila
 * singleton que controla el hero del home, editable desde /admin/ajustes/hero).
 * NO inventamos datos: usamos el título, subtítulo, bio, retrato, stats y quote
 * reales. La foto es la misma que el admin sube para el hero.
 *
 * Estructura editorial:
 *   1. Hero personal: retrato grande + nombre + título + intro
 *   2. Narrativa: los dos párrafos de bio expandidos en una historia legible
 *   3. Trayectoria: los stats reales en formato timeline/grid
 *   4. En lo que creo: la quote como manifiesto
 *   5. CTA hacia empresas / programas
 */
export default async function AcercaPage() {
  const hero = await getSiteSettings();
  const fullName = hero.heroTitle.replace(/\.$/, "");
  const role = `${hero.heroSubtitleAccent ?? ""} ${hero.heroSubtitleRest ?? ""}`.trim();

  return (
    <div>
      <Nav />

      {/* ───────── HERO PERSONAL ───────── */}
      <section className="sec" style={{ paddingTop: 56, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
        <div className="mesh" />
        <div
          className="acerca-hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "0.85fr 1fr",
            gap: 56,
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Retrato */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                aspectRatio: "4/5",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 30px 70px rgba(15,17,21,0.22)",
                background: "linear-gradient(135deg, oklch(78% 0.04 245), oklch(68% 0.05 252))",
                position: "relative",
              }}
            >
              {hero.heroPortraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.heroPortraitUrl}
                  alt={fullName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  className="center"
                  style={{ position: "absolute", inset: 0, color: "rgba(255,255,255,0.7)" }}
                >
                  <span className="serif" style={{ fontSize: 40 }}>
                    {fullName}
                  </span>
                </div>
              )}
            </div>
            {/* Chip flotante */}
            <Card
              className="acerca-portrait-chip"
              style={{
                position: "absolute",
                bottom: -22,
                right: -20,
                padding: "12px 18px",
                boxShadow: "0 16px 40px rgba(15,17,21,0.14)",
              }}
            >
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>
                {hero.heroPortraitFooterLine}
              </div>
            </Card>
          </div>

          {/* Texto */}
          <div>
            <Eyebrow style={{ marginBottom: 16 }}>Acerca de mí</Eyebrow>
            <h1 style={{ fontSize: "clamp(48px, 6.5vw, 84px)", lineHeight: 0.98, marginBottom: 16 }}>
              {fullName}.
            </h1>
            {role && (
              <h2
                className="serif"
                style={{ fontSize: "clamp(22px, 3vw, 34px)", color: "var(--ink-2)", fontWeight: 500, marginBottom: 28 }}
              >
                {hero.heroSubtitleAccent && (
                  <span style={{ color: "var(--accent)" }}>{hero.heroSubtitleAccent}</span>
                )}
                {hero.heroSubtitleAccent && hero.heroSubtitleRest && " "}
                {hero.heroSubtitleRest}
              </h2>
            )}
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
              {hero.heroChip1Label && (
                <Chip variant="accent" dot style={{ color: "var(--accent)" }}>
                  {hero.heroChip1Label}
                </Chip>
              )}
              {hero.heroChip2Label && <Chip>{hero.heroChip2Label}</Chip>}
            </div>
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <Link href="/empresas">
                <Button size="lg">Ver mis empresas →</Button>
              </Link>
              <Link href="/programas">
                <Button size="lg" variant="ghost">
                  Aprender conmigo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* ───────── NARRATIVA / BIO ───────── */}
      <section className="sec">
        <div className="acerca-bio-grid" style={{ display: "grid", gridTemplateColumns: "0.5fr 1fr", gap: 56 }}>
          <div>
            <Eyebrow>Mi historia</Eyebrow>
            <h2 className="serif" style={{ fontSize: "clamp(32px, 4vw, 52px)", marginTop: 14, lineHeight: 1.05 }}>
              De código a empresa.
            </h2>
          </div>
          <div className="col" style={{ gap: 24, maxWidth: 680 }}>
            {hero.heroBio1 && (
              <p style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.6 }}>
                {renderMarkdownLight(hero.heroBio1)}
              </p>
            )}
            {hero.heroBio2 && (
              <p style={{ fontSize: 18, color: "var(--ink-2)", lineHeight: 1.65 }}>
                {renderMarkdownLight(hero.heroBio2)}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* ───────── TRAYECTORIA (stats reales) ───────── */}
      {hero.heroStats.length > 0 && (
        <section className="sec">
          <Eyebrow>Trayectoria</Eyebrow>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", marginTop: 14, marginBottom: 48 }}>
            En números.
          </h2>
          <div
            className="acerca-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(hero.heroStats.length, 4)}, 1fr)`,
              gap: 24,
            }}
          >
            {hero.heroStats.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "28px 24px",
                  background: "white",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                }}
              >
                <div className="serif" style={{ fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1, color: "var(--ink)" }}>
                  {s.value}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 12, textTransform: "uppercase" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────── MANIFIESTO / QUOTE ───────── */}
      {hero.heroQuoteText && (
        <section className="sec" style={{ paddingTop: 16 }}>
          <Card style={{ padding: "clamp(40px, 6vw, 80px)", background: "var(--bg-2)", borderLeft: "4px solid var(--accent)" }}>
            <Eyebrow style={{ marginBottom: 24 }}>En lo que creo</Eyebrow>
            <p className="serif" style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.25, color: "var(--ink)", maxWidth: 900 }}>
              &ldquo;{hero.heroQuoteText}&rdquo;
            </p>
            {hero.heroQuoteAttrib && (
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 24, letterSpacing: "0.1em" }}>
                {hero.heroQuoteAttrib}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ───────── CTA ───────── */}
      <section className="sec" style={{ paddingTop: 16 }}>
        <div className="acerca-cta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card hover style={{ padding: 40 }}>
            <Eyebrow>Trabajemos juntos</Eyebrow>
            <h3 className="serif" style={{ fontSize: 30, marginTop: 12, marginBottom: 12 }}>
              Conoce mis empresas.
            </h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.55, marginBottom: 24 }}>
              SaaS en producción, agencia de software a medida y consultoría. Casos reales que puedes
              usar en tu negocio.
            </p>
            <Link href="/empresas">
              <Button>Ver empresas →</Button>
            </Link>
          </Card>
          <Card hover style={{ padding: 40 }}>
            <Eyebrow>Aprende conmigo</Eyebrow>
            <h3 className="serif" style={{ fontSize: 30, marginTop: 12, marginBottom: 12 }}>
              Programas y libros.
            </h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.55, marginBottom: 24 }}>
              Te enseño a hacer negocios y a programar con IA — desde cero hasta entregar productos
              reales. Empieza gratis.
            </p>
            <Link href="/programas">
              <Button variant="ghost">Ver programas →</Button>
            </Link>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
