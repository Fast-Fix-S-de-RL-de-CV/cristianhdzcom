import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const dynamic = "force-dynamic";

const PILARES = [
  {
    icon: "◎",
    title: "Aprender haciendo",
    desc: "Cada módulo termina con un reto técnico real. Nada de teoría desconectada — sales con código y proyectos que sirven.",
  },
  {
    icon: "✦",
    title: "Comunidad como motor",
    desc: "Compartes lo que haces, recibes feedback de pares y mentores. Las preguntas no se quedan sin respuesta más de 24h.",
  },
  {
    icon: "⚡",
    title: "Construir, no consumir",
    desc: "El objetivo no es coleccionar certificados. Es que termines con un negocio, un producto, o una propuesta que cobre.",
  },
  {
    icon: "⟁",
    title: "IA como copiloto",
    desc: "Aprendes a programar y a vender usando IA como herramienta diaria. Te volvés 10× sin perder fundamentos.",
  },
];

const NIVELES = [
  { rango: "1 — 3", title: "Iniciado", desc: "Acaba el bootcamp base. Setup de IDE, primeras APIs, primeras ventas." },
  { rango: "4 — 6", title: "Constructor", desc: "Tienes proyectos reales en producción. Acceso a talleres avanzados." },
  { rango: "7 — 9", title: "Operador", desc: "Mentoría 1:1 incluida, acceso a casos reales de mi agencia." },
  { rango: "10+", title: "Inversor", desc: "Co-inversiones, deal flow privado, alumni vitalicio." },
];

const REGLAS = [
  "Sin spam, sin links de afiliados, sin pitcheo cruzado.",
  "Atribuye crédito cuando reutilices el código de otro miembro.",
  "Las preguntas se hacen en público — todos aprenden.",
  "No compartas el contenido de los programas fuera de la plataforma.",
  "Si das feedback, hazlo concreto y accionable. Si lo recibes, no te lo tomes personal.",
];

export default async function SobrePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidad/sobre");

  return (
    <div className="plat">
      <PlatformSidebar activeHref="/comunidad/sobre" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {/* Hero */}
          <div style={{ marginBottom: 40 }}>
            <Eyebrow>Comunidad</Eyebrow>
            <h1 className="serif" style={{ fontSize: 48, marginTop: 8, lineHeight: 1.1 }}>
              Una comunidad para quienes <span className="gold-text">construyen</span>.
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 16, fontSize: 16, lineHeight: 1.6 }}>
              No es un curso más. Es un grupo de programadores, emprendedores y operadores que aprenden
              haciendo, comparten lo que construyen, y se ayudan a llegar más rápido.
            </p>
          </div>

          {/* Pilares */}
          <section style={{ marginBottom: 48 }}>
            <Eyebrow style={{ marginBottom: 16 }}>Cómo funciona</Eyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {PILARES.map((p) => (
                <Card key={p.title} style={{ padding: 24 }}>
                  <div className="serif" style={{ fontSize: 28, color: "var(--gold-deep)" }}>
                    {p.icon}
                  </div>
                  <h3 className="serif" style={{ fontSize: 20, marginTop: 8, color: "var(--navy)" }}>
                    {p.title}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                    {p.desc}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* Niveles */}
          <section style={{ marginBottom: 48 }}>
            <Eyebrow style={{ marginBottom: 16 }}>Sistema de niveles</Eyebrow>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Subes de nivel completando módulos, retos, participando en la comunidad y construyendo
              proyectos. Cada rango desbloquea contenido y beneficios.
            </p>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {NIVELES.map((n, i) => (
                <div
                  key={n.title}
                  style={{
                    padding: "20px 24px",
                    borderBottom: i < NIVELES.length - 1 ? "1px solid var(--line)" : undefined,
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 24,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Nivel {n.rango}
                    </div>
                    <div
                      className="serif"
                      style={{ fontSize: 18, marginTop: 4, color: "var(--navy)", fontWeight: 600 }}
                    >
                      {n.title}
                    </div>
                  </div>
                  <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.5 }}>
                    {n.desc}
                  </p>
                </div>
              ))}
            </Card>
          </section>

          {/* Reglas */}
          <section style={{ marginBottom: 48 }}>
            <Eyebrow style={{ marginBottom: 16 }}>Reglas de convivencia</Eyebrow>
            <Card style={{ padding: 24 }}>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {REGLAS.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: i < REGLAS.length - 1 ? "1px solid var(--line)" : undefined,
                      color: "var(--ink-2)",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "var(--gold-deep)", fontWeight: 700 }}>{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* CTA */}
          <section style={{ marginBottom: 24 }}>
            <Card style={{ padding: 32, textAlign: "center", background: "var(--navy-soft)" }}>
              <h3 className="serif" style={{ fontSize: 24, color: "var(--navy)" }}>
                ¿Listo para tu siguiente módulo?
              </h3>
              <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 8, marginBottom: 20 }}>
                Vuelve a tu sendero y sigue avanzando.
              </p>
              <Link href="/plataforma" className="btn btn-primary" style={{ display: "inline-flex" }}>
                Ir a mi sendero →
              </Link>
            </Card>
          </section>

          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textAlign: "center",
              letterSpacing: "0.08em",
            }}
          >
            ¿DUDAS? ESCRIBE A{" "}
            <a href="mailto:hola@cristianhdz.com" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>
              hola@cristianhdz.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
