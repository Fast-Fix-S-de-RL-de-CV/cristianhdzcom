import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { MarketingTable } from "./MarketingTable";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const user = (await getCurrentUser())!;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const leads = await db
    .select({
      id: schema.leads.id,
      email: schema.leads.email,
      source: schema.leads.source,
      tag: schema.leads.tag,
      createdAt: schema.leads.createdAt,
      hasPurchased: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.orders}
        WHERE ${schema.orders.email} = ${schema.leads.email}
          AND ${schema.orders.status} = 'succeeded'
      )`,
    })
    .from(schema.leads)
    .orderBy(desc(schema.leads.createdAt));

  const [stats] = await db
    .select({
      total: sql<number>`(SELECT COUNT(*)::int FROM ${schema.leads})`,
      week: sql<number>`(SELECT COUNT(*)::int FROM ${schema.leads} WHERE created_at >= ${sevenDaysAgo})`,
      converted: sql<number>`(
        SELECT COUNT(DISTINCT l.email)::int FROM ${schema.leads} l
        WHERE EXISTS (
          SELECT 1 FROM ${schema.orders} o
          WHERE o.email = l.email AND o.status = 'succeeded'
        )
      )`,
    })
    .from(sql`(SELECT 1) AS t`);

  const total = Number(stats?.total ?? 0);
  const week = Number(stats?.week ?? 0);
  const converted = Number(stats?.converted ?? 0);
  const conversionPct = total > 0 ? Math.round((converted / total) * 100) : 0;

  const data = leads.map((l) => ({
    id: l.id,
    email: l.email,
    source: l.source ?? "",
    tag: l.tag ?? "",
    createdAt: l.createdAt.toISOString(),
    hasPurchased: Number(l.hasPurchased) > 0,
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/marketing"
      title="Marketing"
      subtitle={`${total} leads en total · ${week} esta semana · ${conversionPct}% conversión`}
    >
      <div className="grid-4 admin-kpi-grid" style={{ gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            LEADS TOTAL
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            {total}
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            ESTA SEMANA
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            +{week}
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            CONVERTIDOS
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            {converted}
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            TASA CONVERSIÓN
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            {conversionPct}%
          </div>
        </Card>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <MarketingTable rows={data} />
      </Card>
    </AdminPageShell>
  );
}
