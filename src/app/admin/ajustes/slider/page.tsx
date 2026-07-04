import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SliderManager } from "./SliderManager";

export const dynamic = "force-dynamic";

export default async function SliderAdminPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;

  const [settings] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const slides = await db
    .select()
    .from(schema.heroSlides)
    .where(eq(schema.heroSlides.tenantId, ctx.tenant.id))
    .orderBy(asc(schema.heroSlides.sortOrder));

  return (
    <AdminPageShell
      user={user}
      active="/admin/ajustes"
      title="Portada del Home"
      subtitle="Elige el tipo de portada y arma tu slider con imágenes y video"
    >
      <SliderManager
        siteName={ctx.branding.siteName}
        initialSettings={{
          heroType: settings?.heroType ?? "slider",
          hero3dName: settings?.hero3dName ?? "",
          hero3dSubtitle: settings?.hero3dSubtitle ?? "",
          heroHeight: settings?.heroHeight ?? "full",
          heroImageFit: settings?.heroImageFit ?? "cover",
        }}
        initialSlides={slides.map((s) => ({
          id: s.id,
          mediaType: s.mediaType,
          imageUrl: s.imageUrl,
          videoUrl: s.videoUrl,
          title: s.title,
          subtitle: s.subtitle,
          ctaLabel: s.ctaLabel,
          ctaHref: s.ctaHref,
          cta2Label: s.cta2Label,
          cta2Href: s.cta2Href,
          textPosition: s.textPosition,
          isActive: s.isActive,
        }))}
      />
    </AdminPageShell>
  );
}
