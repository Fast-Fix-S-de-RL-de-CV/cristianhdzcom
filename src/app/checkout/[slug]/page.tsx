import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function formatCohortRange(starts: Date, ends: Date) {
  const startStr = `${String(starts.getUTCDate()).padStart(2, "0")} ${MONTHS[starts.getUTCMonth()]}`;
  const endStr = `${String(ends.getUTCDate()).padStart(2, "0")} ${MONTHS[ends.getUTCMonth()]}`;
  const ms = ends.getTime() - starts.getTime();
  const weeks = Math.max(1, Math.round(ms / (7 * 24 * 3600 * 1000)));
  return `${startStr} — ${endStr} · ${weeks} ${weeks === 1 ? "SEMANA" : "SEMANAS"}`;
}

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.slug, slug)).limit(1);
  if (!program) notFound();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [salesRow, openCohorts] = await Promise.all([
    db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.programId, program.id),
          eq(schema.orders.status, "succeeded"),
          gte(schema.orders.createdAt, sevenDaysAgo),
        ),
      ),
    db
      .select()
      .from(schema.cohorts)
      .where(and(eq(schema.cohorts.programId, program.id), eq(schema.cohorts.isOpen, true)))
      .orderBy(asc(schema.cohorts.startsOn))
      .limit(1),
  ]);

  const recentSales = salesRow[0]?.c ?? 0;
  const cohort = openCohorts[0] ?? null;
  const seatsLeft = cohort ? Math.max(0, cohort.seatsTotal - cohort.seatsTaken) : null;
  const cohortRange = cohort
    ? formatCohortRange(new Date(cohort.startsOn), new Date(cohort.endsOn))
    : null;

  return (
    <CheckoutClient
      program={{
        id: program.id,
        slug: program.slug,
        title: program.title,
        priceUsd: program.priceUsd,
        priceCompareUsd: program.priceCompareUsd ?? undefined,
        installmentPriceUsd: program.installmentPriceUsd ?? undefined,
        installmentCount: program.installmentCount ?? undefined,
        type: program.type,
      }}
      recentSales={recentSales}
      seatsLeft={seatsLeft}
      cohortRange={cohortRange}
    />
  );
}
