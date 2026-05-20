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
      durationLabel: schema.programs.durationLabel,
      currency: schema.programs.currency,
      priceUsd: schema.programs.priceUsd,
      priceCompareUsd: schema.programs.priceCompareUsd,
      installmentPriceUsd: schema.programs.installmentPriceUsd,
      installmentCount: schema.programs.installmentCount,
      pricePerMonth: schema.programs.pricePerMonth,
      pricePerYear: schema.programs.pricePerYear,
      accent: schema.programs.accent,
      description: schema.programs.description,
      bullets: schema.programs.bullets,
      coverUrl: schema.programs.coverUrl,
      coverKind: schema.programs.coverKind,
      isActive: schema.programs.isActive,
      isFeatured: schema.programs.isFeatured,
      modulesCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.modules} WHERE program_id = ${schema.programs.id})`,
      enrollmentsCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.enrollments} WHERE program_id = ${schema.programs.id})`,
    })
    .from(schema.programs)
    .orderBy(asc(schema.programs.sortOrder));

  type Accent = "accent" | "warm" | "green" | "navy" | "gold";
  type Currency = "USD" | "MXN" | "EUR";
  const data = rows.map((r) => ({
    ...r,
    subtitle: r.subtitle ?? "",
    durationLabel: r.durationLabel ?? "",
    accent: ((r.accent as Accent) ?? "accent") as Accent,
    description: r.description ?? "",
    bullets: r.bullets ?? [],
    coverUrl: r.coverUrl ?? null,
    coverKind: (r.coverKind as "image" | "video" | null) ?? null,
    currency: ((r.currency as Currency) ?? "USD") as Currency,
    priceCompareUsd: r.priceCompareUsd ?? null,
    installmentPriceUsd: r.installmentPriceUsd ?? null,
    installmentCount: r.installmentCount ?? null,
    pricePerMonth: r.pricePerMonth ?? null,
    pricePerYear: r.pricePerYear ?? null,
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
