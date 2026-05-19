import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const dynamic = "force-dynamic";

type CommunityProject = {
  id: string;
  author: string;
  stack: string;
  title: string;
  description: string;
  tag: "API" | "SaaS" | "Tool";
  metric: string;
};

const COMMUNITY_PROJECTS: CommunityProject[] = [
  {
    id: "p1",
    author: "Daniela R.",
    stack: "Next.js · Drizzle · Claude",
    title: "Asistente de cotizaciones automáticas",
    description:
      "Mini-SaaS que analiza briefs de clientes y devuelve una cotización lista para enviar en menos de 30 segundos.",
    tag: "SaaS",
    metric: "12 clientes pagando",
  },
  {
    id: "p2",
    author: "Mario S.",
    stack: "Hono · Cloudflare · Anthropic",
    title: "API pública de resumen de PDFs",
    description:
      "Endpoint sencillo que recibe un PDF y devuelve un resumen estructurado JSON con bullets, conclusiones y citas.",
    tag: "API",
    metric: "8k requests/mes",
  },
  {
    id: "p3",
    author: "Lucía P.",
    stack: "Python · Streamlit · Claude API",
    title: "Auditoría de copy con IA",
    description:
      "Herramienta interna para que su equipo de marketing valide tono, ortografía y compliance antes de publicar.",
    tag: "Tool",
    metric: "Ahorra 6h/semana",
  },
];

const TAG_STYLE: Record<CommunityProject["tag"], "accent" | "warm" | "green"> = {
  API: "accent",
  SaaS: "warm",
  Tool: "green",
};

export default async function ProyectosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/proyectos");

  return (
    <div className="plat">
      <PlatformSidebar activeHref="/plataforma/proyectos" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <Eyebrow>Plataforma</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Mis proyectos
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              Aquí aparecerán los proyectos que construyas a partir de los retos técnicos del programa.
            </p>
          </div>

          {/* Empty state */}
          <Card style={{ padding: 48, textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--bg-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                fontSize: 30,
                color: "var(--muted)",
              }}
            >
              ◇
            </div>
            <h2 className="serif" style={{ fontSize: 24, marginTop: 18 }}>
              Aún no tienes proyectos
            </h2>
            <p
              style={{
                color: "var(--muted)",
                fontSize: 14,
                marginTop: 8,
                maxWidth: 460,
                margin: "8px auto 0",
                lineHeight: 1.6,
              }}
            >
              Cuando completes el primer reto técnico de tu sendero, tu proyecto aparecerá aquí con
              su demo, repositorio y devolución del mentor.
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: 24, gap: 12 }}>
              <Link href="/plataforma" className="btn btn-primary">
                Ver retos →
              </Link>
              <Link href="/plataforma/biblioteca" className="btn btn-ghost">
                Explorar biblioteca
              </Link>
            </div>
          </Card>

          {/* Community showcase */}
          <div className="between" style={{ marginBottom: 16, alignItems: "baseline" }}>
            <h3 className="serif" style={{ fontSize: 22 }}>
              Proyectos destacados de la comunidad
            </h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              INSPIRACIÓN
            </span>
          </div>

          <div className="grid-3" style={{ gap: 16 }}>
            {COMMUNITY_PROJECTS.map((p) => (
              <Card
                key={p.id}
                hover
                style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div className="between">
                  <Chip variant={TAG_STYLE[p.tag]}>{p.tag}</Chip>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {p.author}
                  </span>
                </div>
                <div>
                  <h4 className="serif" style={{ fontSize: 18, lineHeight: 1.2 }}>
                    {p.title}
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                </div>
                <div className="col" style={{ gap: 6, marginTop: "auto" }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    STACK
                  </div>
                  <div style={{ fontSize: 12 }}>{p.stack}</div>
                </div>
                <div
                  className="between"
                  style={{
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--green-strong)" }}>
                    {p.metric}
                  </span>
                  <a href="#" className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>
                    VER →
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
