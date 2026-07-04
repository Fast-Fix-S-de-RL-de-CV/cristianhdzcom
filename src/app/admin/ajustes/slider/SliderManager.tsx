"use client";
import { useRef, useState } from "react";
import { Boxes, Images, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";

type HeroType = "slider" | "3d";
type Settings = {
  heroType: string;
  hero3dName: string;
  hero3dSubtitle: string;
  heroHeight: string;
  heroImageFit: string;
};
type Slide = {
  id: string;
  mediaType: string;
  imageUrl: string | null;
  videoUrl: string | null;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  cta2Label: string | null;
  cta2Href: string | null;
  textPosition: string;
  isActive: boolean;
};

const POSITIONS = [
  "top-left", "top-center", "top-right",
  "center-left", "center-center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

const inputStyle: React.CSSProperties = {
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

export function SliderManager({
  siteName,
  initialSettings,
  initialSlides,
}: {
  siteName: string;
  initialSettings: Settings;
  initialSlides: Slide[];
}) {
  const { tp } = useTenant();
  const toast = useToast();
  const confirm = useConfirm();

  const [settings, setSettings] = useState<Settings>({
    ...initialSettings,
    hero3dName: initialSettings.hero3dName || (initialSettings.heroType === "3d" ? "" : siteName),
  });
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [savingSettings, setSavingSettings] = useState(false);

  const heroType = (settings.heroType === "3d" ? "3d" : "slider") as HeroType;

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch(tp("/api/admin/site-settings"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          heroType: settings.heroType,
          hero3dName: settings.hero3dName || (siteName ?? null),
          hero3dSubtitle: settings.hero3dSubtitle || null,
          heroHeight: settings.heroHeight,
          heroImageFit: settings.heroImageFit,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar"));
        return;
      }
      toast.success("Portada guardada");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setSavingSettings(false);
    }
  }

  async function addSlide() {
    try {
      const res = await fetch(tp("/api/admin/hero-slides"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaType: "image", textPosition: "center-center", isActive: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo agregar el slide"));
        return;
      }
      setSlides((s) => [...s, j.slide]);
    } catch {
      toast.error("Error de red — intenta de nuevo");
    }
  }

  function patchLocal(id: string, patch: Partial<Slide>) {
    setSlides((s) => s.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)));
  }

  async function saveSlide(slide: Slide) {
    try {
      const res = await fetch(tp(`/api/admin/hero-slides/${slide.id}`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: slide.mediaType,
          imageUrl: slide.imageUrl,
          videoUrl: slide.videoUrl,
          title: slide.title,
          subtitle: slide.subtitle,
          ctaLabel: slide.ctaLabel,
          ctaHref: slide.ctaHref,
          cta2Label: slide.cta2Label,
          cta2Href: slide.cta2Href,
          textPosition: slide.textPosition,
          isActive: slide.isActive,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar el slide"));
        return;
      }
      toast.success("Slide guardado");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    }
  }

  async function deleteSlide(id: string) {
    const ok = await confirm({
      title: "¿Eliminar este slide?",
      description: "Se quitará de la portada. No se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(tp(`/api/admin/hero-slides/${id}`), { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo eliminar");
        return;
      }
      setSlides((s) => s.filter((sl) => sl.id !== id));
    } catch {
      toast.error("Error de red — intenta de nuevo");
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const i = slides.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= slides.length) return;
    const a = slides[i];
    const b = slides[j];
    // Optimista: reordena local y persiste el sortOrder de ambos.
    const reordered = [...slides];
    reordered[i] = b;
    reordered[j] = a;
    setSlides(reordered);
    await Promise.all([
      fetch(tp(`/api/admin/hero-slides/${a.id}`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: j }),
      }),
      fetch(tp(`/api/admin/hero-slides/${b.id}`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: i }),
      }),
    ]).catch(() => toast.error("No se pudo reordenar"));
  }

  return (
    <div className="col" style={{ gap: 20 }}>
      {/* Tipo de portada */}
      <div style={{ background: "white", border: "1.5px solid var(--line)", borderRadius: 14, padding: 18 }}>
        <div style={labelStyle}>Tipo de portada</div>
        <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <TypeCard
            active={heroType === "slider"}
            icon={<Images size={18} />}
            title="Slider de medios"
            desc="Carrusel con imágenes y/o video"
            onClick={() => setSettings((s) => ({ ...s, heroType: "slider" }))}
          />
          <TypeCard
            active={heroType === "3d"}
            icon={<Boxes size={18} />}
            title="Visual 3D"
            desc="Aura geométrica animada con tu nombre"
            onClick={() => setSettings((s) => ({ ...s, heroType: "3d" }))}
          />
        </div>

        {heroType === "3d" ? (
          <div className="grid-2" style={{ gap: 12, marginTop: 16 }}>
            <label>
              <div style={labelStyle}>Texto grande (3D)</div>
              <input
                style={inputStyle}
                value={settings.hero3dName}
                onChange={(e) => setSettings((s) => ({ ...s, hero3dName: e.target.value }))}
                placeholder={siteName}
              />
            </label>
            <label>
              <div style={labelStyle}>Subtítulo (3D)</div>
              <input
                style={inputStyle}
                value={settings.hero3dSubtitle}
                onChange={(e) => setSettings((s) => ({ ...s, hero3dSubtitle: e.target.value }))}
                placeholder="Tu giro o eslogan"
              />
            </label>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 12, marginTop: 16 }}>
            <label>
              <div style={labelStyle}>Alto de la portada</div>
              <select
                style={inputStyle}
                value={settings.heroHeight}
                onChange={(e) => setSettings((s) => ({ ...s, heroHeight: e.target.value }))}
              >
                <option value="full">Pantalla completa</option>
                <option value="lg">Grande</option>
                <option value="md">Media</option>
                <option value="sm">Compacta</option>
              </select>
            </label>
            <label>
              <div style={labelStyle}>Ajuste de imagen</div>
              <select
                style={inputStyle}
                value={settings.heroImageFit}
                onChange={(e) => setSettings((s) => ({ ...s, heroImageFit: e.target.value }))}
              >
                <option value="cover">Rellenar (cover)</option>
                <option value="contain">Ajustar (contain)</option>
              </select>
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="btn btn-primary"
          style={{ marginTop: 16, padding: "9px 18px", fontSize: 13 }}
        >
          {savingSettings ? "Guardando…" : "Guardar portada"}
        </button>
      </div>

      {/* Slides (solo relevante para el slider) */}
      {heroType === "slider" && (
        <div className="col" style={{ gap: 14 }}>
          <div className="between" style={{ alignItems: "center" }}>
            <div style={labelStyle}>Slides ({slides.length})</div>
            <button type="button" onClick={addSlide} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 14px", fontSize: 13 }}>
              <Plus size={15} /> Agregar slide
            </button>
          </div>

          {slides.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--muted)", fontSize: 14, border: "1px dashed var(--line-2)", borderRadius: 12 }}>
              Aún no hay slides. Agrega el primero para armar tu portada.
            </div>
          )}

          {slides.map((slide, i) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              index={i}
              total={slides.length}
              onChange={(patch) => patchLocal(slide.id, patch)}
              onSave={() => saveSlide(slides.find((s) => s.id === slide.id) ?? slide)}
              onDelete={() => deleteSlide(slide.id)}
              onMove={(dir) => move(slide.id, dir)}
              uploadPath={tp("/api/admin/upload?type=slide")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeCard({
  active, icon, title, desc, onClick,
}: {
  active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="col"
      style={{
        gap: 4,
        alignItems: "flex-start",
        textAlign: "left",
        padding: "12px 16px",
        borderRadius: 12,
        border: `1.5px solid ${active ? "var(--gold-deep)" : "var(--line-2)"}`,
        background: active ? "color-mix(in srgb, var(--gold) 10%, white)" : "white",
        cursor: "pointer",
        minWidth: 220,
        flex: 1,
      }}
    >
      <div className="row" style={{ gap: 8, alignItems: "center", color: active ? "var(--gold-deep)" : "var(--ink)" }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</span>
    </button>
  );
}

function SlideCard({
  slide, index, total, onChange, onSave, onDelete, onMove, uploadPath,
}: {
  slide: Slide;
  index: number;
  total: number;
  onChange: (patch: Partial<Slide>) => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  uploadPath: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, kind: "image" | "video") {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadPath, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j?.error === "too_large" ? "Archivo muy grande" : "No se pudo subir");
        return;
      }
      if (kind === "image") onChange({ imageUrl: j.url });
      else onChange({ videoUrl: j.url, mediaType: "video" });
      toast.success(kind === "image" ? "Imagen subida" : "Video subido");
    } catch {
      toast.error("Error de red al subir");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div style={{ background: "white", border: "1.5px solid var(--line)", borderRadius: 14, padding: 16 }}>
      <div className="between" style={{ alignItems: "center", marginBottom: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>SLIDE {index + 1}</span>
          <label className="row" style={{ gap: 6, fontSize: 12, alignItems: "center" }}>
            <input type="checkbox" checked={slide.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} />
            Activo
          </label>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="btn btn-ghost" style={{ padding: "4px 8px" }}>↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="btn btn-ghost" style={{ padding: "4px 8px" }}>↓</button>
          <button type="button" onClick={onDelete} aria-label="Eliminar" style={{ border: "1px solid color-mix(in srgb, var(--red) 35%, white)", color: "var(--red)", background: "white", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select
          style={{ ...inputStyle, width: "auto" }}
          value={slide.mediaType}
          onChange={(e) => onChange({ mediaType: e.target.value })}
        >
          <option value="image">Imagen</option>
          <option value="video">Video</option>
        </select>
        <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading !== null} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 12px", fontSize: 12 }}>
          {uploading === "image" ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Imagen{slide.mediaType === "video" ? "/poster" : ""}
        </button>
        {slide.mediaType === "video" && (
          <button type="button" onClick={() => vidRef.current?.click()} disabled={uploading !== null} className="btn btn-ghost row" style={{ gap: 6, padding: "8px 12px", fontSize: 12 }}>
            {uploading === "video" ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Subir video
          </button>
        )}
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "image"); e.target.value = ""; }} />
        <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "video"); e.target.value = ""; }} />
      </div>

      {slide.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.imageUrl} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
      )}

      {slide.mediaType === "video" && (
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={labelStyle}>URL de video (YouTube/Vimeo/MP4) — o usa &quot;Subir video&quot;</div>
          <input style={inputStyle} value={slide.videoUrl ?? ""} onChange={(e) => onChange({ videoUrl: e.target.value || null })} placeholder="https://youtu.be/…" />
        </label>
      )}

      <div className="grid-2" style={{ gap: 12 }}>
        <label>
          <div style={labelStyle}>Título</div>
          <input style={inputStyle} value={slide.title ?? ""} onChange={(e) => onChange({ title: e.target.value || null })} />
        </label>
        <label>
          <div style={labelStyle}>Posición del texto</div>
          <select style={inputStyle} value={slide.textPosition} onChange={(e) => onChange({ textPosition: e.target.value })}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>
        <div style={labelStyle}>Subtítulo</div>
        <input style={inputStyle} value={slide.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value || null })} />
      </label>

      <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
        <label>
          <div style={labelStyle}>Botón 1 · texto</div>
          <input style={inputStyle} value={slide.ctaLabel ?? ""} onChange={(e) => onChange({ ctaLabel: e.target.value || null })} />
        </label>
        <label>
          <div style={labelStyle}>Botón 1 · enlace</div>
          <input style={inputStyle} value={slide.ctaHref ?? ""} onChange={(e) => onChange({ ctaHref: e.target.value || null })} placeholder="/programas o https://…" />
        </label>
        <label>
          <div style={labelStyle}>Botón 2 · texto</div>
          <input style={inputStyle} value={slide.cta2Label ?? ""} onChange={(e) => onChange({ cta2Label: e.target.value || null })} />
        </label>
        <label>
          <div style={labelStyle}>Botón 2 · enlace</div>
          <input style={inputStyle} value={slide.cta2Href ?? ""} onChange={(e) => onChange({ cta2Href: e.target.value || null })} />
        </label>
      </div>

      <button type="button" onClick={onSave} className="btn btn-primary" style={{ marginTop: 14, padding: "8px 16px", fontSize: 13 }}>
        Guardar slide
      </button>
    </div>
  );
}
