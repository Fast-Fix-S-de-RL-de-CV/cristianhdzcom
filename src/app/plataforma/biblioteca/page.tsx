import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LibraryFilters } from "./LibraryFilters";
import { db, schema } from "@/db";
import { and, asc, eq, ilike, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = ["PDFs", "Plantillas", "Notebooks", "Cheatsheets"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

function kindFromCategory(category: string): "PDF" | "ZIP" | "NOTEBOOK" | "CHEATSHEET" {
  switch (category) {
    case "Plantillas":
      return "ZIP";
    case "Notebooks":
      return "NOTEBOOK";
    case "Cheatsheets":
      return "CHEATSHEET";
    case "PDFs":
    default:
      return "PDF";
  }
}

const KIND_STYLE: Record<"PDF" | "ZIP" | "NOTEBOOK" | "CHEATSHEET", { bg: string; color: string }> = {
  PDF: { bg: "var(--accent-soft)", color: "var(--accent)" },
  ZIP: { bg: "var(--warm-soft)", color: "oklch(45% 0.12 75)" },
  NOTEBOOK: { bg: "var(--green-soft)", color: "var(--green-strong)" },
  CHEATSHEET: { bg: "var(--bg-3)", color: "var(--ink-2)" },
};

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/biblioteca");

  const sp = (await searchParams) ?? {};
  const categoryParam = typeof sp.category === "string" ? sp.category : undefined;
  const activeCategory: Category | "Todos" =
    categoryParam && (ALLOWED_CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as Category)
      : "Todos";

  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  let whereClause: ReturnType<typeof and> | undefined;
  const conditions: Array<ReturnType<typeof eq>> = [];
  if (activeCategory !== "Todos") {
    conditions.push(eq(schema.resources.category, activeCategory));
  }
  if (q) {
    const like = `%${q}%`;
    const search = or(ilike(schema.resources.title, like), ilike(schema.resources.description, like));
    if (search) conditions.push(search as any);
  }
  if (conditions.length === 1) whereClause = conditions[0] as any;
  else if (conditions.length > 1) whereClause = and(...conditions);

  const rows = await db
    .select()
    .from(schema.resources)
    .where(whereClause)
    .orderBy(asc(schema.resources.sortOrder));

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
            <LibraryFilters activeCategory={activeCategory} />
          </div>

          {rows.length === 0 ? (
            <Card style={{ padding: 36, textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                No encontramos recursos para estos filtros.
              </p>
            </Card>
          ) : (
            <div className="grid-3 lib-grid" style={{ gap: 16 }}>
              {rows.map((r) => {
                const kind = kindFromCategory(r.category);
                const tagStyle = KIND_STYLE[kind];
                const locked = (user.level ?? 0) < r.requiredLevel;
                return (
                  <Card
                    key={r.id}
                    hover
                    style={{
                      padding: 22,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      opacity: locked ? 0.85 : 1,
                    }}
                  >
                    <div className="between">
                      <Chip
                        style={{
                          background: tagStyle.bg,
                          color: tagStyle.color,
                          borderColor: "transparent",
                        }}
                      >
                        {kind}
                      </Chip>
                      <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                        {r.fileType ? r.fileType.toUpperCase() : "—"}
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
                        {locked ? `Requiere nivel ${r.requiredLevel}` : `Nivel ${r.requiredLevel}+`}
                      </span>
                      {locked ? (
                        <span
                          className="btn btn-ghost"
                          style={{
                            padding: "8px 14px",
                            fontSize: 12,
                            cursor: "not-allowed",
                            opacity: 0.7,
                          }}
                          aria-disabled
                          title={`Necesitas nivel ${r.requiredLevel}. Tienes nivel ${user.level ?? 0}.`}
                        >
                          🔒 Bloqueado
                        </span>
                      ) : (
                        <a
                          href={r.fileUrl ?? "#"}
                          className="btn btn-primary"
                          style={{ padding: "8px 14px", fontSize: 12 }}
                        >
                          Descargar ↓
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
