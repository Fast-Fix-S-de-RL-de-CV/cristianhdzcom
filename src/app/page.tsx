import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";

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
    kpi: "2 libros + cohorte",
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

const SAAS = [
  {
    name: "BengalPOS",
    dom: "bengalpos.com",
    tag: "PUNTO DE VENTA",
    desc: "POS en la nube para restaurantes y retail. Inventario, cocina, facturación y reportería con IA.",
    users: "+ 2.400 negocios",
    price: "Desde $29/mes",
    hue: 22,
    glyph: "B",
    badge: "INSIGNIA",
  },
  {
    name: "Tienda Syscom",
    dom: "tiendasyscom.com",
    tag: "E-COMMERCE",
    desc: "Tu tienda online con catálogo, pagos LATAM y recomendaciones con IA. Sin código, lista en 1 día.",
    users: "+ 1.100 tiendas",
    price: "Desde $19/mes",
    hue: 195,
    glyph: "TS",
    badge: "TOP LATAM",
  },
  {
    name: "MejorPRO",
    dom: "mejorpro.com",
    tag: "SERVICIOS · MARKETPLACE",
    desc: "Marketplace para profesionales independientes — agenda, cobro, reputación y captación con IA.",
    users: "+ 8.300 profesionales",
    price: "Comisión 8%",
    hue: 165,
    glyph: "M+",
    badge: "NUEVO",
  },
  {
    name: "RifaBase",
    dom: "rifabase.com",
    tag: "RIFAS Y SORTEOS",
    desc: "Plataforma legal para organizar rifas en línea. Pagos, sorteo verificado y notificaciones automáticas.",
    users: "+ $4M sorteados",
    price: "Comisión 4%",
    hue: 50,
    glyph: "RB",
    badge: "TRENDING",
  },
  {
    name: "Organimarketing",
    dom: "organimarketing.com",
    tag: "MARKETING · IA",
    desc: "Agencia de marketing automatizada con agentes IA: copy, anuncios, calendario y reportes en una plataforma.",
    users: "+ 320 marcas",
    price: "Desde $89/mes",
    hue: 30,
    glyph: "OM",
    badge: "AGENCIA",
  },
  {
    name: "Tu próximo SaaS",
    dom: "agencia.ch",
    tag: "AGENCIA · CONSTRUIMOS",
    desc: "¿Tienes una idea? Nuestra agencia construye tu SaaS con el mismo método. Cotización en 48h.",
    users: "Proyecto a medida",
    price: "Hablemos",
    hue: 0,
    glyph: "+",
    badge: "",
    cta: true,
  },
];

const TESTIMONIALS = [
  {
    name: "María R.",
    role: "CFO · PyME industrial",
    q: "Pasé de no programar a tener 3 sistemas internos que ahorran $18k al mes. La certificación me abrió la conversación con dirección.",
  },
  {
    name: "Luis F.",
    role: "Fundador · Agencia LATAM",
    q: "Cerré un cliente de $24.000 en la segunda semana usando el método de oferta de Cristian. Ahora opero con dos agentes IA.",
  },
  {
    name: "Diana P.",
    role: "Gerente de Producto",
    q: "El sendero estilo Duolingo me mantuvo enganchada. En 3 meses entregué un MVP que era propuesta de mi área hace 2 años.",
  },
];

const BRANDS = [
  "SANTANDER",
  "BBVA",
  "BIMBO",
  "CEMEX",
  "FALABELLA",
  "RAPPI",
  "MERCADOLIBRE",
  "CORONA",
  "TELMEX",
  "GRUPO·MODELO",
];

export default function HomePage() {
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
          style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center", position: "relative" }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              <Chip variant="accent" dot pulse style={{ color: "var(--accent)" }}>
                Disponible · cohorte Mar 2026
              </Chip>
              <Chip>AUTOR · FUNDADOR · MENTOR</Chip>
            </div>
            <Eyebrow style={{ marginBottom: 18 }}>Hola, soy</Eyebrow>
            <h1 style={{ fontSize: "clamp(64px, 8vw, 108px)", marginBottom: 24, lineHeight: 0.92 }}>
              Cristian
              <br />
              <span style={{ color: "var(--accent)" }}>Hernández.</span>
            </h1>
            <p style={{ fontSize: 22, color: "var(--ink-2)", lineHeight: 1.45, maxWidth: 560, marginBottom: 20 }}>
              Programador profesional con IA, autor de 2 libros y fundador de una agencia de software. Llevo más de una década
              enseñando a profesionales y empresarios a construir negocios reales.
            </p>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.55, maxWidth: 540, marginBottom: 36 }}>
              Hoy construyo SaaS, escribo y educo desde un mismo lugar. Si vienes a aprender, a usar mis productos o a que mi
              equipo construya el tuyo — estás en casa.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/sobre-mi">
                <Button size="lg" shine>
                  Conoce mi historia →
                </Button>
              </Link>
              <Link href="#saas">
                <Button size="lg" variant="ghost">
                  Ver mis SaaS
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
              className="ph"
              style={{
                aspectRatio: "4/5",
                borderRadius: 22,
                background: "linear-gradient(135deg, oklch(78% 0.04 245), oklch(68% 0.05 252))",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 30px 60px rgba(15,17,21,0.18)",
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 11, position: "absolute", top: 20, left: 20, color: "rgba(255,255,255,0.85)", letterSpacing: "0.12em" }}
              >
                RETRATO · CRISTIAN H.
              </span>
              <span
                className="serif"
                style={{ fontSize: 220, color: "rgba(255,255,255,0.18)", position: "absolute", bottom: -40, right: 20, lineHeight: 1 }}
              >
                C
              </span>
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  bottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.12em" }}
                  >
                    FUNDADOR · AGENCIA · AUTOR
                  </div>
                  <div className="serif" style={{ fontSize: 28, color: "white", marginTop: 4 }}>
                    Cristian Hernández
                  </div>
                </div>
                <Chip
                  style={{ background: "oklch(94% 0.05 145)", color: "oklch(40% 0.13 145)", borderColor: "transparent" }}
                >
                  ● Disponible
                </Chip>
              </div>
            </div>

            {/* Floating credibility card */}
            <Card
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
                {[
                  ["12+", "AÑOS ENSEÑANDO"],
                  ["5", "SAAS EN VIVO"],
                  ["2", "LIBROS PUBLICADOS"],
                  ["2.8k", "ALUMNOS CERTIFICADOS"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
                      {n}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Floating quote */}
            <Card
              style={{ position: "absolute", top: 32, right: -28, padding: 16, width: 230, borderLeft: "3px solid var(--accent)" }}
            >
              <span className="serif" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: "var(--ink)" }}>
                &ldquo;Programar dejó de ser una habilidad técnica — es lenguaje de negocio.&rdquo;
              </span>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, letterSpacing: "0.08em" }}>
                — CRISTIAN H. · 2026
              </div>
            </Card>
          </div>
        </div>

        {/* Marquee */}
        <div style={{ marginTop: 72, paddingTop: 32, borderTop: "1px solid var(--line)" }}>
          <Eyebrow style={{ textAlign: "center", marginBottom: 20 }}>
            Han confiado en mi equipo o asistido a mis programas
          </Eyebrow>
          <div
            style={{
              overflow: "hidden",
              maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
            }}
          >
            <div className="marquee">
              {[0, 1].flatMap((rep) =>
                BRANDS.map((b) => (
                  <span key={`${b}-${rep}`} className="serif" style={{ fontSize: 22, color: "var(--muted)", opacity: 0.7 }}>
                    {b}
                  </span>
                )),
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* TRES CAMINOS */}
      <section className="sec">
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: 56, marginBottom: 64 }}>
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

      {/* SAAS SHOWCASE */}
      <section id="saas" className="sec" style={{ paddingTop: 80 }}>
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Estudio · Nuestros SaaS</Eyebrow>
            <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>
              5 productos en vivo,
              <br />
              construidos con <span style={{ color: "var(--accent)" }}>IA</span>.
            </h2>
          </div>
          <p style={{ maxWidth: 360, color: "var(--muted)", lineHeight: 1.55, fontSize: 16 }}>
            Cada producto es un caso real de cómo aplicamos IA + negocios. Úsalos en tu empresa o aprende del repo en mis
            cohortes.
          </p>
        </div>

        <div className="grid-3" style={{ gap: 20 }}>
          {SAAS.map((p, i) => {
            const isCta = p.cta;
            return (
              <Card key={i} hover style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    height: 200,
                    background: isCta
                      ? "repeating-linear-gradient(135deg, var(--bg-2) 0 1px, transparent 1px 10px), var(--bg)"
                      : `linear-gradient(135deg, oklch(58% 0.18 ${p.hue}), oklch(42% 0.14 ${p.hue}))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {!isCta && (
                    <>
                      {p.badge && (
                        <span
                          style={{
                            position: "absolute",
                            top: 16,
                            left: 16,
                            padding: "4px 10px",
                            background: "rgba(255,255,255,0.18)",
                            color: "white",
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            borderRadius: 999,
                            letterSpacing: "0.08em",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {p.badge}
                        </span>
                      )}
                      <span
                        style={{
                          position: "absolute",
                          top: 16,
                          right: 16,
                          padding: "4px 10px",
                          background: "rgba(0,0,0,0.3)",
                          color: "white",
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          borderRadius: 999,
                          letterSpacing: "0.08em",
                        }}
                      >
                        ● EN VIVO
                      </span>
                      <div
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: 22,
                          background: "rgba(255,255,255,0.95)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-serif)",
                          fontSize: 40,
                          color: `oklch(42% 0.14 ${p.hue})`,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                          fontWeight: 600,
                        }}
                      >
                        {p.glyph}
                      </div>
                      <span
                        className="mono"
                        style={{ position: "absolute", bottom: 14, left: 16, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}
                      >
                        {p.dom}
                      </span>
                    </>
                  )}
                  {isCta && (
                    <div style={{ textAlign: "center", color: "var(--muted)" }}>
                      <div className="serif" style={{ fontSize: 64, color: "var(--ink)" }}>
                        +
                      </div>
                      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
                        TU PRODUCTO AQUÍ
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em" }}>
                      {p.tag}
                    </span>
                    {!isCta && (
                      <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>
                        {p.users}
                      </span>
                    )}
                  </div>
                  <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05 }}>
                    {p.name}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>{p.desc}</p>
                  <div className="rule" />
                  <div className="between">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.price}</span>
                    <Button variant={isCta ? "primary" : "ghost"} size="sm">
                      {isCta ? "Cotizar →" : "Ver SaaS →"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* SaaS stats */}
        <Card style={{ marginTop: 40, padding: 40, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
          {[
            ["12.4k", "NEGOCIOS USANDO NUESTROS SAAS"],
            ["$4M+", "PROCESADOS POR MES"],
            ["14", "PAÍSES"],
            ["99.9%", "UPTIME"],
          ].map(([n, l], i) => (
            <div
              key={l}
              style={{ borderLeft: i > 0 ? "1px solid var(--line)" : "none", paddingLeft: i > 0 ? 24 : 0 }}
            >
              <div className="serif" style={{ fontSize: 56, color: "var(--ink)", lineHeight: 1 }}>
                {n}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, letterSpacing: "0.08em" }}>
                {l}
              </div>
            </div>
          ))}
        </Card>
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

      {/* PROOF / STATS */}
      <section className="sec">
        <div className="grid-4" style={{ alignItems: "end" }}>
          {[
            ["2.847", "profesionales certificados"],
            ["$ 4.2M", "facturados por egresados (12m)"],
            ["98%", "completan su primer proyecto"],
            ["14", "países representados"],
          ].map(([n, l]) => (
            <div key={l} style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
              <div className="num">{n}</div>
              <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="rule" />

      {/* TESTIMONIALS */}
      <section className="sec">
        <Eyebrow>03 · Testimonios</Eyebrow>
        <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16, marginBottom: 56, maxWidth: 900 }}>
          Profesionales y empresarios que ya operan con IA.
        </h2>
        <div className="grid-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="serif" style={{ fontSize: 56, lineHeight: 0.5, color: "var(--accent)" }}>
                &ldquo;
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.5 }}>{t.q}</p>
              <div className="row" style={{ marginTop: "auto" }}>
                <div className="av">
                  {t.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="sec" style={{ paddingTop: 32 }}>
        <Card style={{ padding: 64, position: "relative", overflow: "hidden", background: "var(--bg-2)" }}>
          <div className="mesh" />
          <div
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
              <Link href="/registro">
                <Button size="lg" style={{ width: "100%", justifyContent: "center" }}>
                  Reservar taller gratis →
                </Button>
              </Link>
              <Link href="/programas">
                <Button size="lg" variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                  Ver programas pagos
                </Button>
              </Link>
              <div style={{ fontSize: 12, color: "var(--muted)" }} className="mono">
                PRÓXIMO · MAR 04 · 19:00 GMT-5
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
