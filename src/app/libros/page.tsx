import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

export default function BooksPage() {
  return (
    <div>
      <Nav />

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <Eyebrow>Biblioteca CH · 2 títulos</Eyebrow>
        <h1 style={{ fontSize: "clamp(64px, 9vw, 96px)", marginTop: 16, maxWidth: 1100 }}>
          El arte de hacer <span style={{ color: "var(--warm)" }}>negocios</span>.
        </h1>
        <p style={{ fontSize: 20, color: "var(--muted)", maxWidth: 700, marginTop: 20, lineHeight: 1.5 }}>
          Dos manuales prácticos. Uno para empezar sin capital, otro para construir desde internet. Los mismos principios que se
          enseñan en los talleres.
        </p>
      </section>

      <div className="rule" />

      {/* Book 1 */}
      <BookBlock
        vol="VOLUMEN I"
        accent="warm"
        title="El arte de hacer negocios sin dinero."
        desc="Un manual brutalmente práctico para empezar un negocio sin capital. Validación, oferta, primera venta y caja — sin humo y sin teoría. La base que todo emprendedor necesita antes de gastar un peso."
        bullets={["12 capítulos prácticos", "Plantillas + ejercicios", "Casos reales LATAM", "Audio narrado por Cristian"]}
        digital={29}
        physical={49}
        rating="★ 4.9 · 1.284 reseñas"
        meta="324 págs · 12 caps"
        coverGradient="linear-gradient(135deg, oklch(35% 0.05 50), oklch(20% 0.04 60))"
      />

      {/* Book 2 */}
      <BookBlock
        vol="VOLUMEN II"
        accent="accent"
        flip
        title="El arte de hacer negocios por internet."
        desc="La continuación. Cómo construir presencia, vender en automático y escalar tu negocio aprovechando IA, automatización y comunidades. Para quien ya empezó y quiere escala real."
        bullets={["11 capítulos + 4 anexos", "IA aplicada a ventas", "Funnels y comunidad", "Anexo: agencia con IA"]}
        digital={34}
        physical={54}
        rating="★ 4.9 · 968 reseñas"
        meta="348 págs · 11 caps + anexos"
        coverGradient="linear-gradient(135deg, oklch(40% 0.12 252), oklch(22% 0.08 245))"
      />

      {/* Bundle */}
      <section className="sec" style={{ background: "var(--bg-2)", borderRadius: 32, margin: "0 56px 96px" }}>
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Bundle + Taller</Eyebrow>
            <h2 style={{ fontSize: 64, color: "var(--ink)", marginTop: 16 }}>
              Los 2 libros + el taller del mismo nombre.
            </h2>
          </div>
          <span className="serif" style={{ fontSize: 22, color: "var(--muted)", maxWidth: 320, textAlign: "right" }}>
            La forma más rápida de aplicar lo que leíste con Cristian en vivo.
          </span>
        </div>
        <div className="books-bundle-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr", gap: 24 }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 18, padding: 28, background: "white" }}>
            <Chip>BUNDLE LIBROS</Chip>
            <div className="serif" style={{ fontSize: 56, color: "var(--ink)", marginTop: 16 }}>
              $49
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>Vol. I + Vol. II en digital · ahorra $14</div>
            <Button size="lg" variant="ghost" style={{ marginTop: 24 }}>
              Comprar bundle
            </Button>
          </div>
          <div
            style={{
              border: "2px solid var(--accent)",
              background: "white",
              borderRadius: 18,
              padding: 28,
              position: "relative",
              boxShadow: "0 16px 40px rgba(15,17,21,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: 28,
                background: "var(--accent)",
                color: "white",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              RECOMENDADO
            </div>
            <Chip>LIBROS + 2 TALLERES</Chip>
            <div className="serif" style={{ fontSize: 56, color: "var(--ink)", marginTop: 16 }}>
              $189
            </div>
            <div style={{ color: "var(--ink-2)", marginTop: 4 }}>Bundle + 2 talleres en vivo de Cristian (4h c/u)</div>
            <Button size="lg" variant="accent" style={{ marginTop: 24 }}>
              Quiero esto →
            </Button>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 18, padding: 28, background: "white" }}>
            <Chip>FÍSICOS</Chip>
            <div className="serif" style={{ fontSize: 56, color: "var(--ink)", marginTop: 16 }}>
              $89
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>2 libros físicos firmados + envío LATAM</div>
            <Button size="lg" variant="ghost" style={{ marginTop: 24 }}>
              Comprar físicos
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BookBlock({
  vol,
  accent,
  title,
  desc,
  bullets,
  digital,
  physical,
  rating,
  meta,
  coverGradient,
  flip,
}: {
  vol: string;
  accent: "warm" | "accent";
  title: string;
  desc: string;
  bullets: string[];
  digital: number;
  physical: number;
  rating: string;
  meta: string;
  coverGradient: string;
  flip?: boolean;
}) {
  const accentColor = accent === "warm" ? "var(--warm)" : "var(--accent)";
  const cover = (
    <div style={{ position: "relative" }}>
      <div style={{ aspectRatio: "3/4", position: "relative" }}>
        <div
          className="ph"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 4,
            background: coverGradient,
            border: "none",
            color: "var(--bg)",
            boxShadow: "0 30px 60px rgba(15,17,21,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset",
            flexDirection: "column",
            padding: 40,
            gap: 12,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.7 }}>
            {vol}
          </span>
          <span
            className="serif"
            style={{
              fontSize: 48,
              color: "var(--bg)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              alignSelf: "flex-start",
              textAlign: "left",
            }}
          >
            {title.replace(".", "")}
          </span>
          <span
            style={{
              marginTop: "auto",
              alignSelf: "flex-end",
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            Cristian Hernández
          </span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 24, gap: 12 }}>
        <Chip variant={accent === "warm" ? "warm" : "accent"}>{rating}</Chip>
        <Chip>{meta}</Chip>
      </div>
    </div>
  );

  const text = (
    <div>
      <span className="mono" style={{ fontSize: 12, color: accentColor, letterSpacing: "0.08em" }}>
        {vol} · {accent === "warm" ? "NEGOCIOS" : "INTERNET"}
      </span>
      <h2 style={{ fontSize: 72, marginTop: 12, marginBottom: 20 }}>{title}</h2>
      <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 24 }}>{desc}</p>
      <div className="grid-2" style={{ gap: 16, marginBottom: 32 }}>
        {bullets.map((t) => (
          <div key={t} className="row" style={{ gap: 10, fontSize: 14 }}>
            <span style={{ color: accentColor }}>✦</span> {t}
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 16, paddingTop: 24, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
        <div>
          <div className="serif" style={{ fontSize: 44 }}>
            ${digital}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            DIGITAL · USD
          </div>
        </div>
        <div>
          <div className="serif" style={{ fontSize: 44 }}>
            ${physical}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            FÍSICO · ENVÍO
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Button size="lg" variant="ghost">
            Leer extracto
          </Button>
          <Button size="lg">Comprar →</Button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="sec" style={{ paddingTop: 80 }}>
      <div
        className="book-grid"
        style={{
          display: "grid",
          gridTemplateColumns: flip ? "1fr 0.85fr" : "0.85fr 1fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        {flip ? text : cover}
        {flip ? cover : text}
      </div>
    </section>
  );
}
