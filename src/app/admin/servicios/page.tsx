import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ServiciosManager } from "./ServiciosManager";

export const dynamic = "force-dynamic";

export default async function ServiciosAdminPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select()
    .from(schema.services)
    .orderBy(asc(schema.services.sortOrder));

  const data = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  const total = rows.length;
  const active = rows.filter((r) => r.isActive && !r.isCtaCard).length;
  const ctaCards = rows.filter((r) => r.isCtaCard).length;

  return (
    <AdminPageShell
      user={user}
      active="/admin/servicios"
      title="Empresas y Servicios"
      subtitle={`${total} en total · ${active} en operación${ctaCards ? ` · ${ctaCards} card${ctaCards > 1 ? "s" : ""} CTA` : ""}`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ServiciosManager rows={data} />
      </Card>
    </AdminPageShell>
  );
}
