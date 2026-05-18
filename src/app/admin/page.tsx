import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { desc, sql, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "superadmin") redirect("/comunidad");

  const [counts] = await db
    .select({
      users: sql<number>`(SELECT COUNT(*)::int FROM ${schema.users})`,
      orders: sql<number>`(SELECT COUNT(*)::int FROM ${schema.orders} WHERE status = 'succeeded')`,
      revenueCents: sql<number>`(SELECT COALESCE(SUM(total_cents), 0)::int FROM ${schema.orders} WHERE status = 'succeeded')`,
      leads: sql<number>`(SELECT COUNT(*)::int FROM ${schema.leads})`,
      posts: sql<number>`(SELECT COUNT(*)::int FROM ${schema.posts})`,
      programs: sql<number>`(SELECT COUNT(*)::int FROM ${schema.programs})`,
      blog: sql<number>`(SELECT COUNT(*)::int FROM ${schema.blogPosts})`.as("blog"),
    })
    .from(sql`(SELECT 1) AS t`);

  const orders = await db
    .select({
      id: schema.orders.id,
      name: schema.orders.name,
      email: schema.orders.email,
      status: schema.orders.status,
      totalCents: schema.orders.totalCents,
      createdAt: schema.orders.createdAt,
      programTitle: schema.programs.title,
    })
    .from(schema.orders)
    .leftJoin(schema.programs, eq(schema.programs.id, schema.orders.programId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(8);

  const programs = await db
    .select({
      id: schema.programs.id,
      title: schema.programs.title,
      enrollments: sql<number>`(SELECT COUNT(*)::int FROM ${schema.enrollments} WHERE program_id = ${schema.programs.id})`,
    })
    .from(schema.programs)
    .limit(4);

  const activity = await db.select().from(schema.activity).orderBy(desc(schema.activity.createdAt)).limit(6);

  const sidebarItems = [
    ["◎", "Dashboard", true, "/admin"],
    ["👥", "Alumnos", false, "/admin/alumnos", String(counts.users)],
    ["💼", "Clientes", false, "/admin/clientes", "184"],
    ["💳", "Suscripciones", false, "/admin/suscripciones", "1.420"],
    ["💰", "Pagos", false, "/admin/pagos", `$${Math.round((counts.revenueCents || 0) / 100)}`],
    ["📚", "Cursos", false, "/admin/cursos", String(counts.programs)],
    ["✍️", "Blog", false, "/admin/blog", String(counts.blog || 0)],
    ["🎙️", "Talleres", false, "/admin/talleres", "24"],
    ["💬", "Comunidad", false, "/admin/comunidad", String(counts.posts)],
    ["🎯", "Marketing", false, "/admin/marketing"],
    ["📞", "Soporte", false, "/admin/soporte", "7"],
    ["⚙️", "Ajustes", false, "/admin/ajustes"],
  ] as const;

  return (
    <AdminShell user={user}>
      <div className="admin-layout" style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 130px)" }}>
        {/* Sidebar */}
        <aside style={{ padding: "24px 16px", background: "var(--bg)", borderRight: "1px solid var(--line)" }}>
          <Eyebrow style={{ padding: "0 12px 12px" }}>Operación</Eyebrow>
          <div className="col" style={{ gap: 2 }}>
            {sidebarItems.map(([icon, label, active, href, count]) => (
              <a
                key={String(label)}
                href={String(href)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--bg)" : "var(--ink-2)",
                  fontWeight: active ? 600 : 500,
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                <span style={{ width: 18 }}>{String(icon)}</span>
                <span style={{ flex: 1 }}>{String(label)}</span>
                {count ? (
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: active ? "rgba(255,255,255,0.6)" : "var(--muted)" }}
                  >
                    {String(count)}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
          <div className="rule" style={{ margin: "20px 8px" }} />
          <Card style={{ padding: 14 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              MES ACTUAL
            </div>
            <div className="serif" style={{ fontSize: 28, marginTop: 4 }}>
              $ {Math.round((counts.revenueCents || 0) / 100).toLocaleString("es-MX")}
            </div>
            <div className="row" style={{ gap: 4, fontSize: 11, color: "oklch(48% 0.13 155)", marginTop: 4 }}>
              <span>▲ 18%</span>
              <span style={{ color: "var(--muted)" }}>vs. enero</span>
            </div>
            <ProgressBar value={74} className="!mt-3" />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              META · $114K · DÍA 22/30
            </div>
          </Card>
        </aside>

        {/* Main */}
        <main style={{ padding: "28px 32px" }}>
          <div className="between" style={{ marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36 }}>Dashboard</h1>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Resumen ejecutivo · últimos 30 días</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
                Exportar CSV
              </button>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
                Filtros
              </button>
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--line-2)",
                  background: "white",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                30D ▾
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid-4 admin-kpi-grid" style={{ gap: 14, marginBottom: 20 }}>
            {[
              { tag: "MRR", val: `$ ${Math.round((counts.revenueCents || 0) / 100).toLocaleString("es-MX")}`, delta: "+12%" },
              { tag: "Alumnos activos", val: counts.users.toLocaleString("es-MX"), delta: "+184" },
              { tag: "Conversión checkout", val: "6.4%", delta: "+0.8 pt" },
              { tag: "Churn (90d)", val: "2.1%", delta: "–0.3 pt" },
            ].map((k, i) => (
              <Card key={k.tag} style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
                  {k.tag.toUpperCase()}
                </div>
                <div className="serif" style={{ fontSize: 36, marginTop: 8 }}>
                  {k.val}
                </div>
                <div className="row" style={{ marginTop: 8, gap: 6, fontSize: 12 }}>
                  <span style={{ color: "oklch(48% 0.13 155)", fontWeight: 600 }}>▲ {k.delta}</span>
                  <span style={{ color: "var(--muted)" }}>vs. periodo anterior</span>
                </div>
                <Sparkline seed={i} />
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="admin-2col-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 24 }}>
              <div className="between" style={{ marginBottom: 20 }}>
                <div>
                  <h3 className="serif" style={{ fontSize: 22 }}>
                    Ingresos por origen
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    Cohortes · suscripciones · agencia · libros
                  </p>
                </div>
                <div className="row" style={{ gap: 14, fontSize: 11 }}>
                  {[
                    ["var(--accent)", "Cohortes"],
                    ["var(--warm)", "Suscrip."],
                    ["var(--ink)", "Agencia"],
                    ["oklch(58% 0.13 155)", "Libros"],
                  ].map(([c, n]) => (
                    <div key={n} className="row" style={{ gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                      <span className="mono" style={{ color: "var(--muted)" }}>
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <BarChart />
              <div className="row" style={{ gap: 14, marginTop: 8 }}>
                {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m) => (
                  <div
                    key={m}
                    style={{ flex: 1, textAlign: "center", fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div className="between" style={{ marginBottom: 16 }}>
                <h3 className="serif" style={{ fontSize: 22 }}>
                  Actividad
                </h3>
                <span className="mono" style={{ fontSize: 10, color: "oklch(48% 0.13 155)" }}>
                  ● EN VIVO
                </span>
              </div>
              <div className="col" style={{ gap: 14 }}>
                {activity.map((a) => (
                  <div key={a.id} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--bg-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {a.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink)" }}>{a.text}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                        {timeAgo(a.createdAt as Date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tables row */}
          <div className="admin-2col-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="between" style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
                <h3 className="serif" style={{ fontSize: 20 }}>
                  Últimos pedidos
                </h3>
                <a style={{ color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>Ver todos →</a>
              </div>
              {orders.length === 0 ? (
                <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>Aún no hay pedidos.</div>
              ) : (
                orders.map((o, i) => (
                  <div
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1.4fr 1.2fr 80px 80px",
                      gap: 12,
                      padding: "12px 24px",
                      alignItems: "center",
                      borderBottom: i < orders.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <div className="av" style={{ width: 28, height: 28, fontSize: 10 }}>
                      {o.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{o.programTitle}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background:
                          o.status === "succeeded" ? "var(--green-soft)" : o.status === "pending" ? "var(--bg-2)" : "var(--bg-3)",
                        color:
                          o.status === "succeeded" ? "var(--green-strong)" : "var(--muted)",
                        justifySelf: "flex-start",
                      }}
                    >
                      {o.status.toUpperCase()}
                    </span>
                    <span className="mono" style={{ fontSize: 11, textAlign: "right" }}>
                      ${(o.totalCents / 100).toFixed(0)}
                    </span>
                  </div>
                ))
              )}
            </Card>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="between" style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
                <h3 className="serif" style={{ fontSize: 20 }}>
                  Performance de cursos
                </h3>
                <a style={{ color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>Gestionar →</a>
              </div>
              {programs.map((p, i) => {
                const color = ["var(--accent)", "var(--warm)", "var(--ink)", "oklch(58% 0.13 155)"][i % 4];
                const completion = Math.min(95, 30 + p.enrollments * 4);
                return (
                  <div
                    key={p.id}
                    style={{ padding: "14px 24px", borderBottom: i < programs.length - 1 ? "1px solid var(--line)" : "none" }}
                  >
                    <div className="between" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {p.enrollments} alumnos · compl {completion}%
                      </span>
                    </div>
                    <ProgressBar value={completion} fillClassName={`!bg-[${color}]`} />
                  </div>
                );
              })}
            </Card>
          </div>

          {/* Quick actions */}
          <Card style={{ padding: 20 }}>
            <Eyebrow style={{ marginBottom: 14 }}>Acciones rápidas</Eyebrow>
            <div className="grid-4" style={{ gap: 12 }}>
              {[
                ["✍️", "Nuevo post de blog"],
                ["📚", "Nuevo módulo curso"],
                ["🎙️", "Crear taller en vivo"],
                ["💸", "Enviar oferta cohorte"],
                ["📩", "Email a alumnos"],
                ["🏷️", "Cupón de descuento"],
                ["🎯", "Lanzar campaña"],
                ["🔁", "Reembolso manual"],
              ].map(([i, l]) => (
                <div key={l} className="row" style={{ padding: 12, background: "var(--bg-2)", borderRadius: 10, gap: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 16 }}>{i}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </AdminShell>
  );
}

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

function Sparkline({ seed }: { seed: number }) {
  const pts: string[] = [];
  for (let j = 0; j < 12; j++) pts.push(`${j * 9},${28 - Math.sin(j / 2 + seed) * 6 - j * 0.8}`);
  const ptsArea = ["0,32", ...pts, "99,32"];
  return (
    <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" style={{ marginTop: 10 }}>
      <polyline fill="var(--accent-soft)" stroke="none" points={ptsArea.join(" ")} />
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={pts.join(" ")} />
    </svg>
  );
}

function BarChart() {
  const data = [
    [40, 25, 30, 8],
    [55, 30, 22, 10],
    [62, 35, 40, 12],
    [48, 32, 28, 11],
    [70, 38, 35, 14],
    [82, 42, 50, 16],
    [76, 45, 45, 15],
    [90, 50, 38, 18],
    [110, 56, 60, 20],
    [98, 52, 48, 19],
    [124, 58, 70, 22],
    [140, 64, 80, 25],
  ];
  const max = 320;
  return (
    <div
      className="row"
      style={{ alignItems: "flex-end", gap: 14, height: 200, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}
    >
      {data.map((stack, j) => {
        const tot = stack.reduce((a, b) => a + b, 0);
        return (
          <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column-reverse",
                height: `${(tot / max) * 100}%`,
                borderRadius: "4px 4px 0 0",
                overflow: "hidden",
              }}
            >
              <div style={{ height: `${(stack[0] / tot) * 100}%`, background: "var(--accent)" }} />
              <div style={{ height: `${(stack[1] / tot) * 100}%`, background: "var(--warm)" }} />
              <div style={{ height: `${(stack[2] / tot) * 100}%`, background: "var(--ink)" }} />
              <div style={{ height: `${(stack[3] / tot) * 100}%`, background: "oklch(58% 0.13 155)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
