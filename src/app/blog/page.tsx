import Link from "next/link";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { BlogList } from "@/components/marketing/BlogList";

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

      <BlogList
        posts={rest.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          category: p.category,
          readMinutes: p.readMinutes,
          publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
        }))}
      />

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
