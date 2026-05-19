import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LibraryFilters } from "./LibraryFilters";

export const dynamic = "force-dynamic";

type Resource = {
  id: string;
  kind: "PDF" | "ZIP" | "NOTEBOOK" | "CHEATSHEET";
  category: "PDFs" | "Plantillas" | "Notebooks" | "Cheatsheets";
  title: string;
  description: string;
  size: string;
  downloads: number;
};

const RESOURCES: Resource[] = [
  {
    id: "r1",
    kind: "PDF",
    category: "PDFs",
    title: "Manual del programador con IA",
    description:
      "Guía completa de 120 páginas para integrar Claude, GPT y herramientas de IA en tu flujo diario de desarrollo.",
    size: "8.4 MB",
    downloads: 1842,
  },
  {
    id: "r2",
    kind: "PDF",
    category: "PDFs",
    title: "De idea a SaaS en 30 días",
    description:
      "Roadmap probado para lanzar un micro-SaaS rentable usando stacks modernos y IA generativa.",
    size: "5.1 MB",
    downloads: 1320,
  },
  {
    id: "r3",
    kind: "ZIP",
    category: "Plantillas",
    title: "Starter Next.js 15 + Drizzle + Stripe",
    description:
      "Template profesional con auth, base de datos, pagos y panel admin listo para customizar.",
    size: "1.2 MB",
    downloads: 894,
  },
  {
    id: "r4",
    kind: "ZIP",
    category: "Plantillas",
    title: "Pack de prompts maestros",
    description:
      "60 prompts probados para arquitectura, code review, refactor, debugging y documentación.",
    size: "240 KB",
    downloads: 2104,
  },
  {
    id: "r5",
    kind: "NOTEBOOK",
    category: "Notebooks",
    title: "Análisis de datos con Claude API",
    description:
      "Notebook Python que demuestra cómo usar Claude para EDA, limpieza y visualización de datasets reales.",
    size: "320 KB",
    downloads: 542,
  },
  {
    id: "r6",
    kind: "NOTEBOOK",
    category: "Notebooks",
    title: "Fine-tuning práctico con Anthropic",
    description:
      "Ejemplo end-to-end de tool use, structured output y batch API para casos de negocio reales.",
    size: "480 KB",
    downloads: 388,
  },
  {
    id: "r7",
    kind: "CHEATSHEET",
    category: "Cheatsheets",
    title: "Cheatsheet de Drizzle ORM",
    description:
      "Referencia visual de queries comunes: joins, filtros, transacciones y migraciones.",
    size: "180 KB",
    downloads: 1244,
  },
  {
    id: "r8",
    kind: "CHEATSHEET",
    category: "Cheatsheets",
    title: "TypeScript estricto · patrones esenciales",
    description:
      "Tipos genéricos, utility types, branded types y narrowing aplicado a APIs reales.",
    size: "210 KB",
    downloads: 988,
  },
  {
    id: "r9",
    kind: "PDF",
    category: "PDFs",
    title: "Precios para freelancers de software",
    description:
      "Cómo cobrar por proyecto, por valor y por retainer cuando trabajas con IA como copiloto.",
    size: "3.6 MB",
    downloads: 716,
  },
  {
    id: "r10",
    kind: "ZIP",
    category: "Plantillas",
    title: "Pack de contratos para devs",
    description:
      "MSA, SOW, NDA y propuesta lista para enviar — versión en español y en inglés.",
    size: "560 KB",
    downloads: 651,
  },
];

const KIND_STYLE: Record<Resource["kind"], { bg: string; color: string }> = {
  PDF: { bg: "var(--accent-soft)", color: "var(--accent)" },
  ZIP: { bg: "var(--warm-soft)", color: "oklch(45% 0.12 75)" },
  NOTEBOOK: { bg: "var(--green-soft)", color: "var(--green-strong)" },
  CHEATSHEET: { bg: "var(--bg-3)", color: "var(--ink-2)" },
};

export default async function BibliotecaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/biblioteca");

  return (
    <div className="plat">
      <PlatformSidebar activeHref="/plataforma/biblioteca" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Plataforma</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Biblioteca
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              PDFs, plantillas, notebooks y cheatsheets curados para programadores que construyen con IA.
            </p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <LibraryFilters />
          </div>

          <div
            className="grid-3 lib-grid"
            style={{
              gap: 16,
            }}
          >
            {RESOURCES.map((r) => {
              const tagStyle = KIND_STYLE[r.kind];
              return (
                <Card key={r.id} hover style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="between">
                    <Chip
                      style={{
                        background: tagStyle.bg,
                        color: tagStyle.color,
                        borderColor: "transparent",
                      }}
                    >
                      {r.kind}
                    </Chip>
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {r.size}
                    </span>
                  </div>
                  <div>
                    <h3 className="serif" style={{ fontSize: 18, lineHeight: 1.2 }}>
                      {r.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--muted)",
                        marginTop: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      {r.description}
                    </p>
                  </div>
                  <div className="between" style={{ marginTop: "auto", paddingTop: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {r.downloads.toLocaleString("es-MX")} descargas
                    </span>
                    <a href="#" className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}>
                      Descargar ↓
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
