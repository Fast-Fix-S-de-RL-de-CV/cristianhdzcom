import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { HomeSections } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["finalCta"]>;

export function FinalCtaSection({
  config, hasUser, nextLiveLabel, tp,
}: {
  config: Cfg | null;
  hasUser: boolean;
  nextLiveLabel: string | null;
  tp: (p: string) => string;
}) {
  if (config && config.show === false) return null;
  const isOriginal = config === null;

  const primaryLabel = isOriginal
    ? hasUser ? "Ir a mi plataforma →" : "Reservar taller gratis →"
    : config!.primaryLabel || (hasUser ? "Ir a mi plataforma →" : "Empezar →");
  const secondaryLabel = isOriginal ? "Ver programas pagos" : config!.secondaryLabel || "Ver más";

  return (
    <section id="empezar" className="sec" style={{ paddingTop: 32 }}>
      <Card style={{ padding: 64, position: "relative", overflow: "hidden", background: "var(--bg-2)" }}>
        <div className="mesh" />
        <div className="final-cta-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <Chip variant="ink">{isOriginal ? "PUNTO DE PARTIDA" : config!.chip}</Chip>
            {isOriginal ? (
              <h2 style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 24, marginBottom: 20 }}>
                Empieza con un <span style={{ color: "var(--accent)" }}>taller gratuito</span> esta semana.
              </h2>
            ) : (
              <h2 style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 24, marginBottom: 20 }}>{config!.title}</h2>
            )}
            <p style={{ fontSize: 18, color: "var(--ink-2)", maxWidth: 540 }}>
              {isOriginal
                ? "Entra a la comunidad, asiste a un taller en vivo y decide después si quieres certificarte o que nuestra agencia construya contigo."
                : config!.subtitle}
            </p>
          </div>
          <div className="col">
            <Link href={tp(hasUser ? "/plataforma" : "/registro")}>
              <Button size="lg" style={{ width: "100%", justifyContent: "center" }}>{primaryLabel}</Button>
            </Link>
            <Link href={tp("/programas")}>
              <Button size="lg" variant="ghost" style={{ width: "100%", justifyContent: "center" }}>{secondaryLabel}</Button>
            </Link>
            {nextLiveLabel && (
              <div style={{ fontSize: 12, color: "var(--muted)" }} className="mono">
                {nextLiveLabel}
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
