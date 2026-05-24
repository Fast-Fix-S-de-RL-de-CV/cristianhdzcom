import Link from "next/link";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { CourseCover } from "@/components/marketing/CourseCover";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const programs = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.isActive, true))
    .orderBy(asc(schema.programs.sortOrder));

  return (
    <div>
      <Nav />

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <Eyebrow>Programas · 2026</Eyebrow>
        <div
          className="between"
          style={{ alignItems: "flex-end", marginTop: 16, marginBottom: 24, flexWrap: "wrap", gap: 24 }}
        >
          <h1 style={{ fontSize: "clamp(56px, 8vw, 96px)", maxWidth: 900 }}>
            Elige tu <span style={{ color: "var(--accent)" }}>punto de entrada</span>.
          </h1>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 360, lineHeight: 1.55 }}>
            Desde un taller gratuito hasta una certificación profesional o que construyamos tu producto. Todos los caminos
            conviven.
          </p>
        </div>

        <div
          className="between"
          style={{
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
            padding: "16px 0",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {["Todos", "Talleres", "Cursos", "Certificación", "Consultoría", "Agencia"].map((f, i) => (
              <Button key={f} variant={i === 0 ? "primary" : "ghost"} size="sm">
                {f}
              </Button>
            ))}
          </div>
          <div className="row" style={{ gap: 16 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              Ordenar por
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Recomendados ↓</span>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 8 }}>
        <div className="grid-3">
          {programs.map((p, i) => {
            const accentColor =
              p.accent === "warm" ? "var(--warm)" : p.accent === "ink" ? "var(--ink)" : "var(--accent)";
            return (
              <Card
                key={p.id}
                hover
                style={{ padding: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}
              >
                {p.isFeatured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      background: "var(--ink)",
                      color: "var(--bg)",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      zIndex: 2,
                    }}
                  >
                    Más elegido
                  </div>
                )}
                <CourseCover
                  coverUrl={p.coverUrl}
                  coverKind={p.coverKind}
                  fallback={String(i + 1).padStart(2, "0")}
                  accent={accentColor}
                  height={180}
                  bottomDivider
                />

                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                  <span className="mono" style={{ fontSize: 11, color: accentColor, letterSpacing: "0.08em" }}>
                    {p.type.toUpperCase()} {p.durationLabel ? `· ${p.durationLabel.toUpperCase()}` : ""}
                  </span>
                  <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05 }}>
                    {p.title}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>
                    {p.subtitle}
                  </p>
                  <div className="rule" />
                  <div className="between">
                    <div>
                      <div className="serif" style={{ fontSize: 32 }}>
                        {p.priceUsd === 0 ? "Gratis" : `$${p.priceUsd}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }} className="mono">
                        {p.priceUsd === 0
                          ? "RESERVA TU CUPO"
                          : p.installmentPriceUsd
                            ? `PAGO ÚNICO · ${p.installmentCount} CUOTAS DE $${p.installmentPriceUsd}`
                            : "PAGO ÚNICO"}
                      </div>
                    </div>
                    <Link href={`/programas/${p.slug}`}>
                      <Button>Ver detalles →</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Compare strip */}
      <section className="sec">
        <Eyebrow>Comparador rápido</Eyebrow>
        <h2 style={{ fontSize: 56, marginTop: 16, marginBottom: 40 }}>¿Cuál es para ti?</h2>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(4, 1fr)", borderBottom: "1px solid var(--line)" }}>
            {["Si tu objetivo es...", "Taller", "Curso", "Certificación", "Agencia"].map((h, i) => (
              <div
                key={h}
                style={{
                  padding: 20,
                  fontFamily: i === 0 ? "var(--font-sans)" : "var(--font-serif)",
                  fontSize: i === 0 ? 13 : 22,
                  color: i === 0 ? "var(--muted)" : "var(--ink)",
                  borderRight: i < 4 ? "1px solid var(--line)" : "none",
                  textTransform: i === 0 ? "uppercase" : "none",
                  letterSpacing: i === 0 ? "0.08em" : "normal",
                  fontWeight: i === 0 ? 500 : 600,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {[
            ["Probar antes de comprar", "●", "—", "—", "—"],
            ["Aprender a programar con IA", "○", "●", "●", "—"],
            ["Vender mi propio producto", "—", "●", "●", "○"],
            ["Conseguir un sello profesional", "—", "—", "●", "—"],
            ["Que construyamos tu producto", "—", "—", "—", "●"],
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr repeat(4, 1fr)",
                borderBottom: i < 4 ? "1px solid var(--line)" : "none",
              }}
            >
              {row.map((c, j) => (
                <div
                  key={j}
                  style={{
                    padding: "18px 20px",
                    fontSize: j === 0 ? 15 : 18,
                    borderRight: j < 4 ? "1px solid var(--line)" : "none",
                    color: c === "●" ? "var(--accent)" : c === "○" ? "var(--warm)" : "var(--line-2)",
                    fontFamily: j === 0 ? "var(--font-sans)" : "var(--font-mono)",
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          ))}
        </Card>
      </section>

      <Footer />
    </div>
  );
}
