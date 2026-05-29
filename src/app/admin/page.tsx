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

// Monthly revenue goal in cents (USD). Used by sidebar progress + KPI deltas.
const MONTHLY_GOAL_CENTS = 3_000_000; // $30K USD/month

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "superadmin") redirect("/comunidad");

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const endOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [counts] = await db
    .select({
      users: sql<number>`(SELECT COUNT(*)::int FROM ${schema.users})`,
      orders: sql<number>`(SELECT COUNT(*)::int FROM ${schema.orders} WHERE status = 'succeeded')`,
      revenueCents: sql<number>`(SELECT COALESCE(SUM(total_cents), 0)::int FROM ${schema.orders} WHERE status = 'succeeded')`,
      revenueThisMonthCents: sql<number>`(
        SELECT COALESCE(SUM(total_cents), 0)::int FROM ${schema.orders}
        WHERE status = 'succeeded' AND created_at >= ${startOfMonth.toISOString()}
      )`,
      revenueLastMonthCents: sql<number>`(
        SELECT COALESCE(SUM(total_cents), 0)::int FROM ${schema.orders}
        WHERE status = 'succeeded'
          AND created_at >= ${startOfPrevMonth.toISOString()}
          AND created_at <= ${endOfPrevMonth.toISOString()}
      )`,
      leads: sql<number>`(SELECT COUNT(*)::int FROM ${schema.leads})`,
      posts: sql<number>`(SELECT COUNT(*)::int FROM ${schema.posts})`,
      programs: sql<number>`(SELECT COUNT(*)::int FROM ${schema.programs})`,
      events: sql<number>`(SELECT COUNT(*)::int FROM ${schema.events})`.as("events_count"),
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

  // Per-program enrollments + module completion ratio. Completion is computed
  // across the program's module_progress rows (state='done' / total).
  const programs = await db
    .select({
      id: schema.programs.id,
      title: schema.programs.title,
      enrollments: sql<number>`(SELECT COUNT(*)::int FROM ${schema.enrollments} WHERE program_id = ${schema.programs.id})`,
      moduleCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.modules} WHERE program_id = ${schema.programs.id})`,
      doneCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.moduleProgress} mp
        JOIN ${schema.modules} m ON m.id = mp.module_id
        WHERE m.program_id = ${schema.programs.id} AND mp.state = 'done'
      )`,
    })
    .from(schema.programs)
    .limit(4);

  const activity = await db.select().from(schema.activity).orderBy(desc(schema.activity.createdAt)).limit(6);

  // Daily orders for last 30 days (sparkline data, real).
  const dailyRows = await db.execute<{ day: string; total: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           COALESCE(SUM(total_cents), 0)::int AS total
    FROM ${schema.orders}
    WHERE status = 'succeeded' AND created_at >= ${thirtyDaysAgo.toISOString()}
    GROUP BY 1
    ORDER BY 1
  `);
  const dailySeries = buildDailySeries(dailyRows as unknown as { day: string; total: number }[], 30);

  // Last 12 months revenue grouped by month (real BarChart data).
  const monthlyRows = await db.execute<{ ym: string; total: number }>(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS ym,
           COALESCE(SUM(total_cents), 0)::int AS total
    FROM ${schema.orders}
    WHERE status = 'succeeded' AND created_at >= (CURRENT_DATE - INTERVAL '11 months')
    GROUP BY 1
    ORDER BY 1
  `);
  const monthlySeries = buildMonthlySeries(monthlyRows as unknown as { ym: string; total: number }[]);

  // Derived metrics
  const revThis = counts.revenueThisMonthCents || 0;
  const revLast = counts.revenueLastMonthCents || 0;
  const monthDeltaPct =
    revLast > 0 ? ((revThis - revLast) / revLast) * 100 : revThis > 0 ? 100 : 0;
  const monthDeltaLabel =
    (monthDeltaPct >= 0 ? "▲ " : "▼ ") + Math.abs(monthDeltaPct).toFixed(0) + "%";
  const goalPct = Math.min(100, Math.round((revThis / MONTHLY_GOAL_CENTS) * 100));
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const goalLabel = `META · $${(MONTHLY_GOAL_CENTS / 100 / 1000).toFixed(0)}K · DÍA ${dayOfMonth}/${daysInMonth}`;

  const conversionPct = counts.users > 0 ? (counts.orders / counts.users) * 100 : 0;
  // No cancellations table yet → churn 0 until we wire enrollment.status='cancelled' over a window.
  const churnPct = 0;

  const sidebarItems = [
    ["◎", "Dashboard", true, "/admin"],
    ["✨", "Prospectos", false, "/admin/prospectos"],
    ["👥", "Alumnos", false, "/admin/alumnos", String(counts.users)],
    ["💼", "Clientes", false, "/admin/clientes", String(counts.users)],
    ["💳", "Suscripciones", false, "/admin/suscripciones", String(counts.orders)],
    ["💰", "Pagos", false, "/admin/pagos", `$${Math.round((counts.revenueCents || 0) / 100)}`],
    ["📚", "Cursos", false, "/admin/cursos", String(counts.programs)],
    ["✍️", "Blog", false, "/admin/blog", String(counts.blog || 0)],
    ["🎙️", "Talleres", false, "/admin/talleres", String(counts.events || 0)],
    ["💬", "Comunidad", false, "/admin/comunidad", String(counts.posts)],
    ["🎯", "Marketing", false, "/admin/marketing"],
    ["📞", "Soporte", false, "/admin/soporte", String(counts.leads || 0)],
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
              $ {Math.round(revThis / 100).toLocaleString("es-MX")}
            </div>
            <div className="row" style={{ gap: 4, fontSize: 11, color: monthDeltaPct >= 0 ? "oklch(48% 0.13 155)" : "var(--red)", marginTop: 4 }}>
              <span>{monthDeltaLabel}</span>
              <span style={{ color: "var(--muted)" }}>vs. mes anterior</span>
            </div>
            <ProgressBar value={goalPct} className="!mt-3" />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              {goalLabel}
            </div>
          </Card>
        </aside>

        {/* Main */}
        <main style={{ padding: "28px 32px" }}>
          <div className="between" style={{ marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="eyebrow">Operación · resumen ejecutivo</div>
              <h1 style={{ fontSize: 36, marginTop: 4 }}>Dashboard</h1>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Métricas reales del negocio · últimos 30 días
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <a
                className="btn btn-ghost"
                href="/api/admin/export?type=orders"
                style={{ padding: "8px 14px", fontSize: 12, textDecoration: "none" }}
              >
                Exportar CSV
              </a>
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
              { tag: "MRR", val: `$ ${Math.round((counts.revenueCents || 0) / 100).toLocaleString("es-MX")}`, delta: monthDeltaLabel, positive: monthDeltaPct >= 0, series: dailySeries },
              { tag: "Alumnos activos", val: counts.users.toLocaleString("es-MX"), delta: `+${counts.users}`, positive: true, series: dailySeries },
              { tag: "Conversión checkout", val: `${conversionPct.toFixed(1)}%`, delta: "—", positive: true, series: dailySeries },
              { tag: "Churn (90d)", val: `${churnPct.toFixed(1)}%`, delta: "—", positive: true, series: dailySeries },
            ].map((k) => (
              <Card key={k.tag} style={{ padding: 20 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
                  {k.tag.toUpperCase()}
                </div>
                <div className="serif" style={{ fontSize: 36, marginTop: 8 }}>
                  {k.val}
                </div>
                <div className="row" style={{ marginTop: 8, gap: 6, fontSize: 12 }}>
                  <span style={{ color: k.positive ? "oklch(48% 0.13 155)" : "var(--red)", fontWeight: 600 }}>{k.delta}</span>
                  <span style={{ color: "var(--muted)" }}>vs. periodo anterior</span>
                </div>
                <Sparkline data={k.series} />
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="admin-2col-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 24 }}>
              <div className="between" style={{ marginBottom: 20 }}>
                <div>
                  <h3 className="serif" style={{ fontSize: 22 }}>
                    Ingresos por mes
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    Últimos 12 meses · órdenes pagadas
                  </p>
                </div>
              </div>
              <BarChart data={monthlySeries.values} />
              <div className="row" style={{ gap: 14, marginTop: 8 }}>
                {monthlySeries.labels.map((m) => (
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
              <div style={{ marginBottom: 16 }}>
                <div className="between">
                  <h3 className="serif" style={{ fontSize: 22 }}>
                    Actividad de la plataforma
                  </h3>
                  <span className="mono" style={{ fontSize: 10, color: "oklch(48% 0.13 155)" }}>
                    ● LOG EN VIVO
                  </span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                  Eventos automáticos: posts, RSVPs, lecciones completadas.{" "}
                  <a href="/admin/comunidad" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    Moderar →
                  </a>
                </p>
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
                const totalSlots = (p.moduleCount || 0) * Math.max(1, p.enrollments || 0);
                const completion = totalSlots > 0 ? Math.round((p.doneCount / totalSlots) * 100) : 0;
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
              {([
                ["✍️", "Nuevo post de blog", "/admin/blog"],
                ["📚", "Nuevo módulo curso", "/admin/cursos"],
                ["🎙️", "Crear taller en vivo", "/admin/talleres"],
                ["💸", "Marketing y ofertas", "/admin/marketing"],
                ["📩", "Ver alumnos", "/admin/alumnos"],
                ["🏷️", "Pagos y cobros", "/admin/pagos"],
                ["🚀", "Servicios / Empresas", "/admin/servicios"],
                ["💳", "Suscripciones", "/admin/suscripciones"],
              ] as const).map(([i, l, href]) => (
                <a
                  key={l}
                  href={href}
                  className="row"
                  style={{
                    padding: 12,
                    background: "var(--bg-2)",
                    borderRadius: 10,
                    gap: 10,
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{i}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
                </a>
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

function buildDailySeries(rows: { day: string; total: number }[], days: number) {
  const map = new Map(rows.map((r) => [r.day, r.total]));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? 0);
  }
  return out;
}

function buildMonthlySeries(rows: { ym: string; total: number }[]) {
  const map = new Map(rows.map((r) => [r.ym, r.total]));
  const labels: string[] = [];
  const values: number[] = [];
  const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    labels.push(monthLabels[d.getUTCMonth()]);
    values.push(map.get(ym) ?? 0);
  }
  return { labels, values };
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const w = 100;
  const h = 32;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 4) - 2).toFixed(2)}`);
  const ptsArea = [`0,${h}`, ...pts, `${w},${h}`];
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 10 }}>
      <polyline fill="var(--accent-soft)" stroke="none" points={ptsArea.join(" ")} />
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={pts.join(" ")} />
    </svg>
  );
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div
      className="row"
      style={{ alignItems: "flex-end", gap: 14, height: 200, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}
    >
      {data.map((v, j) => {
        const heightPct = (v / max) * 100;
        return (
          <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div
              title={`$${Math.round(v / 100).toLocaleString("es-MX")}`}
              style={{
                width: "100%",
                height: `${heightPct}%`,
                background: "var(--accent)",
                borderRadius: "4px 4px 0 0",
                minHeight: v > 0 ? 2 : 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
