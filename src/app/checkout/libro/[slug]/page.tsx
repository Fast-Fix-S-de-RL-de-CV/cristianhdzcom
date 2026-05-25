import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { computeBumps, type CheckoutFormat } from "@/lib/book-bumps";
import { LibroCheckoutClient } from "./LibroCheckoutClient";

export const dynamic = "force-dynamic";

export default async function LibroCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const [product] = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.slug, slug))
    .limit(1);

  if (!product || !product.isActive) notFound();

  // Catálogo completo para que el cliente pueda mostrar los bumps al cambiar
  // formato sin un round-trip extra.
  const catalog = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.isActive, true))
    .orderBy(asc(schema.books.sortOrder));

  // Formato inicial: lo que venga en URL, si es válido. Si no, el primero
  // disponible (bundle > digital > physical).
  let initialFormat: CheckoutFormat = "digital";
  if (product.isBundle) initialFormat = "bundle";
  else if (product.hasDigital) initialFormat = "digital";
  else if (product.hasPhysical) initialFormat = "physical";
  if (sp.format === "digital" && product.hasDigital) initialFormat = "digital";
  if (sp.format === "physical" && product.hasPhysical) initialFormat = "physical";
  if (sp.format === "bundle" && product.isBundle) initialFormat = "bundle";

  // Calcula los bumps iniciales server-side. El cliente recalcula al cambiar
  // formato sin volver al servidor (usa el mismo computeBumps).
  const initialBumps = computeBumps({ product, format: initialFormat, catalog });

  const me = await getCurrentUser();
  const initialBuyer = me ? { name: me.name, email: me.email } : { name: "", email: "" };

  return (
    <div>
      <Nav />
      <LibroCheckoutClient
        product={serializeBook(product)}
        catalog={catalog.map(serializeBook)}
        initialFormat={initialFormat}
        initialBumps={initialBumps}
        initialBuyer={initialBuyer}
      />
      <Footer />
    </div>
  );
}

function serializeBook(b: typeof schema.books.$inferSelect) {
  return {
    ...b,
    createdAt: b.createdAt.toISOString(),
    bundleIncludes: b.bundleIncludes ?? {},
    bullets: b.bullets ?? [],
  };
}
