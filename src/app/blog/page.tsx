import Link from "next/link";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await db
    .select()
    .from(schema.blogPosts)
    .orderBy(desc(schema.blogPosts.publishedAt))
    .limit(20);

  const featured = posts.find((p) => p.isFeatured) || posts[0];
  const rest = posts.filter((p) => p.id !== featured?.id).slice(0, 9);

  return (
    <div>
      <Nav />

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 56 }}>
        <div className="between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Cuaderno · {posts.length} artículos</Eyebrow>
            <h1 style={{ fontSize: "clamp(64px, 9vw, 96px)", marginTop: 16 }}>Pensar en voz alta.</h1>
          </div>
          <p style={{ maxWidth: 360, color: "var(--muted)", lineHeight: 1.55 }}>
            Notas semanales de Cristian. Estrategia, código, casos reales y decisiones detrás de cada lanzamiento. Persuasivas
            porque son verdaderas.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Link href={`/blog/${featured.slug}`}>
            <Card
              hover
              className="blog-featured-grid"
              style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr" }}
            >
              <div
                className="ph"
                style={{
                  borderRadius: 0,
                  border: "none",
                  borderRight: "1px solid var(--line)",
                  minHeight: 480,
                  background: "linear-gradient(135deg, oklch(40% 0.12 252), oklch(28% 0.08 245))",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                ARTE EDITORIAL · DESTACADO
              </div>
              <div style={{ padding: 56, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div className="row" style={{ gap: 12, marginBottom: 24 }}>
                    <Chip variant="ink">DESTACADO</Chip>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {featured.category?.toUpperCase()} · {featured.readMinutes} MIN ·{" "}
                      {featured.publishedAt
                        ? new Date(featured.publishedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                        : ""}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 56, marginBottom: 20 }}>{featured.title}</h2>
                  <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ink-2)" }}>
                    {featured.excerpt}
                  </p>
                </div>
                <div
                  className="between"
                  style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}
                >
                  <div className="row" style={{ gap: 12 }}>
                    <div className="av" style={{ background: "var(--ink)", color: "var(--bg)" }}>
                      CH
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Cristian Hernández</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        FUNDADOR
                      </div>
                    </div>
                  </div>
                  <Button>Leer ensayo →</Button>
                </div>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* Filter */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div
          className="row"
          style={{
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
            padding: "16px 0",
            gap: 8,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {["Todo", "IA · Ingeniería", "Negocios", "Casos reales", "Tutoriales", "Opinión"].map((f, i) => (
              <Button key={f} size="sm" variant={i === 0 ? "primary" : "ghost"}>
                {f}
              </Button>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Buscar</span>
            <div
              style={{
                border: "1px solid var(--line-2)",
                borderRadius: 999,
                padding: "8px 14px",
                minWidth: 200,
                fontSize: 13,
                color: "var(--muted)",
                background: "white",
              }}
            >
              ⌕ palabras clave…
            </div>
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="grid-3">
          {rest.map((p, i) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="lift" style={{ display: "block" }}>
              <div
                className="ph"
                style={{
                  aspectRatio: "4/3",
                  borderRadius: 14,
                  marginBottom: 16,
                  background:
                    i % 3 === 0
                      ? "linear-gradient(135deg, oklch(95% 0.04 252), oklch(88% 0.05 252))"
                      : i % 3 === 1
                        ? "linear-gradient(135deg, oklch(95% 0.04 75), oklch(88% 0.06 75))"
                        : "linear-gradient(135deg, var(--bg-2), var(--bg-3))",
                  border: "none",
                  color: "var(--ink-2)",
                }}
              >
                <span className="serif" style={{ fontSize: 56, opacity: 0.5 }}>
                  0{i + 1}
                </span>
              </div>
              <div className="row" style={{ gap: 12, marginBottom: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                <span style={{ color: "var(--ink)" }}>{p.category?.toUpperCase()}</span>
                <span>·</span>
                <span>{p.readMinutes} MIN</span>
                <span>·</span>
                <span>
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).toUpperCase()
                    : ""}
                </span>
              </div>
              <h3 className="serif" style={{ fontSize: 26, lineHeight: 1.1 }}>
                {p.title}
              </h3>
              <div className="row" style={{ gap: 8, marginTop: 16, fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Cristian Hernández</span>
                <span style={{ marginLeft: "auto", color: "var(--accent)" }}>Leer →</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="center" style={{ marginTop: 56 }}>
          <Button size="lg" variant="ghost">
            Ver más artículos
          </Button>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      <Footer />
    </div>
  );
}

function NewsletterSection() {
  return (
    <section className="sec">
      <Card style={{ padding: 56, background: "var(--bg-2)", position: "relative", overflow: "hidden" }}>
        <div className="mesh" />
        <div
          className="newsletter-grid"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <Eyebrow>Newsletter · domingos</Eyebrow>
            <h2 style={{ fontSize: 56, marginTop: 16 }}>
              Una idea al domingo.
              <br />
              14.300 lectores serios.
            </h2>
            <p style={{ fontSize: 17, color: "var(--muted)", marginTop: 16, maxWidth: 560 }}>
              Cada domingo te mando una idea aplicable, un caso real y un atajo de IA. Cero relleno, máximo 4 minutos.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </Card>
    </section>
  );
}

import { NewsletterForm } from "@/components/marketing/NewsletterForm";
