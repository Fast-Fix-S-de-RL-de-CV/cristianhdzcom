import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { PagosTable } from "./PagosTable";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.orders.id,
      name: schema.orders.name,
      email: schema.orders.email,
      status: schema.orders.status,
      totalCents: schema.orders.totalCents,
      currency: schema.orders.currency,
      paymentMethod: schema.orders.paymentMethod,
      createdAt: schema.orders.createdAt,
      programTitle: schema.programs.title,
    })
    .from(schema.orders)
    .leftJoin(schema.programs, eq(schema.programs.id, schema.orders.programId))
    .orderBy(desc(schema.orders.createdAt));

  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    totalCents: r.totalCents,
    currency: r.currency,
    paymentMethod: r.paymentMethod,
    programTitle: r.programTitle,
    createdAt: r.createdAt.toISOString(),
  }));

  const succeeded = data.filter((r) => r.status === "succeeded");
  const totalRevenue = succeeded.reduce((s, r) => s + r.totalCents, 0);
  const aov = succeeded.length > 0 ? totalRevenue / succeeded.length : 0;

  return (
    <AdminPageShell
      user={user}
      active="/admin/pagos"
      title="Pagos"
      subtitle="Historial completo de transacciones"
    >
      <div className="grid-4 admin-kpi-grid" style={{ gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            REVENUE TOTAL
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            ${Math.round(totalRevenue / 100).toLocaleString("es-MX")}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Solo órdenes succeeded
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            # TRANSACCIONES
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            {data.length}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            {succeeded.length} exitosas
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            AOV
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            ${Math.round(aov / 100).toLocaleString("es-MX")}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Ticket promedio
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            TASA DE ÉXITO
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 6 }}>
            {data.length > 0 ? Math.round((succeeded.length / data.length) * 100) : 0}%
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            succeeded / total
          </div>
        </Card>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <PagosTable rows={data} />
      </Card>
    </AdminPageShell>
  );
}
