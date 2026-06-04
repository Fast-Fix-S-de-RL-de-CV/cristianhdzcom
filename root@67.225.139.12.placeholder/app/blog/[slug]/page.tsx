import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { NewsletterForm } from "@/components/marketing/NewsletterForm";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug)).limit(1);
  if (!post) notFound();

  return (
    <div>
      <Nav />
      <article className="sec" style={{ paddingTop: 64, paddingBottom: 96, maxWidth: 880, margin: "0 auto" }}>
        <div className="row" style={{ gap: 12, marginBottom: 24 }}>
          <Chip variant="accent">{post.category}</Chip>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {post.readMinutes} MIN ·{" "}
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
              : ""}
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 24, lineHeight: 1.05 }}>{post.title}</h1>
        <p style={{ fontSize: 22, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 40 }}>{post.excerpt}</p>
        <div className="row" style={{ gap: 12, marginBottom: 56, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <div className="av" style={{ background: "var(--ink)", color: "var(--bg)" }}>
            CH
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Cristian Hernández</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>FUNDADOR · CH · IA</div>
          </div>
        </div>
        <div
          style={{ fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}
          dangerouslySetInnerHTML={{ __html: post.body.replace(/\n/g, "<br />") }}
        />
      </article>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <Eyebrow>Quédate cerca</Eyebrow>
          <h2 style={{ fontSize: 40, marginTop: 12, marginBottom: 24 }}>
            Una idea al domingo. Aplicable, no genérica.
          </h2>
          <NewsletterForm source="blog-post" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
