"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ConfirmProvider";

type Stat = { value: string; label: string };

type Settings = {
  heroChip1Label: string | null;
  heroChip1Pulse: boolean;
  heroChip2Label: string | null;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitleAccent: string | null;
  heroSubtitleRest: string | null;
  heroBio1: string | null;
  heroBio2: string | null;
  heroCtaPrimaryLabel: string;
  heroCtaSecondaryLabel: string;
  heroPortraitUrl: string | null;
  heroPortraitFooterLine: string;
  heroPortraitChip: string;
  heroStats: Stat[];
  heroQuoteText: string | null;
  heroQuoteAttrib: string | null;
};

export function HeroEditor({ initial }: { initial: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Settings>(initial);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateStat(idx: number, patch: Partial<Stat>) {
    setForm((f) => ({
      ...f,
      heroStats: f.heroStats.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  function save() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/site-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          toast.error("No se pudo guardar.");
          return;
        }
        toast.success("Hero actualizado.");
        router.refresh();
      } catch {
        toast.error("Error de red.");
      }
    });
  }

  async function uploadPortrait(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload?type=hero-portrait", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error || "No se pudo subir.");
        return;
      }
      update("heroPortraitUrl", json.url);
      toast.success("Foto subida.");
    } catch {
      toast.error("Error de red al subir.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "flex-start" }}>
        {/* ─────────── Form ─────────── */}
        <div className="col" style={{ gap: 22 }}>
          <Section title="Chips superiores">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Chip 1 (con punto dorado)">
                  <input
                    value={form.heroChip1Label ?? ""}
                    onChange={(e) => update("heroChip1Label", e.target.value || null)}
                    style={inputStyle()}
                  />
                </Field>
                <label className="row" style={{ gap: 6, fontSize: 12, cursor: "pointer", marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={form.heroChip1Pulse}
                    onChange={(e) => update("heroChip1Pulse", e.target.checked)}
                  />
                  Animación pulse en el punto
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Chip 2">
                  <input
                    value={form.heroChip2Label ?? ""}
                    onChange={(e) => update("heroChip2Label", e.target.value || null)}
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Título y subtítulo">
            <Field label="Eyebrow (texto pequeño arriba del título)">
              <input value={form.heroEyebrow} onChange={(e) => update("heroEyebrow", e.target.value)} style={inputStyle()} />
            </Field>
            <Field label="Título grande (h1)">
              <input value={form.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} style={inputStyle()} />
            </Field>
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label='Subtítulo - parte "destacada" (en dorado)'>
                  <input
                    value={form.heroSubtitleAccent ?? ""}
                    onChange={(e) => update("heroSubtitleAccent", e.target.value || null)}
                    style={inputStyle()}
                    placeholder="Arquitecto de Software"
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Subtítulo - resto (en navy)">
                  <input
                    value={form.heroSubtitleRest ?? ""}
                    onChange={(e) => update("heroSubtitleRest", e.target.value || null)}
                    style={inputStyle()}
                    placeholder="y Empresario."
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Biografía">
            <p className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 6 }}>
              SOPORTA **NEGRITAS** Y *CURSIVAS* CON SINTAXIS MARKDOWN
            </p>
            <Field label="Párrafo 1 (más grande)">
              <textarea
                value={form.heroBio1 ?? ""}
                onChange={(e) => update("heroBio1", e.target.value || null)}
                style={{ ...inputStyle(), minHeight: 100 }}
              />
            </Field>
            <Field label="Párrafo 2 (gris, secundario)">
              <textarea
                value={form.heroBio2 ?? ""}
                onChange={(e) => update("heroBio2", e.target.value || null)}
                style={{ ...inputStyle(), minHeight: 100 }}
              />
            </Field>
          </Section>

          <Section title="Botones CTA">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="CTA primario">
                  <input
                    value={form.heroCtaPrimaryLabel}
                    onChange={(e) => update("heroCtaPrimaryLabel", e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="CTA secundario">
                  <input
                    value={form.heroCtaSecondaryLabel}
                    onChange={(e) => update("heroCtaSecondaryLabel", e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Retrato (foto del lado derecho)">
            <Field label="Foto del hero">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: 14,
                  border: "1px dashed var(--line-2)",
                  borderRadius: 10,
                }}
              >
                {form.heroPortraitUrl ? (
                  <div style={{ width: 72, height: 90, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--bg-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.heroPortraitUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 90,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, oklch(78% 0.04 245), oklch(68% 0.05 252))",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={form.heroPortraitUrl ?? ""}
                    onChange={(e) => update("heroPortraitUrl", e.target.value || null)}
                    placeholder="/uploads/cristian-portrait.jpg o https://…"
                    style={{ ...inputStyle(), marginBottom: 8 }}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      {uploading ? "Subiendo…" : "Subir foto desde mi computadora"}
                    </button>
                    {form.heroPortraitUrl && (
                      <button
                        type="button"
                        onClick={() => update("heroPortraitUrl", null)}
                        className="btn btn-ghost"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPortrait(f);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </Field>
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label='Línea mono encima del nombre (en el overlay)'>
                  <input
                    value={form.heroPortraitFooterLine}
                    onChange={(e) => update("heroPortraitFooterLine", e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Chip verde">
                  <input
                    value={form.heroPortraitChip}
                    onChange={(e) => update("heroPortraitChip", e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Stats (card flotante esquina inferior izquierda)">
            <div className="col" style={{ gap: 10 }}>
              {form.heroStats.map((s, i) => (
                <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted)", width: 30 }}>
                    {i + 1}
                  </span>
                  <input
                    value={s.value}
                    onChange={(e) => updateStat(i, { value: e.target.value })}
                    placeholder="14"
                    style={{ ...inputStyle(), width: 90 }}
                  />
                  <input
                    value={s.label}
                    onChange={(e) => updateStat(i, { label: e.target.value })}
                    placeholder="MARCAS SAAS"
                    style={{ ...inputStyle(), flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        heroStats: f.heroStats.filter((_, idx) => idx !== i),
                      }))
                    }
                    style={{
                      padding: "6px 10px",
                      background: "white",
                      color: "var(--red)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              {form.heroStats.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, heroStats: [...f.heroStats, { value: "", label: "" }] }))
                  }
                  className="btn btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 12, alignSelf: "flex-start" }}
                >
                  + Agregar stat
                </button>
              )}
            </div>
          </Section>

          <Section title="Quote (card flotante esquina superior derecha)">
            <Field label="Texto de la quote">
              <textarea
                value={form.heroQuoteText ?? ""}
                onChange={(e) => update("heroQuoteText", e.target.value || null)}
                style={{ ...inputStyle(), minHeight: 60 }}
              />
            </Field>
            <Field label="Atribución (autor + año)">
              <input
                value={form.heroQuoteAttrib ?? ""}
                onChange={(e) => update("heroQuoteAttrib", e.target.value || null)}
                style={inputStyle()}
              />
            </Field>
          </Section>

          <button
            onClick={save}
            disabled={pending}
            className="btn btn-primary"
            style={{
              padding: "14px 24px",
              fontSize: 14,
              fontWeight: 700,
              alignSelf: "flex-start",
              marginTop: 8,
            }}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>

        {/* ─────────── Preview lateral sticky ─────────── */}
        <div
          style={{
            position: "sticky",
            top: 24,
            padding: 18,
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--bg-2)",
          }}
        >
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 14 }}>
            PREVIEW DEL RETRATO
          </div>
          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: 14,
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(135deg, oklch(78% 0.04 245), oklch(68% 0.05 252))",
              boxShadow: "0 12px 30px rgba(15,17,21,0.18)",
            }}
          >
            {form.heroPortraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.heroPortraitUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                }}
              >
                SIN FOTO
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, zIndex: 2 }}>
              <div className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.9)", letterSpacing: "0.1em" }}>
                {form.heroPortraitFooterLine}
              </div>
              <div className="serif" style={{ fontSize: 18, color: "white", marginTop: 4 }}>
                {form.heroTitle.replace(/\.$/, "")}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
            Aspect 4:5. La foto se centra arriba (object-position: center top) para que la cara
            siempre quede visible. Recomendado: 1200×1500 o similar, formato vertical.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Helpers ─────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--ink)",
          letterSpacing: "0.1em",
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid var(--line)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {title}
      </h3>
      <div className="col" style={{ gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "white",
  };
}
