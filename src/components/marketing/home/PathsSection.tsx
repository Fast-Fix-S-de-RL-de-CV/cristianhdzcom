import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { HomeSections, PathCard } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["paths"]>;

function colorOf(color?: string) {
  const accentColor = color === "accent" ? "var(--accent)" : color === "warm" ? "var(--warm)" : "var(--ink)";
  const decoBg = color === "accent" ? "var(--accent-soft)" : color === "warm" ? "var(--warm-soft)" : "var(--bg-2)";
  return { accentColor, decoBg };
}

/** Tarjeta "camino" — mismo markup que el original de cristianhdz. */
function PathCardView({ c, tp }: { c: PathCard & { eyebrow?: string }; tp: (p: string) => string }) {
  const { accentColor, decoBg } = colorOf(c.color);
  return (
    <Link href={tp(c.href || "#")} style={{ display: "block" }}>
      <Card
        hover
        style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16, minHeight: 420, position: "relative", overflow: "hidden", height: "100%" }}
      >
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: decoBg }} />
        <div className="between" style={{ position: "relative" }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: accentColor }}>{c.eyebrow}</span>
          {c.tag && <Chip>{c.tag}</Chip>}
        </div>
        <h3 className="serif" style={{ fontSize: 32, lineHeight: 1.05, position: "relative" }}>{c.title}</h3>
        <p style={{ color: "var(--muted)", lineHeight: 1.55, fontSize: 15, flex: 1, position: "relative" }}>{c.desc}</p>
        <div className="rule" />
        <div className="between" style={{ position: "relative" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.kpi}</span>
          <span className="serif" style={{ fontSize: 20 }}>{c.ctaLabel} →</span>
        </div>
      </Card>
    </Link>
  );
}

// PATHS original de cristianhdz (idéntico al hardcode anterior de page.tsx).
const PATHS: Array<PathCard & { eyebrow: string }> = [
  { eyebrow: "CAMINO · A", tag: "USA MIS SAAS", title: "Mejora tu negocio con nuestros productos.", desc: "Tenemos 5 SaaS en producción para PyMEs: punto de venta, tienda online, rifas, marketing y servicios profesionales. Empieza desde $19/mes.", ctaLabel: "Ver SaaS", kpi: "5 productos · LATAM", color: "warm", href: "/#saas" },
  { eyebrow: "CAMINO · B", tag: "APRENDE NEGOCIOS", title: "Aprende a hacer negocios con IA.", desc: "Mis 2 libros y mis programas para empezar sin dinero, validar y escalar por internet. Para empresarios, empleados y profesionales.", ctaLabel: "Ver programas", kpi: "2 libros + generación", color: "accent", href: "/programas" },
  { eyebrow: "CAMINO · C", tag: "APRENDE A PROGRAMAR", title: "Aprende a programar con IA — profesional.", desc: "Sendero estilo Duolingo, mentorías 1:1 y proyectos reales. De cero a entregar productos como un senior — usando agentes y modelos de frontera.", ctaLabel: "Ver plataforma", kpi: "12 módulos · certificación", color: "ink", href: "/programas/programacion-con-ia" },
];

export function PathsSection({ config, tp }: { config: Cfg | null; tp: (p: string) => string }) {
  // cristianhdz (config null): render ORIGINAL sin cambios.
  if (config === null) {
    return (
      <>
        <div className="rule" />
        <section className="sec">
          <div className="paths-header-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: 56, marginBottom: 64 }}>
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
            {PATHS.map((c, i) => <PathCardView key={i} c={c} tp={tp} />)}
          </div>
        </section>
      </>
    );
  }

  // Otros tenants: templado desde config.
  if (config.show === false) return null;
  const cards = config.cards ?? [];
  if (cards.length === 0 && !config.title) return null;

  return (
    <>
      <div className="rule" />
      <section className="sec">
        <div className="paths-header-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr", gap: 56, marginBottom: 64 }}>
          <div>
            {config.eyebrow && <Eyebrow>{config.eyebrow}</Eyebrow>}
            <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>{config.title}</h2>
          </div>
          {config.intro && (
            <p style={{ fontSize: 18, color: "var(--ink-2)", lineHeight: 1.55, alignSelf: "end", maxWidth: 540 }}>{config.intro}</p>
          )}
        </div>
        {cards.length > 0 && (
          <div className="grid-3">
            {cards.map((c, i) => <PathCardView key={i} c={c} tp={tp} />)}
          </div>
        )}
      </section>
    </>
  );
}
