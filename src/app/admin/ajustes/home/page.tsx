import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SiteTabs } from "@/components/admin/SiteTabs";
import { HOME_SECTIONS_DEFAULT, SEED_TENANT_SLUG } from "@/lib/home-sections";
import { HomeContentEditor } from "./HomeContentEditor";

export const dynamic = "force-dynamic";

export default async function HomeContentPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;

  const [settings] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.tenantId, ctx.tenant.id))
    .limit(1);

  // El editor arranca desde la config guardada o desde el default genérico.
  const initial = settings?.homeSections ?? HOME_SECTIONS_DEFAULT;
  const isSeed = ctx.tenant.slug === SEED_TENANT_SLUG;

  return (
    <AdminPageShell
      user={user}
      active="sitio"
      title="Contenido del Home"
      subtitle="Muestra/oculta y edita las secciones de tu página de inicio"
    >
      <SiteTabs current="/admin/ajustes/home" />
      <HomeContentEditor initial={initial} isSeed={isSeed} />
    </AdminPageShell>
  );
}
