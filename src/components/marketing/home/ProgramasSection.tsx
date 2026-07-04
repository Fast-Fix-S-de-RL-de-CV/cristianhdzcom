import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ProgramsCarousel } from "@/components/marketing/ProgramsCarousel";
import type { HomeSections } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["programas"]>;
type Programs = React.ComponentProps<typeof ProgramsCarousel>["programs"];

export function ProgramasSection({
  config, programs, tp,
}: {
  config: Cfg | null;
  programs: Programs;
  tp: (p: string) => string;
}) {
  if (programs.length === 0) return null;
  if (config && config.show === false) return null;

  const eyebrow = config ? config.eyebrow : "Catálogo · 2026";
  const ctaLabel = config?.ctaLabel || "Ver todos los programas →";

  return (
    <>
      <div className="rule" />
      <section id="programas" className="sec">
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 24 }}>
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {config ? (
              <>
                <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16 }}>{config.title}</h2>
                {config.subtitle && (
                  <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16, maxWidth: 600, lineHeight: 1.55 }}>{config.subtitle}</p>
                )}
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16 }}>
                  Programas y <span style={{ color: "var(--accent)" }}>Certificaciones</span>.
                </h2>
                <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16, maxWidth: 600, lineHeight: 1.55 }}>
                  Contenido grabado profesional, módulos completos con plan de pagos, comunidad
                  propia del curso y garantía 30 días. Da click en "Más info" para ver qué incluye
                  sin salir de aquí.
                </p>
              </>
            )}
          </div>
          <Link href={tp("/programas")}>
            <Button variant="ghost">{ctaLabel}</Button>
          </Link>
        </div>
        <ProgramsCarousel programs={programs} />
      </section>
    </>
  );
}
