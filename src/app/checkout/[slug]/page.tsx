import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.slug, slug)).limit(1);
  if (!program) notFound();

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
    />
  );
}
