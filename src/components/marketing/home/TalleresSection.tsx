import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TallerBanner } from "@/components/marketing/TallerBanner";
import type { HomeSections } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["talleres"]>;
type Taller = React.ComponentProps<typeof TallerBanner>["taller"];

export function TalleresSection({
  config, talleres, tp,
}: {
  config: Cfg | null;
  talleres: Taller[];
  tp: (p: string) => string;
}) {
  if (talleres.length === 0) return null;
  if (config && config.show === false) return null;

  const eyebrow = config ? config.eyebrow : "Talleres · en vivo y on-demand";
  const ctaLabel = (config?.ctaLabel) || "Ver todos los talleres →";

  return (
    <>
      <div className="rule" />
      <section className="sec">
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 24 }}>
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
                  Aprende <span style={{ color: "var(--warm)" }}>de mí en vivo</span>.
                </h2>
                <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16, maxWidth: 600, lineHeight: 1.55 }}>
                  Sesiones en vivo y webinars siempre disponibles (evergreen). Aplica lo que aprendes
                  en tiempo real con casos reales.
                </p>
              </>
            )}
          </div>
          <Link href={tp("/programas?filtro=taller")}>
            <Button variant="ghost">{ctaLabel}</Button>
          </Link>
        </div>
        <div className="talleres-banners" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {talleres.map((t, i) => <TallerBanner key={t.id} taller={t} index={i + 1} />)}
        </div>
      </section>
    </>
  );
}
