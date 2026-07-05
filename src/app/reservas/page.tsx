import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";
import { db, schema } from "@/db";
import { getTenantCtx } from "@/lib/tenant";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { BookingWizard } from "./BookingWizard";

export const dynamic = "force-dynamic";

type SearchParams = { servicio?: string };

export default async function ReservasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const params = await searchParams;
  const selectedSlug = params?.servicio?.trim();

  const services = await db
    .select()
    .from(schema.bookingServices)
    .where(and(eq(schema.bookingServices.tenantId, ctx.tenant.id), eq(schema.bookingServices.isActive, true)))
    .orderBy(asc(schema.bookingServices.sortOrder), asc(schema.bookingServices.createdAt));

  const publicServices = services.map((s) => ({
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
  }));

  return (
    <div>
      <Nav />
      {selectedSlug ? (
        <section className="sec" style={{ paddingTop: 40, paddingBottom: 64 }}>
          <BookingWizard
            initialServiceSlug={selectedSlug}
            services={publicServices}
            tenant={{
              siteName: ctx.branding.siteName,
              logoUrl: ctx.branding.logoUrl ?? null,
              accent: ctx.branding.accent,
            }}
          />
        </section>
      ) : (
        <BookingServicesLanding
          services={publicServices}
          tenant={{
            basePath: ctx.basePath,
            siteName: ctx.branding.siteName,
            logoUrl: ctx.branding.logoUrl ?? null,
          }}
        />
      )}
      <Footer />
    </div>
  );
}

function BookingServicesLanding({
  services,
  tenant,
}: {
  services: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    hostName: string | null;
    hostAvatarUrl: string | null;
    durationMinutes: number;
    timezone: string;
    locationType: string;
    locationLabel: string | null;
  }>;
  tenant: { basePath: string; siteName: string; logoUrl: string | null };
}) {
  const hrefFor = (slug: string) => `${tenant.basePath}/reservas?servicio=${encodeURIComponent(slug)}`;

  if (!services.length) {
    return (
      <section className="sec" style={{ paddingTop: 72, paddingBottom: 96 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.siteName} style={{ maxWidth: 190, maxHeight: 58, objectFit: "contain", marginBottom: 26 }} />
          ) : null}
          <p className="mono" style={{ color: "var(--gold-deep)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
            Servicios y consultorias
          </p>
          <h1 className="serif" style={{ fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.04, marginTop: 10, color: "var(--navy)" }}>
            Reservas no disponibles
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 17 }}>
            Este sitio aun no tiene servicios activos para reservar.
          </p>
        </div>
      </section>
    );
  }

  const featured = services[0];

  return (
    <>
      <section className="sec" style={{ paddingTop: 56, paddingBottom: 34 }}>
        <div
          className="booking-landing-hero"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 420px",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <p className="mono" style={{ color: "var(--gold-deep)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              Servicios y consultorias
            </p>
            <h1 className="serif" style={{ fontSize: "clamp(38px, 6vw, 72px)", lineHeight: 0.98, marginTop: 12, color: "var(--navy)" }}>
              Agenda el servicio que necesitas.
            </h1>
            <p style={{ color: "var(--ink-2)", marginTop: 18, fontSize: 18, lineHeight: 1.7, maxWidth: 680 }}>
              Explora las opciones disponibles, revisa la informacion de cada servicio y elige el horario que mejor se acomode a tu calendario.
            </p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 28 }}>
              <Link href={hrefFor(featured.slug)} className="btn btn-primary" style={{ textDecoration: "none", padding: "13px 18px" }}>
                Agendar ahora <ArrowRight size={16} />
              </Link>
              <a href="#servicios" className="btn btn-ghost" style={{ textDecoration: "none", padding: "13px 18px" }}>
                Ver servicios
              </a>
            </div>
          </div>

          <Link
            href={hrefFor(featured.slug)}
            style={{
              display: "grid",
              gap: 18,
              border: "1px solid var(--line)",
              borderRadius: 18,
              padding: 24,
              background: "white",
              boxShadow: "0 24px 70px rgba(10,30,58,.10)",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <ServiceVisual service={featured} large />
            <div>
              <span className="mono" style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 700 }}>
                DESTACADO
              </span>
              <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 6, color: "var(--navy)" }}>
                {featured.title}
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>
                {featured.subtitle || featured.description || "Selecciona una fecha y horario disponible para reservar."}
              </p>
            </div>
            <ServiceMeta service={featured} />
          </Link>
        </div>
      </section>

      <section id="servicios" className="sec" style={{ paddingTop: 26, paddingBottom: 92 }}>
        <div className="between" style={{ gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p className="mono" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              Catalogo
            </p>
            <h2 className="serif" style={{ fontSize: 34, color: "var(--navy)", marginTop: 4 }}>
              Servicios disponibles
            </h2>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>
            {services.length} {services.length === 1 ? "opcion" : "opciones"} para reservar
          </span>
        </div>

        <div
          className="booking-services-carousel hide-scrollbar"
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(310px, 32%)",
            gap: 18,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            paddingBottom: 12,
          }}
        >
          {services.map((service) => (
            <Link
              key={service.id}
              href={hrefFor(service.slug)}
              style={{
                scrollSnapAlign: "start",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                minHeight: 430,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "white",
                color: "inherit",
                textDecoration: "none",
                overflow: "hidden",
                boxShadow: "0 16px 44px rgba(10,30,58,.07)",
              }}
            >
              <ServiceVisual service={service} />
              <div style={{ padding: 20 }}>
                <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.12, color: "var(--navy)" }}>
                  {service.title}
                </h3>
                {service.subtitle ? <p style={{ color: "var(--ink-2)", marginTop: 8, lineHeight: 1.55 }}>{service.subtitle}</p> : null}
                {service.description ? (
                  <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 14, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {service.description}
                  </p>
                ) : null}
              </div>
              <div style={{ padding: "0 20px 20px", display: "grid", gap: 16 }}>
                <ServiceMeta service={service} />
                <span className="btn btn-primary" style={{ justifyContent: "center" }}>
                  Reservar <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function ServiceVisual({
  service,
  large = false,
}: {
  service: { title: string; hostName: string | null; hostAvatarUrl: string | null };
  large?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: large ? 220 : 170,
        background:
          "radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--gold) 28%, white), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--navy) 94%, white), color-mix(in srgb, var(--navy) 72%, var(--gold)))",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {service.hostAvatarUrl ? (
        <img
          src={service.hostAvatarUrl}
          alt={service.hostName || service.title}
          style={{
            width: large ? 132 : 108,
            height: large ? 132 : 108,
            borderRadius: "50%",
            objectFit: "cover",
            border: "4px solid color-mix(in srgb, white 82%, var(--gold))",
            boxShadow: "0 18px 42px rgba(0,0,0,.22)",
          }}
        />
      ) : (
        <div
          style={{
            width: large ? 132 : 108,
            height: large ? 132 : 108,
            borderRadius: "50%",
            background: "rgba(255,255,255,.92)",
            color: "var(--navy)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 18px 42px rgba(0,0,0,.18)",
          }}
        >
          <Sparkles size={large ? 42 : 34} />
        </div>
      )}
    </div>
  );
}

function ServiceMeta({
  service,
}: {
  service: { durationMinutes: number; locationType: string; locationLabel: string | null; timezone: string };
}) {
  const location = service.locationLabel || (service.locationType === "virtual" ? "Virtual" : service.locationType);
  return (
    <div style={{ display: "grid", gap: 8, color: "var(--muted)", fontSize: 13 }}>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Clock size={15} /> {service.durationMinutes} min
      </span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <MapPin size={15} /> {location}
      </span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <CalendarDays size={15} /> {service.timezone}
      </span>
    </div>
  );
}
