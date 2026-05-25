import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { LibrosManager } from "./LibrosManager";

export const dynamic = "force-dynamic";

export default async function LibrosAdminPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select()
    .from(schema.books)
    .orderBy(asc(schema.books.sortOrder));

  // Stats útiles para el subtítulo.
  const totalBooks = rows.filter((r) => !r.isBundle).length;
  const totalBundles = rows.filter((r) => r.isBundle).length;
  const inactive = rows.filter((r) => !r.isActive).length;

  const data = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    // jsonb defaults arrive as objects with no shape — normalize.
    bundleIncludes: r.bundleIncludes ?? {},
    bullets: r.bullets ?? [],
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/libros"
      title="Libros & Bundles"
      subtitle={`${totalBooks} ${totalBooks === 1 ? "libro" : "libros"} · ${totalBundles} ${totalBundles === 1 ? "bundle" : "bundles"}${inactive > 0 ? ` · ${inactive} inactivos` : ""}`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <LibrosManager rows={data} />
      </Card>
    </AdminPageShell>
  );
}
