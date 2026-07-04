"use client";
import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";
import type { HomeSections, PathCard, Phase } from "@/lib/home-sections";

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  background: "white",
};
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: "var(--muted)",
  letterSpacing: "0.08em",
  fontWeight: 700,
  marginBottom: 4,
  textTransform: "uppercase",
  fontFamily: "var(--font-mono)",
};

function TF({ label, value, onChange, area }: { label: string; value?: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label style={{ display: "block" }}>
      <div style={lbl}>{label}</div>
      {area ? (
        <textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input style={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Block({
  title, show, onToggle, children,
}: {
  title: string; show: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "white", border: "1.5px solid var(--line)", borderRadius: 14, padding: 18 }}>
      <div className="between" style={{ alignItems: "center", marginBottom: show ? 14 : 0 }}>
        <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--navy)" }}>{title}</div>
        <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={show} onChange={(e) => onToggle(e.target.checked)} />
          {show ? "Visible" : "Oculta"}
        </label>
      </div>
      {show && <div className="col" style={{ gap: 12 }}>{children}</div>}
    </div>
  );
}

export function HomeContentEditor({ initial, isSeed }: { initial: HomeSections; isSeed: boolean }) {
  const { tp } = useTenant();
  const toast = useToast();
  const [s, setS] = useState<HomeSections>(initial);
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof HomeSections>(key: K, patch: Partial<NonNullable<HomeSections[K]>>) {
    setS((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...patch } }));
  }

  const paths = s.paths ?? {};
  const metodo = s.metodo ?? {};
  const finalCta = s.finalCta ?? {};

  function setCards(cards: PathCard[]) { upd("paths", { cards }); }
  function setPhases(phases: Phase[]) { upd("metodo", { phases }); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(tp("/api/admin/site-settings"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ homeSections: s }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar"));
        return;
      }
      toast.success("Contenido del Home guardado");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {isSeed && (
        <div className="row" style={{ gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, border: "1px solid color-mix(in srgb, #E89B3D 45%, white)", background: "color-mix(in srgb, #E89B3D 10%, white)", color: "#a86a1f", fontSize: 13, lineHeight: 1.5 }}>
          <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Este es el sitio original. Guardar aquí <strong>reemplaza</strong> el diseño actual del Home por
            estas secciones editables. Si no quieres cambiarlo, no guardes.
          </span>
        </div>
      )}

      {/* Tres caminos / bloques */}
      <Block title="Bloques destacados (3 caminos)" show={paths.show ?? false} onToggle={(v) => upd("paths", { show: v })}>
        <TF label="Eyebrow" value={paths.eyebrow} onChange={(v) => upd("paths", { eyebrow: v })} />
        <TF label="Título" value={paths.title} onChange={(v) => upd("paths", { title: v })} />
        <TF label="Intro" value={paths.intro} onChange={(v) => upd("paths", { intro: v })} area />
        <div style={lbl}>Tarjetas</div>
        {(paths.cards ?? []).map((c, i) => (
          <div key={i} style={{ border: "1px solid var(--line-2)", borderRadius: 10, padding: 12 }} className="col">
            <div className="between" style={{ marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>TARJETA {i + 1}</span>
              <button type="button" onClick={() => setCards((paths.cards ?? []).filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="Etiqueta" value={c.tag} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, tag: v } : x))} />
              <TF label="Eyebrow" value={c.eyebrow} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, eyebrow: v } : x))} />
            </div>
            <TF label="Título" value={c.title} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, title: v } : x))} />
            <TF label="Descripción" value={c.desc} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, desc: v } : x))} area />
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="KPI (pie)" value={c.kpi} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, kpi: v } : x))} />
              <TF label="Texto CTA" value={c.ctaLabel} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, ctaLabel: v } : x))} />
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="Enlace" value={c.href} onChange={(v) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, href: v } : x))} />
              <label>
                <div style={lbl}>Color</div>
                <select style={input} value={c.color ?? "ink"} onChange={(e) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, color: e.target.value as PathCard["color"] } : x))}>
                  <option value="ink">Neutro</option>
                  <option value="accent">Acento</option>
                  <option value="warm">Cálido</option>
                </select>
              </label>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setCards([...(paths.cards ?? []), { color: "ink" }])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
          <Plus size={15} /> Agregar tarjeta
        </button>
      </Block>

      {/* Data-driven: encabezados */}
      {(["talleres", "programas", "empresas"] as const).map((key) => {
        const c = s[key] ?? {};
        const nombre = key === "talleres" ? "Talleres / eventos" : key === "programas" ? "Programas / cursos" : "Servicios / empresas";
        return (
          <Block key={key} title={nombre} show={c.show ?? true} onToggle={(v) => upd(key, { show: v })}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Las tarjetas salen de tu contenido; aquí editas el encabezado.</div>
            <TF label="Eyebrow" value={c.eyebrow} onChange={(v) => upd(key, { eyebrow: v })} />
            <TF label="Título" value={c.title} onChange={(v) => upd(key, { title: v })} />
            <TF label="Subtítulo" value={c.subtitle} onChange={(v) => upd(key, { subtitle: v })} area />
            <TF label="Texto del botón" value={c.ctaLabel} onChange={(v) => upd(key, { ctaLabel: v })} />
          </Block>
        );
      })}

      {/* Método / fases */}
      <Block title="Método / fases" show={metodo.show ?? false} onToggle={(v) => upd("metodo", { show: v })}>
        <TF label="Eyebrow" value={metodo.eyebrow} onChange={(v) => upd("metodo", { eyebrow: v })} />
        <TF label="Título" value={metodo.title} onChange={(v) => upd("metodo", { title: v })} />
        <TF label="Subtítulo" value={metodo.subtitle} onChange={(v) => upd("metodo", { subtitle: v })} area />
        <div style={lbl}>Fases</div>
        {(metodo.phases ?? []).map((p, i) => (
          <div key={i} style={{ border: "1px solid var(--line-2)", borderRadius: 10, padding: 12 }} className="col">
            <div className="between" style={{ marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>FASE {i + 1}</span>
              <button type="button" onClick={() => setPhases((metodo.phases ?? []).filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            </div>
            <TF label="Título" value={p.title} onChange={(v) => setPhases((metodo.phases ?? []).map((x, j) => j === i ? { ...x, title: v } : x))} />
            <TF label="Descripción" value={p.desc} onChange={(v) => setPhases((metodo.phases ?? []).map((x, j) => j === i ? { ...x, desc: v } : x))} area />
          </div>
        ))}
        <button type="button" onClick={() => setPhases([...(metodo.phases ?? []), {}])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
          <Plus size={15} /> Agregar fase
        </button>
      </Block>

      {/* CTA final */}
      <Block title="Llamado final" show={finalCta.show ?? true} onToggle={(v) => upd("finalCta", { show: v })}>
        <TF label="Chip" value={finalCta.chip} onChange={(v) => upd("finalCta", { chip: v })} />
        <TF label="Título" value={finalCta.title} onChange={(v) => upd("finalCta", { title: v })} />
        <TF label="Subtítulo" value={finalCta.subtitle} onChange={(v) => upd("finalCta", { subtitle: v })} area />
        <div className="grid-2" style={{ gap: 10 }}>
          <TF label="Botón principal" value={finalCta.primaryLabel} onChange={(v) => upd("finalCta", { primaryLabel: v })} />
          <TF label="Botón secundario" value={finalCta.secondaryLabel} onChange={(v) => upd("finalCta", { secondaryLabel: v })} />
        </div>
      </Block>

      <button type="button" onClick={save} disabled={saving} className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 20px", fontSize: 14 }}>
        {saving ? "Guardando…" : "Guardar contenido del Home"}
      </button>
    </div>
  );
}
