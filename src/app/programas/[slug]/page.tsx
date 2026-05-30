import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq, asc, and } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";
import { CurriculumAccordion } from "@/components/marketing/CurriculumAccordion";
import { CourseCover } from "@/components/marketing/CourseCover";
import { FreeEnrollButton } from "./FreeEnrollButton";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
function formatCohortRange(starts: Date, ends: Date) {
  return `${String(starts.getUTCDate()).padStart(2, "0")} ${MONTHS[starts.getUTCMonth()]} — ${String(
    ends.getUTCDate(),
  ).padStart(2, "0")} ${MONTHS[ends.getUTCMonth()]}`;
}

const FAQS = [
  { q: "¿Necesito saber programar?", a: "No. Aceptamos profesionales sin código. Damos un onboarding de 5 días antes del kickoff." },
  { q: "¿Cuánto tiempo necesito por semana?", a: "Entre 6 y 8 horas. Las sesiones en vivo son 2 por semana de 2h." },
  { q: "¿Puedo pagar a plazos?", a: "Sí. 3 cuotas sin intereses con tarjeta. Para empresas emitimos factura." },
  { q: "¿Qué pasa si no me gusta?", a: "14 días de garantía, sin preguntas, devolución íntegra." },
  { q: "¿Recibo certificado?", a: "Sí, al completar los 4 proyectos. Es el sello CH · IA, no decorativo." },
];

const WHO_FOR = [
  { t: "Eres profesional o empleado", d: "Quieres dar el salto a usar IA en serio, no solo ChatGPT casual." },
  { t: "Tienes un negocio", d: "Buscas internalizar software y dejar de depender de freelancers caros." },
  { t: "Vienes del lado de negocio", d: "No programas hoy pero entiendes producto. Te volverás peligroso." },
];

export default async function SalesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.slug, slug)).limit(1);
  if (!program) notFound();

  const [mods, openCohorts, hero] = await Promise.all([
    db.select().from(schema.modules).where(eq(schema.modules.programId, program.id)).orderBy(asc(schema.modules.sortOrder)),
    db
      .select()
      .from(schema.cohorts)
      .where(and(eq(schema.cohorts.programId, program.id), eq(schema.cohorts.isOpen, true)))
      .orderBy(asc(schema.cohorts.startsOn))
      .limit(1),
    getSiteSettings(),
  ]);
  const nextCohort = openCohorts[0];
  const seatsLeft = nextCohort ? Math.max(0, nextCohort.seatsTotal - nextCohort.seatsTaken) : null;
  const cohortRange = nextCohort
    ? formatCohortRange(new Date(nextCohort.startsOn), new Date(nextCohort.endsOn))
    : null;

  // Group modules into 4 weeks of 3
  const weeks: { label: string; mods: typeof mods }[] = [];
  for (let i = 0; i < Math.min(mods.length, 12); i += 3) {
    weeks.push({
      label: `Semana 0${Math.floor(i / 3) + 1} · ${["Fundamentos", "Construcción", "Agentes", "Producto y venta"][Math.floor(i / 3)] || ""}`,
      mods: mods.slice(i, i + 3),
    });
  }

  // Hero stat row derived ONLY from real program data — no invented claims.
  // We show what we can actually verify: real module count, the program's
  // own durationLabel if the admin set one, its type, and live cohort seats.
  const programStats: [string, string][] = [];
  if (mods.length > 0) programStats.push([String(mods.length), mods.length === 1 ? "Módulo" : "Módulos"]);
  if (program.durationLabel && program.durationLabel.trim() !== "") {
    programStats.push([program.durationLabel, "Duración"]);
  }
  programStats.push([program.type.charAt(0).toUpperCase() + program.type.slice(1), "Formato"]);
  if (seatsLeft !== null && seatsLeft > 0) {
    programStats.push([String(seatsLeft), seatsLeft === 1 ? "Cupo" : "Cupos"]);
  }

  return (
    <div>
      <Nav />

      {/* HERO — izq: título + card de inscripción · der: foto + KPIs */}
      <section className="sec" style={{ paddingBottom: 56, position: "relative", overflow: "hidden" }}>
        <div className="mesh" />
        <div
          className="sales-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.1fr",
            gap: 56,
            position: "relative",
            alignItems: "flex-start",
          }}
        >
          {/* ─── IZQUIERDA: breadcrumb + chips + título + subtítulo + CARD INSCRIBIR ─── */}
          <div>
            <div className="row" style={{ gap: 8, color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
              <Link href="/programas">Programas</Link>
              <span>/</span>
              <span style={{ color: "var(--ink)" }}>{program.title}</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
              {nextCohort && seatsLeft !== null && seatsLeft > 0 ? (
                <>
                  <Chip variant="accent" dot pulse style={{ color: "var(--accent)" }}>
                    Generación abierta · {seatsLeft} {seatsLeft === 1 ? "cupo" : "cupos"}
                  </Chip>
                  {cohortRange && <Chip>{cohortRange}</Chip>}
                </>
              ) : (
                <Chip variant="warm" dot style={{ color: "var(--warm)" }}>
                  Lista de espera · próxima generación pronto
                </Chip>
              )}
            </div>

            <h1 style={{ fontSize: "clamp(48px, 6vw, 76px)", marginBottom: 20, lineHeight: 1.05 }}>
              {program.title}
            </h1>
            <p style={{ fontSize: 19, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 32, maxWidth: 560 }}>
              {program.subtitle}
            </p>

            <Card className="sales-pricing-sticky" style={{ padding: 28, boxShadow: "0 12px 40px rgba(15,17,21,0.08)" }}>
              <div className="between" style={{ marginBottom: 16 }}>
                <Chip variant="ink">{program.type.toUpperCase()} · GENERACIÓN</Chip>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  CH-{program.slug.slice(0, 4).toUpperCase()}
                </span>
              </div>
              {/* Pricing block: free courses skip the price + alternative CTAs. */}
              {program.priceUsd === 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
                    <span
                      className="serif"
                      style={{
                        fontSize: 48,
                        background: "linear-gradient(135deg, #2da064 0%, #35B779 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700,
                      }}
                    >
                      GRATIS
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>· acceso completo</span>
                  </div>
                  <FreeEnrollButton slug={program.slug} />
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                    <span className="serif" style={{ fontSize: 56 }}>
                      ${program.priceUsd}
                    </span>
                    <span style={{ color: "var(--muted)" }}>USD</span>
                    {program.priceCompareUsd ? (
                      <span style={{ marginLeft: "auto", textDecoration: "line-through", color: "var(--muted)", fontSize: 16 }}>
                        ${program.priceCompareUsd}
                      </span>
                    ) : null}
                  </div>
                  {program.installmentPriceUsd ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
                      o <strong style={{ color: "var(--ink)" }}>
                        {program.installmentCount} cuotas de ${program.installmentPriceUsd}
                      </strong>{" "}
                      sin intereses
                    </div>
                  ) : null}

                  <Link href={`/checkout/${program.slug}`}>
                    <Button size="lg" style={{ width: "100%", justifyContent: "center" }}>
                      Inscribirme ahora →
                    </Button>
                  </Link>
                </>
              )}

              <div className="rule" style={{ margin: "24px 0" }} />
              <div className="col" style={{ gap: 12 }}>
                {(program.bullets?.length
                  ? program.bullets
                  : [
                      "Acceso de por vida a la plataforma",
                      "Comunidad privada + 4 talleres bonus",
                      "Los 2 libros de Cristian en versión digital",
                      "Garantía de 14 días — sin preguntas",
                    ]
                ).map((t, i) => (
                  <div key={i} className="row" style={{ gap: 10, fontSize: 14 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                      }}
                    >
                      ✓
                    </div>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="rule" style={{ margin: "24px 0" }} />
              <div className="between mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                <span>STRIPE · PAYPAL · OXXO · SPEI</span>
                <span style={{ color: "var(--green)" }}>● SEGURO</span>
              </div>
            </Card>
          </div>

          {/* ─── DERECHA: foto del curso + KPIs ─── */}
          <div style={{ position: "sticky", top: 100 }}>
            {program.coverUrl && program.coverUrl.trim() !== "" ? (
              <CourseCover
                coverUrl={program.coverUrl}
                coverKind={program.coverKind}
                radius={18}
                aspectRatio="16/9"
                zoomable
                galleryId={`programa-${program.slug}`}
                style={{ boxShadow: "0 18px 50px rgba(15,17,21,0.12)" }}
              />
            ) : (
              <div
                className="ph"
                style={{ aspectRatio: "16/9", borderRadius: 18, boxShadow: "0 18px 50px rgba(15,17,21,0.12)" }}
              >
                PORTADA · {program.title.toUpperCase()}
              </div>
            )}

            {programStats.length > 0 && (
              <div
                className="sales-stats-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${programStats.length}, 1fr)`,
                  gap: 16,
                  marginTop: 28,
                  paddingTop: 24,
                  borderTop: "1px solid var(--line)",
                }}
              >
                {programStats.map(([n, l]) => (
                  <div key={l}>
                    <div className="serif" style={{ fontSize: 40, lineHeight: 1.05 }}>
                      {n}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WHO FOR */}
      <section className="sec bdr-t">
        <Eyebrow>¿Para quién es?</Eyebrow>
        <h2 style={{ fontSize: 56, marginTop: 16, marginBottom: 40, maxWidth: 900 }}>Este curso es para ti si...</h2>
        <div className="grid-3">
          {WHO_FOR.map((c, i) => (
            <Card key={i} style={{ padding: 28 }}>
              <div className="serif" style={{ fontSize: 72, lineHeight: 1, color: "var(--accent)", opacity: 0.4 }}>
                0{i + 1}
              </div>
              <h3 className="serif" style={{ fontSize: 26, marginTop: 12 }}>
                {c.t}
              </h3>
              <p style={{ color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>{c.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CURRICULUM */}
      {weeks.length > 0 && (
        <section className="sec bdr-t">
          <div className="between" style={{ marginBottom: 40, alignItems: "flex-end" }}>
            <div>
              <Eyebrow>Currículo</Eyebrow>
              <h2 style={{ fontSize: 56, marginTop: 16 }}>
                {mods.length} {mods.length === 1 ? "módulo" : "módulos"}
                {program.durationLabel && program.durationLabel.trim() !== ""
                  ? ` · ${program.durationLabel}`
                  : ""}
              </h2>
            </div>
          </div>
          <CurriculumAccordion weeks={weeks.map((w) => ({ label: w.label, mods: w.mods.map((m) => `${m.code} — ${m.title}`) }))} />
        </section>
      )}

      {/* INSTRUCTOR */}
      <section className="sec bdr-t" style={{ background: "var(--bg-2)" }}>
        <div className="instructor-grid" style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr", gap: 56 }}>
          <div>
            {hero.heroPortraitUrl ? (
              <img
                src={hero.heroPortraitUrl}
                alt={hero.heroTitle}
                style={{ width: "100%", aspectRatio: "4/5", borderRadius: 18, objectFit: "cover", display: "block" }}
              />
            ) : (
              <div className="ph" style={{ aspectRatio: "4/5", borderRadius: 18 }}>
                RETRATO · CRISTIAN
              </div>
            )}
          </div>
          <div>
            <Eyebrow>Tu instructor</Eyebrow>
            <h2 style={{ fontSize: 64, marginTop: 16 }}>{hero.heroTitle}</h2>
            <p className="serif" style={{ fontSize: 26, marginTop: 16, color: "var(--ink-2)", lineHeight: 1.3 }}>
              Autor, fundador de agencia, programador profesional con IA. Más de una década enseñando negocios sin dinero a
              empresarios reales.
            </p>
            {hero.heroStats && hero.heroStats.length > 0 && (
              <>
                <div className="rule" style={{ margin: "32px 0" }} />
                <div className="grid-3" style={{ gap: 24 }}>
                  {hero.heroStats.map((s) => (
                    <div key={s.label}>
                      <div className="serif" style={{ fontSize: 36 }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }} className="mono">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec bdr-t">
        <div className="faq-grid" style={{ display: "grid", gridTemplateColumns: "0.6fr 1.4fr", gap: 64 }}>
          <div>
            <Eyebrow>Preguntas</Eyebrow>
            <h2 style={{ fontSize: 56, marginTop: 16 }}>
              Resolvemos
              <br />
              antes de cobrar.
            </h2>
          </div>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
