import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { SuscripcionesTable } from "./SuscripcionesTable";

export const dynamic = "force-dynamic";

export default async function SuscripcionesPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.orders.id,
      name: schema.orders.name,
      email: schema.orders.email,
      status: schema.orders.status,
      totalCents: schema.orders.totalCents,
      currency: schema.orders.currency,
      createdAt: schema.orders.createdAt,
      paidAt: schema.orders.paidAt,
      programTitle: schema.programs.title,
    })
    .from(schema.orders)
    .leftJoin(schema.programs, eq(schema.programs.id, schema.orders.programId))
    .where(eq(schema.orders.status, "succeeded"))
    .orderBy(desc(schema.orders.paidAt));

  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    totalCents: r.totalCents,
    currency: r.currency,
    programTitle: r.programTitle,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
  }));

  const total = data.reduce((s, r) => s + r.totalCents, 0);

  return (
    <AdminPageShell
      user={user}
      active="/admin/suscripciones"
      title="Suscripciones"
      subtitle={`${data.length} órdenes pagadas · $${Math.round(total / 100).toLocaleString("es-MX")} USD`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <SuscripcionesTable rows={data} />
      </Card>
    </AdminPageShell>
  );
}
