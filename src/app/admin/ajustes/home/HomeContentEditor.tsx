"use client";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Info, Loader2, Plus, Trash2, TriangleAlert, Upload } from "lucide-react";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";
import { resolveHomeSectionOrder, type HomeSectionKey, type HomeSections, type PathCard, type Phase } from "@/lib/home-sections";

// Secciones cuyas tarjetas se administran en otro menú (no aquí).
const DATA_SECTIONS: { key: "talleres" | "programas" | "empresas"; nombre: string; label: string; route: string; noun: string }[] = [
  { key: "talleres", nombre: "Talleres / eventos", label: "Talleres", route: "/admin/talleres", noun: "sus banners" },
  { key: "programas", nombre: "Programas / cursos", label: "Cursos", route: "/admin/cursos", noun: "sus portadas" },
  { key: "empresas", nombre: "Servicios / empresas", label: "Empresas", route: "/admin/servicios", noun: "sus imágenes" },
];
const DATA_SECTION_BY_KEY = Object.fromEntries(DATA_SECTIONS.map((section) => [section.key, section])) as Record<(typeof DATA_SECTIONS)[number]["key"], (typeof DATA_SECTIONS)[number]>;

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

function ImageField({ value, onChange, uploadPath }: { value?: string; onChange: (v: string | undefined) => void; uploadPath: string }) {
  const toast = useToast();
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  async function upload(file: File) {
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadPath, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j?.error === "too_large" ? "Imagen muy grande" : "No se pudo subir"); return; }
      onChange(j.url);
    } catch { toast.error("Error de red al subir"); } finally { setUp(false); }
  }
  return (
    <div>
      <div style={lbl}>Imagen (opcional)</div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
      )}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" onClick={() => ref.current?.click()} disabled={up} className="btn btn-ghost row" style={{ gap: 6, padding: "7px 12px", fontSize: 12 }}>
          {up ? <Loader2 size={13} /> : <Upload size={13} />} {value ? "Cambiar" : "Subir imagen"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12 }}>Quitar</button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

/** Aviso para secciones data-driven: las tarjetas viven en otro menú. */
function SectionSourceNote({ noun, label, href }: { noun: string; label: string; href: string }) {
  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--gold-deep) 30%, white)",
        background: "color-mix(in srgb, var(--gold) 8%, white)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--gold-deep)" }} />
      <div className="col" style={{ gap: 8, flex: 1 }}>
        <span>
          Aquí solo editas el <strong>encabezado</strong> y si la sección se muestra. Las tarjetas y {noun} se
          agregan en <strong>{label}</strong>.
        </span>
        <a href={href} className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>
          Ir a {label} →
        </a>
      </div>
    </div>
  );
}

/** Micro-nota para secciones cuyas tarjetas se editan aquí mismo. */
function InPlaceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="row" style={{ gap: 6, alignItems: "center", fontSize: 12, color: "var(--muted)" }}>
      <Info size={13} style={{ flexShrink: 0 }} /> {children}
    </div>
  );
}

function Block({
  title, show, onToggle, children, controls,
}: {
  title: string; show: boolean; onToggle: (v: boolean) => void; children: React.ReactNode; controls?: React.ReactNode;
}) {
  return (
    <div style={{ background: "white", border: "1.5px solid var(--line)", borderRadius: 14, padding: 18 }}>
      <div className="between" style={{ alignItems: "center", marginBottom: show ? 14 : 0 }}>
        <div className="row" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
          <GripVertical size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--navy)" }}>{title}</div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {controls}
          <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={show} onChange={(e) => onToggle(e.target.checked)} />
            {show ? "Visible" : "Oculta"}
          </label>
        </div>
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
  const uploadPath = tp("/api/admin/upload?type=section");
  const sectionOrder = resolveHomeSectionOrder(s.order);

  function upd<K extends keyof HomeSections>(key: K, patch: Partial<NonNullable<HomeSections[K]>>) {
    setS((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...patch } }));
  }

  const paths = s.paths ?? {};
  const metodo = s.metodo ?? {};
  const finalCta = s.finalCta ?? {};

  function setCards(cards: PathCard[]) { upd("paths", { cards }); }
  function setPhases(phases: Phase[]) { upd("metodo", { phases }); }
  function moveSection(key: HomeSectionKey, direction: -1 | 1) {
    setS((prev) => {
      const order = resolveHomeSectionOrder(prev.order);
      const index = order.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return prev;
      const next = [...order];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...prev, order: next };
    });
  }

  function orderControls(key: HomeSectionKey) {
    const index = sectionOrder.indexOf(key);
    return (
      <div className="row" style={{ gap: 4 }}>
        <button
          type="button"
          onClick={() => moveSection(key, -1)}
          disabled={index <= 0}
          className="btn btn-ghost"
          title="Subir sección"
          style={{ width: 32, height: 32, padding: 0, display: "grid", placeItems: "center" }}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => moveSection(key, 1)}
          disabled={index === -1 || index >= sectionOrder.length - 1}
          className="btn btn-ghost"
          title="Bajar sección"
          style={{ width: 32, height: 32, padding: 0, display: "grid", placeItems: "center" }}
        >
          <ArrowDown size={14} />
        </button>
      </div>
    );
  }

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

      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, padding: "2px 2px 4px" }}>
        Aquí editas los <strong>encabezados</strong>, la <strong>visibilidad</strong> y el <strong>orden</strong> de cada sección del home. El
        contenido (las tarjetas) de Talleres, Cursos y Empresas se administra en su propio menú — te lo indicamos en
        cada sección.
      </div>

      {sectionOrder.map((sectionKey) => {
        if (sectionKey === "paths") {
          return (
            <Block key={sectionKey} title="Bloques destacados (3 caminos)" show={paths.show ?? false} onToggle={(v) => upd("paths", { show: v })} controls={orderControls(sectionKey)}>
              <InPlaceNote>Las tarjetas de esta sección se crean y editan aquí mismo (más abajo).</InPlaceNote>
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
                  <ImageField value={c.imageUrl} uploadPath={uploadPath} onChange={(url) => setCards((paths.cards ?? []).map((x, j) => j === i ? { ...x, imageUrl: url } : x))} />
                </div>
              ))}
              <button type="button" onClick={() => setCards([...(paths.cards ?? []), { color: "ink" }])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
                <Plus size={15} /> Agregar tarjeta
              </button>
            </Block>
          );
        }

        if (sectionKey === "metodo") {
          return (
            <Block key={sectionKey} title="Método / fases" show={metodo.show ?? false} onToggle={(v) => upd("metodo", { show: v })} controls={orderControls(sectionKey)}>
              <InPlaceNote>Las fases de esta sección se crean y editan aquí mismo (más abajo).</InPlaceNote>
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
                  <ImageField value={p.imageUrl} uploadPath={uploadPath} onChange={(url) => setPhases((metodo.phases ?? []).map((x, j) => j === i ? { ...x, imageUrl: url } : x))} />
                </div>
              ))}
              <button type="button" onClick={() => setPhases([...(metodo.phases ?? []), {}])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
                <Plus size={15} /> Agregar fase
              </button>
            </Block>
          );
        }

        if (sectionKey === "finalCta") {
          return (
            <Block key={sectionKey} title="Llamado final" show={finalCta.show ?? true} onToggle={(v) => upd("finalCta", { show: v })} controls={orderControls(sectionKey)}>
              <TF label="Chip" value={finalCta.chip} onChange={(v) => upd("finalCta", { chip: v })} />
              <TF label="Título" value={finalCta.title} onChange={(v) => upd("finalCta", { title: v })} />
              <TF label="Subtítulo" value={finalCta.subtitle} onChange={(v) => upd("finalCta", { subtitle: v })} area />
              <div className="grid-2" style={{ gap: 10 }}>
                <TF label="Botón principal" value={finalCta.primaryLabel} onChange={(v) => upd("finalCta", { primaryLabel: v })} />
                <TF label="Botón secundario" value={finalCta.secondaryLabel} onChange={(v) => upd("finalCta", { secondaryLabel: v })} />
              </div>
            </Block>
          );
        }

        const { nombre, label, route, noun } = DATA_SECTION_BY_KEY[sectionKey];
        const c = s[sectionKey] ?? {};
        return (
          <Block key={sectionKey} title={nombre} show={c.show ?? true} onToggle={(v) => upd(sectionKey, { show: v })} controls={orderControls(sectionKey)}>
            <SectionSourceNote noun={noun} label={label} href={tp(route)} />
            <TF label="Eyebrow" value={c.eyebrow} onChange={(v) => upd(sectionKey, { eyebrow: v })} />
            <TF label="Título" value={c.title} onChange={(v) => upd(sectionKey, { title: v })} />
            <TF label="Subtítulo" value={c.subtitle} onChange={(v) => upd(sectionKey, { subtitle: v })} area />
            <TF label="Texto del botón" value={c.ctaLabel} onChange={(v) => upd(sectionKey, { ctaLabel: v })} />
          </Block>
        );
      })}

      <button type="button" onClick={save} disabled={saving} className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 20px", fontSize: 14 }}>
        {saving ? "Guardando…" : "Guardar contenido del Home"}
      </button>
    </div>
  );
}
