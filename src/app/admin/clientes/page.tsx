import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ClientesTable } from "./ClientesTable";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const user = (await getCurrentUser())!;

  const rows = await db.execute<{
    user_id: string | null;
    email: string;
    name: string;
    orders_count: number;
    lifetime_cents: number;
    last_order_at: string | null;
  }>(sql`
    SELECT
      COALESCE(${schema.orders.userId}::text, '') AS user_id,
      ${schema.orders.email} AS email,
      MIN(${schema.orders.name}) AS name,
      COUNT(*)::int AS orders_count,
      COALESCE(SUM(${schema.orders.totalCents}), 0)::int AS lifetime_cents,
      MAX(${schema.orders.paidAt})::text AS last_order_at
    FROM ${schema.orders}
    WHERE ${schema.orders.status} = 'succeeded'
    GROUP BY ${schema.orders.email}, ${schema.orders.userId}
    ORDER BY lifetime_cents DESC
  `);

  const data = (rows as unknown as {
    user_id: string;
    email: string;
    name: string;
    orders_count: number;
    lifetime_cents: number;
    last_order_at: string | null;
  }[]).map((r) => ({
    userId: r.user_id || null,
    email: r.email,
    name: r.name || r.email,
    ordersCount: Number(r.orders_count),
    lifetimeCents: Number(r.lifetime_cents),
    lastOrderAt: r.last_order_at,
  }));

  const totalLifetime = data.reduce((s, r) => s + r.lifetimeCents, 0);

  return (
    <AdminPageShell
      user={user}
      active="/admin/clientes"
      title="Clientes"
      subtitle={`${data.length} clientes · LTV total $${Math.round(totalLifetime / 100).toLocaleString("es-MX")}`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ClientesTable rows={data} />
      </Card>
    </AdminPageShell>
  );
}
