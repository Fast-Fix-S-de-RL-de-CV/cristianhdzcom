"use client";
import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";
import type { AboutCtaCard, AboutExtraSection, AboutGallerySlide, AboutPageContent } from "@/lib/about-page";

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  background: "white",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--muted)",
  letterSpacing: "0.08em",
  fontWeight: 700,
  marginBottom: 4,
  textTransform: "uppercase",
  fontFamily: "var(--font-mono)",
};

export function AboutEditor({ initial }: { initial: AboutPageContent }) {
  const { tp } = useTenant();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AboutPageContent>(initial);

  function set<K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }
  function updateSlide(i: number, patch: Partial<AboutGallerySlide>) {
    setForm((p) => ({ ...p, gallerySlides: (p.gallerySlides ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  }
  function updateExtra(i: number, patch: Partial<AboutExtraSection>) {
    setForm((p) => ({ ...p, extraSections: (p.extraSections ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  }
  function updateCta(i: number, patch: Partial<AboutCtaCard>) {
    setForm((p) => ({ ...p, ctaCards: (p.ctaCards ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  }

  async function upload(file: File, index: number) {
    setUploadTarget(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(tp("/api/admin/upload?type=section"), { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) {
        toast.error(j.error || "No se pudo subir la imagen");
        return;
      }
      updateSlide(index, { img: j.url });
    } catch {
      toast.error("Error de red al subir imagen");
    } finally {
      setUploadTarget(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const clean: AboutPageContent = {
        ...form,
        gallerySlides: (form.gallerySlides ?? []).filter((s) => s.img || s.title || s.subtitle || s.description),
        extraSections: (form.extraSections ?? []).filter((s) => s.eyebrow || s.title || s.body),
        ctaCards: (form.ctaCards ?? []).filter((s) => s.title || s.body || s.label || s.href),
      };
      const res = await fetch(tp("/api/admin/branding"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aboutPage: clean }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar"));
        return;
      }
      toast.success("Página Acerca de guardada");
      router.refresh();
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col" style={{ gap: 22, padding: 28 }}>
      <Section title="Galería de portada">
        {(form.gallerySlides ?? []).map((slide, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }} className="col">
            <div className="between" style={{ alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>SLIDE {i + 1}</span>
              <button type="button" onClick={() => set("gallerySlides", (form.gallerySlides ?? []).filter((_, j) => j !== i))} style={iconDanger()}>
                <Trash2 size={14} />
              </button>
            </div>
            {slide.img && <img src={slide.img} alt="" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }} />}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost row" disabled={uploadTarget === i} onClick={() => { setUploadTarget(i); fileRef.current?.click(); }} style={{ gap: 6, padding: "7px 12px", fontSize: 12 }}>
                {uploadTarget === i ? <Loader2 size={13} /> : <Upload size={13} />} Subir imagen
              </button>
              <input value={slide.img ?? ""} onChange={(e) => updateSlide(i, { img: e.target.value })} placeholder="/uploads/… o https://…" style={{ ...input, flex: 1, minWidth: 220 }} />
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="Título" value={slide.title} onChange={(v) => updateSlide(i, { title: v })} />
              <TF label="Subtítulo" value={slide.subtitle} onChange={(v) => updateSlide(i, { subtitle: v })} />
            </div>
            <TF label="Descripción" value={slide.description} onChange={(v) => updateSlide(i, { description: v })} area />
            <TF label="Botón opcional" value={slide.cta} onChange={(v) => updateSlide(i, { cta: v })} />
          </div>
        ))}
        <button type="button" onClick={() => set("gallerySlides", [...(form.gallerySlides ?? []), {}])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
          <Plus size={15} /> Agregar slide
        </button>
      </Section>

      <Section title="Historia">
        <TF label="Eyebrow" value={form.storyEyebrow} onChange={(v) => set("storyEyebrow", v)} />
        <TF label="Título" value={form.storyTitle} onChange={(v) => set("storyTitle", v)} />
        <TF label="Párrafo principal" value={form.storyBody1} onChange={(v) => set("storyBody1", v)} area />
        <TF label="Párrafo secundario" value={form.storyBody2} onChange={(v) => set("storyBody2", v)} area />
      </Section>

      <Section title="Trayectoria y quote">
        <div className="grid-2" style={{ gap: 10 }}>
          <TF label="Eyebrow números" value={form.statsEyebrow} onChange={(v) => set("statsEyebrow", v)} />
          <TF label="Título números" value={form.statsTitle} onChange={(v) => set("statsTitle", v)} />
        </div>
        <TF label="Eyebrow quote" value={form.quoteEyebrow} onChange={(v) => set("quoteEyebrow", v)} />
        <TF label="Quote" value={form.quoteText} onChange={(v) => set("quoteText", v)} area />
        <TF label="Atribución" value={form.quoteAttrib} onChange={(v) => set("quoteAttrib", v)} />
      </Section>

      <Section title="Secciones extra">
        {(form.extraSections ?? []).map((section, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }} className="col">
            <div className="between">
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>SECCIÓN {i + 1}</span>
              <button type="button" onClick={() => set("extraSections", (form.extraSections ?? []).filter((_, j) => j !== i))} style={iconDanger()}>
                <Trash2 size={14} />
              </button>
            </div>
            <TF label="Eyebrow" value={section.eyebrow} onChange={(v) => updateExtra(i, { eyebrow: v })} />
            <TF label="Título" value={section.title} onChange={(v) => updateExtra(i, { title: v })} />
            <TF label="Contenido" value={section.body} onChange={(v) => updateExtra(i, { body: v })} area />
          </div>
        ))}
        <button type="button" onClick={() => set("extraSections", [...(form.extraSections ?? []), {}])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
          <Plus size={15} /> Agregar sección
        </button>
      </Section>

      <Section title="CTAs finales">
        {(form.ctaCards ?? []).map((card, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }} className="col">
            <div className="between">
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>CTA {i + 1}</span>
              <button type="button" onClick={() => set("ctaCards", (form.ctaCards ?? []).filter((_, j) => j !== i))} style={iconDanger()}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="Eyebrow" value={card.eyebrow} onChange={(v) => updateCta(i, { eyebrow: v })} />
              <TF label="Título" value={card.title} onChange={(v) => updateCta(i, { title: v })} />
            </div>
            <TF label="Texto" value={card.body} onChange={(v) => updateCta(i, { body: v })} area />
            <div className="grid-2" style={{ gap: 10 }}>
              <TF label="Botón" value={card.label} onChange={(v) => updateCta(i, { label: v })} />
              <TF label="Enlace" value={card.href} onChange={(v) => updateCta(i, { href: v })} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set("ctaCards", [...(form.ctaCards ?? []), {}])} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13, alignSelf: "flex-start" }}>
          <Plus size={15} /> Agregar CTA
        </button>
      </Section>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && uploadTarget !== null) upload(f, uploadTarget); else setUploadTarget(null); e.target.value = ""; }} />
      <button type="button" onClick={save} disabled={saving} className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "10px 18px", fontSize: 13 }}>
        {saving ? "Guardando…" : "Guardar Acerca de"}
      </button>
    </div>
  );
}

function TF({ label, value, onChange, area }: { label: string; value?: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      {area ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ ...input, minHeight: 88, resize: "vertical" }} />
      ) : (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={input} />
      )}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mono" style={{ fontSize: 11, color: "var(--ink)", letterSpacing: "0.1em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)", textTransform: "uppercase", fontWeight: 700 }}>
        {title}
      </h3>
      <div className="col" style={{ gap: 12 }}>{children}</div>
    </div>
  );
}

function iconDanger(): React.CSSProperties {
  return { border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: 4 };
}
