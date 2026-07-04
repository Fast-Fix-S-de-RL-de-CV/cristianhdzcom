import { Eyebrow } from "@/components/ui/Eyebrow";
import type { HomeSections, Phase } from "@/lib/home-sections";

type Cfg = NonNullable<HomeSections["metodo"]>;

function PhaseCard({ n, title, desc, imageUrl }: { n: number; title?: string; desc?: string; imageUrl?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, background: "white", borderRadius: 14, border: "1px solid var(--line)" }}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10 }} />
      )}
      <div className="serif" style={{ fontSize: 56, color: "var(--accent)", lineHeight: 1, opacity: 0.85 }}>0{n}</div>
      <h3 style={{ color: "var(--ink)", fontSize: 24 }}>{title}</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{desc}</p>
    </div>
  );
}

const ORIGINAL_PHASES: Phase[] = [
  { title: "Fundamentos", desc: "Lenguaje, modelos, ética y arquitectura básica. Tu base sólida." },
  { title: "Práctica", desc: "Construyes 4 productos cortos con IA. Empiezas a vender al cierre." },
  { title: "Negocio", desc: "Validamos tu nicho, pricing y oferta. Lanzas con automatización." },
  { title: "Escala", desc: "Cierras consultoría o entras a la agencia como operador certificado." },
];

export function MetodoSection({ config }: { config: Cfg | null }) {
  const isOriginal = config === null;
  if (config) {
    if (config.show === false) return null;
    if (!(config.phases && config.phases.length > 0)) return null;
  }
  const phases = isOriginal ? ORIGINAL_PHASES : config!.phases!;

  return (
    <>
      <div className="rule" />
      <section id="metodo" className="sec" style={{ background: "var(--bg-2)", borderRadius: 32, margin: "0 56px" }}>
        <div className="between" style={{ marginBottom: 56, alignItems: "flex-end", flexWrap: "wrap", gap: 24 }}>
          <div>
            <Eyebrow>{isOriginal ? "02 · Método CH" : config!.eyebrow}</Eyebrow>
            {isOriginal ? (
              <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16, color: "var(--ink)" }}>
                De aprendiz a operador
                <br />
                en cuatro fases.
              </h2>
            ) : (
              <h2 style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16, color: "var(--ink)" }}>{config!.title}</h2>
            )}
          </div>
          <span className="serif" style={{ fontSize: 22, color: "var(--muted)", maxWidth: 320, textAlign: "right" }}>
            {isOriginal ? "Cada fase desbloquea una entrega real: cliente, prototipo, MRR o equipo." : config!.subtitle}
          </span>
        </div>
        <div className="grid-4">
          {phases.map((p, i) => <PhaseCard key={i} n={i + 1} title={p.title} desc={p.desc} imageUrl={p.imageUrl} />)}
        </div>
      </section>
    </>
  );
}
