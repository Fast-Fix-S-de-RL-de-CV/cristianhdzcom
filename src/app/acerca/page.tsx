import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

      {/* ───────── HERO — Galería infinita ───────── */}
      <section
        className="acerca-hero-gallery"
        aria-label={`Acerca de ${fullName}`}
        style={{
          position: "relative",
          width: "100%",
          height: "88svh",
          minHeight: 520,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {/* Widget self-contained (Lenis + GSAP, scroll infinito con snap +
            parallax) embebido en iframe para que su scroll NO secuestre el de
            la página. Vive en /public/galeria-infinita. */}
        <iframe
          src="/galeria-infinita/index.html"
          title="Galería infinita"
          loading="eager"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />

        {/* Overlay de identidad + CTA. pointer-events:none deja pasar el scroll
            a la galería; solo el botón "Conóceme" recibe clics. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "clamp(24px, 5vw, 64px)",
            background:
              "linear-gradient(to top, rgba(6,10,20,0.74) 0%, rgba(6,10,20,0.18) 40%, rgba(6,10,20,0) 62%)",
          }}
        >
          <div style={{ maxWidth: 920 }}>
            <div
              className="mono"
              style={{
                color: "rgba(255,255,255,0.82)",
                letterSpacing: "0.16em",
                fontSize: 12,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Acerca de mí
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: "clamp(40px, 6.5vw, 84px)",
                lineHeight: 0.98,
                margin: 0,
                textShadow: "0 2px 36px rgba(0,0,0,0.45)",
              }}
            >
              {fullName}.
            </h1>
            {role && (
              <p
                className="serif"
                style={{
                  color: "rgba(255,255,255,0.86)",
                  fontSize: "clamp(18px, 2.4vw, 28px)",
                  marginTop: 14,
                  maxWidth: 680,
                  textShadow: "0 2px 24px rgba(0,0,0,0.4)",
                }}
              >
                {role}
              </p>
            )}
            <a
              href="#acerca-historia"
              style={{
                pointerEvents: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginTop: 28,
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.34)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              Conóceme
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* ───────── NARRATIVA / BIO ───────── */}
      <section id="acerca-historia" className="sec" style={{ scrollMarginTop: 80 }}>
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
