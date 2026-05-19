import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { db, schema } from "@/db";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VARIANTS: Array<"accent" | "warm" | "green"> = ["accent", "warm", "green"];

function initials(name: string | null | undefined) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export default async function ProyectosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/proyectos");

  // My projects
  const myProjects = await db
    .select()
    .from(schema.userProjects)
    .where(eq(schema.userProjects.userId, user.id))
    .orderBy(desc(schema.userProjects.createdAt));

  // Featured community projects (joined with author name)
  const featured = await db
    .select({
      id: schema.userProjects.id,
      title: schema.userProjects.title,
      description: schema.userProjects.description,
      url: schema.userProjects.url,
      thumbnailUrl: schema.userProjects.thumbnailUrl,
      createdAt: schema.userProjects.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.userProjects)
    .innerJoin(schema.users, eq(schema.users.id, schema.userProjects.userId))
    .where(and(eq(schema.userProjects.featured, true)))
    .orderBy(desc(schema.userProjects.createdAt))
    .limit(9);

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

          {myProjects.length === 0 ? (
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
          ) : (
            <div className="grid-3" style={{ gap: 16, marginBottom: 48 }}>
              {myProjects.map((p) => (
                <Card
                  key={p.id}
                  hover
                  style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div className="between">
                    <Chip>MIO</Chip>
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {new Date(p.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div>
                    <h3 className="serif" style={{ fontSize: 18, lineHeight: 1.2 }}>
                      {p.title}
                    </h3>
                    {p.description && (
                      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                  {p.url && (
                    <div
                      className="between"
                      style={{
                        paddingTop: 12,
                        marginTop: "auto",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        URL
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{ fontSize: 11, color: "var(--accent)" }}
                      >
                        ABRIR →
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Community showcase */}
          <div className="between" style={{ marginBottom: 16, alignItems: "baseline" }}>
            <h3 className="serif" style={{ fontSize: 22 }}>
              Proyectos destacados de la comunidad
            </h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              INSPIRACIÓN
            </span>
          </div>

          {featured.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Pronto destacaremos proyectos de la comunidad. Vuelve a revisar en unos días.
              </p>
            </Card>
          ) : (
            <div className="grid-3" style={{ gap: 16 }}>
              {featured.map((p, idx) => (
                <Card
                  key={p.id}
                  hover
                  style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div className="between">
                    <Chip variant={VARIANTS[idx % VARIANTS.length]}>DESTACADO</Chip>
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {p.authorName}
                    </span>
                  </div>
                  <div>
                    <h4 className="serif" style={{ fontSize: 18, lineHeight: 1.2 }}>
                      {p.title}
                    </h4>
                    {p.description && (
                      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="col" style={{ gap: 6, marginTop: "auto" }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      AUTOR
                    </div>
                    <div style={{ fontSize: 12 }}>{p.authorName} · {initials(p.authorName)}</div>
                  </div>
                  <div
                    className="between"
                    style={{
                      paddingTop: 12,
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, color: "var(--green-strong)" }}>
                      EN VIVO
                    </span>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{ fontSize: 11, color: "var(--accent)" }}
                      >
                        VER →
                      </a>
                    ) : (
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>—</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
