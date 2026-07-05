import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SiteTabs } from "@/components/admin/SiteTabs";
import { Card } from "@/components/ui/Card";
import { defaultAboutPageContent } from "@/lib/about-page";
import { AboutEditor } from "./AboutEditor";

export const dynamic = "force-dynamic";

export default async function AcercaAdminPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;
  const [settings] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const fullName = (settings?.heroTitle ?? ctx.branding.siteName).replace(/\.$/, "");
  const role = `${settings?.heroSubtitleAccent ?? ""} ${settings?.heroSubtitleRest ?? ""}`.trim();
  const fallback = defaultAboutPageContent({
    siteName: ctx.branding.siteName,
    fullName,
    role,
    bio1: settings?.heroBio1,
    bio2: settings?.heroBio2,
    quoteText: settings?.heroQuoteText,
    quoteAttrib: settings?.heroQuoteAttrib,
  });

  return (
    <AdminPageShell
      user={user}
      active="sitio"
      title="Página Acerca de"
      subtitle="Edita la galería, historia, secciones y llamados a la acción de /acerca"
    >
      <SiteTabs current="/admin/ajustes/acerca" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <AboutEditor initial={{ ...fallback, ...(ctx.branding.aboutPage ?? {}) }} />
      </Card>
    </AdminPageShell>
  );
}
