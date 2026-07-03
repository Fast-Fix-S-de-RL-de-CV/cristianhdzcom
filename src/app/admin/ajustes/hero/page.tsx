import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { HeroEditor } from "./HeroEditor";

export const dynamic = "force-dynamic";

export default async function HeroAdminPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;

  // site_settings es por tenant (UNIQUE(tenant_id)). Si el tenant aún no tiene
  // fila, el editor arranca con defaults genéricos; el PUT la crea al guardar.
  const [row] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const settings = row ?? {
    heroChip1Label: null,
    heroChip1Pulse: true,
    heroChip2Label: null,
    heroEyebrow: "Bienvenido a",
    heroTitle: `${ctx.branding.siteName}.`,
    heroSubtitleAccent: null,
    heroSubtitleRest: null,
    heroBio1: null,
    heroBio2: null,
    heroCtaPrimaryLabel: "Empezar gratis →",
    heroCtaSecondaryLabel: "Conocer más",
    heroPortraitUrl: null,
    heroPortraitFooterLine: "",
    heroPortraitChip: "● Disponible",
    heroStats: [],
    heroQuoteText: null,
    heroQuoteAttrib: null,
  };

  return (
    <AdminPageShell
      user={user}
      active="/admin/ajustes"
      title="Hero del Home"
      subtitle="Título, bio, foto de portada, chips, stats y quote del landing público"
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <HeroEditor initial={settings} />
      </Card>
    </AdminPageShell>
  );
}
