import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { getTenantCtx } from "@/lib/tenant";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { BookingWizard } from "./BookingWizard";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();

  const services = await db
    .select()
    .from(schema.bookingServices)
    .where(and(eq(schema.bookingServices.tenantId, ctx.tenant.id), eq(schema.bookingServices.isActive, true)))
    .orderBy(asc(schema.bookingServices.sortOrder), asc(schema.bookingServices.createdAt));

  return (
    <div>
      <Nav />
      <section className="sec" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <BookingWizard
          services={services.map((s) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            subtitle: s.subtitle,
            description: s.description,
            hostName: s.hostName,
            hostAvatarUrl: s.hostAvatarUrl,
            durationMinutes: s.durationMinutes,
            timezone: s.timezone,
            locationType: s.locationType,
            locationLabel: s.locationLabel,
            confirmationText: s.confirmationText,
            requirePhone: s.requirePhone,
            requireEmail: s.requireEmail,
            questions: s.questions || [],
            maxDaysAhead: s.maxDaysAhead,
          }))}
          tenant={{
            siteName: ctx.branding.siteName,
            logoUrl: ctx.branding.logoUrl ?? null,
            accent: ctx.branding.accent,
          }}
        />
      </section>
      <Footer />
    </div>
  );
}
