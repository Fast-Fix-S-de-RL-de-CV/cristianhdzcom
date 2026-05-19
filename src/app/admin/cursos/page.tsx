import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { CursosManager } from "./CursosManager";

export const dynamic = "force-dynamic";

export default async function CursosPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.programs.id,
      slug: schema.programs.slug,
      title: schema.programs.title,
      subtitle: schema.programs.subtitle,
      type: schema.programs.type,
      priceUsd: schema.programs.priceUsd,
      durationLabel: schema.programs.durationLabel,
      isActive: schema.programs.isActive,
      isFeatured: schema.programs.isFeatured,
      modulesCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.modules} WHERE program_id = ${schema.programs.id})`,
      enrollmentsCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.enrollments} WHERE program_id = ${schema.programs.id})`,
    })
    .from(schema.programs)
    .orderBy(asc(schema.programs.sortOrder));

  const data = rows.map((r) => ({
    ...r,
    subtitle: r.subtitle ?? "",
    durationLabel: r.durationLabel ?? "",
    modulesCount: Number(r.modulesCount),
    enrollmentsCount: Number(r.enrollmentsCount),
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/cursos"
      title="Cursos & Programas"
      subtitle={`${data.length} programas configurados`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <CursosManager rows={data} />
      </Card>
    </AdminPageShell>
  );
}
