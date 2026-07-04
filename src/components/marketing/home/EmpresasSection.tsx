import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ServicesCarousel } from "@/components/marketing/ServicesCarousel";
import type { HomeSections } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["empresas"]>;
type Services = React.ComponentProps<typeof ServicesCarousel>["services"];

export function EmpresasSection({
  config, services, tp,
}: {
  config: Cfg | null;
  services: Services;
  tp: (p: string) => string;
}) {
  // Templado (otros tenants): oculta si show=false o sin servicios.
  if (config) {
    if (config.show === false || services.length === 0) return null;
    return (
      <>
        <div className="rule" />
        <section id="saas" className="sec" style={{ paddingTop: 80 }}>
          <div className="between" style={{ alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 24 }}>
            <div>
              {config.eyebrow && <Eyebrow>{config.eyebrow}</Eyebrow>}
              <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>{config.title}</h2>
            </div>
            {config.subtitle && (
              <p style={{ maxWidth: 360, color: "var(--muted)", lineHeight: 1.55, fontSize: 16 }}>{config.subtitle}</p>
            )}
          </div>
          <ServicesCarousel services={services} />
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link href={tp("/empresas")}>
              <Button variant="ghost">{config.ctaLabel || "Ver todo →"}</Button>
            </Link>
          </div>
        </section>
      </>
    );
  }

  // cristianhdz (config null): ORIGINAL sin cambios (se muestra siempre).
  return (
    <>
      <div className="rule" />
      <section id="saas" className="sec" style={{ paddingTop: 80 }}>
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>Estudio · Empresas y Servicios</Eyebrow>
            <h2 style={{ fontSize: "clamp(48px, 6vw, 72px)", marginTop: 16 }}>
              Así es como te puedo ayudar
              <br />
              con mis <span style={{ color: "var(--accent)" }}>empresas</span>.
            </h2>
          </div>
          <p style={{ maxWidth: 360, color: "var(--muted)", lineHeight: 1.55, fontSize: 16 }}>
            SaaS productizados, software a medida, consultoría y agencia. Cada uno es un caso real de
            cómo aplicamos IA + negocios. Úsalos en tu empresa.
          </p>
        </div>
        <ServicesCarousel services={services} />
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link href={tp("/empresas")}>
            <Button variant="ghost">Ver todas mis empresas →</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
