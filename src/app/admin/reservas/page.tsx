import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ReservasManager } from "./ReservasManager";

export const dynamic = "force-dynamic";

export default async function ReservasAdminPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;

  const services = await db
    .select()
    .from(schema.bookingServices)
    .where(eq(schema.bookingServices.tenantId, ctx.tenant.id))
    .orderBy(asc(schema.bookingServices.sortOrder), asc(schema.bookingServices.createdAt));

  const reservations = await db
    .select({
      id: schema.bookingReservations.id,
      serviceId: schema.bookingReservations.serviceId,
      startsAt: schema.bookingReservations.startsAt,
      endsAt: schema.bookingReservations.endsAt,
      timezone: schema.bookingReservations.timezone,
      customerName: schema.bookingReservations.customerName,
      customerEmail: schema.bookingReservations.customerEmail,
      customerPhone: schema.bookingReservations.customerPhone,
      notes: schema.bookingReservations.notes,
      status: schema.bookingReservations.status,
      createdAt: schema.bookingReservations.createdAt,
      serviceTitle: schema.bookingServices.title,
    })
    .from(schema.bookingReservations)
    .innerJoin(schema.bookingServices, eq(schema.bookingReservations.serviceId, schema.bookingServices.id))
    .where(eq(schema.bookingReservations.tenantId, ctx.tenant.id))
    .orderBy(desc(schema.bookingReservations.createdAt))
    .limit(80);

  return (
    <AdminPageShell
      user={user}
      active="/admin/reservas"
      title="Reservas"
      subtitle={`${services.length} servicios configurados · ${reservations.length} reservas recientes`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ReservasManager
          services={services.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          }))}
          reservations={reservations.map((r) => ({
            ...r,
            startsAt: r.startsAt.toISOString(),
            endsAt: r.endsAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </Card>
    </AdminPageShell>
  );
}
