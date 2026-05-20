"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidSlug, sanitizeSlugInput, slugify } from "@/lib/slug";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";

type Accent = "accent" | "warm" | "green" | "navy" | "gold";

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  type: string;
  durationLabel: string;
  priceUsd: number;
  priceCompareUsd: number | null;
  installmentPriceUsd: number | null;
  installmentCount: number | null;
  accent: Accent;
  description: string;
  bullets: string[];
  coverUrl: string | null;
  coverKind: "image" | "video" | null;
  isActive: boolean;
  isFeatured: boolean;
  modulesCount: number;
  enrollmentsCount: number;
};

const TYPES = ["taller", "curso", "certificacion", "consultoria", "agencia"];
const ACCENTS: Accent[] = ["accent", "warm", "green", "navy", "gold"];

export function CursosManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createProgram(data: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(humanizeError(j));
      }
      setCreating(false);
      toast.success("Curso creado");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateProgram(id: string, data: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/programs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(humanizeError(j));
      }
      setEditing(null);
      toast.success("Cambios guardados");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProgram(id: string) {
    const ok = await confirm({
      title: "¿Eliminar este programa?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/programs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error al borrar");
      }
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el programa");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setCreating(true)}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          + Nuevo curso
        </button>
      </div>

      <div
        className="row"
        style={{
          padding: "14px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ flex: 2 }}>Programa</span>
        <span style={{ width: 110 }}>Tipo</span>
        <span style={{ width: 90, textAlign: "right" }}>Precio</span>
        <span style={{ width: 70, textAlign: "right" }}>Módulos</span>
        <span style={{ width: 70, textAlign: "right" }}>Alumnos</span>
        <span style={{ width: 80 }}>Status</span>
        <span style={{ width: 260, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {rows.map((p) => (
          <div
            key={p.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                /{p.slug}
              </div>
            </div>
            <span
              className="mono"
              style={{
                width: 110,
                fontSize: 11,
                color: "var(--ink-2)",
                textTransform: "uppercase",
              }}
            >
              {p.type}
            </span>
            <span className="mono" style={{ width: 90, textAlign: "right", fontSize: 13, fontWeight: 700 }}>
              ${p.priceUsd}
            </span>
            <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
              {p.modulesCount}
            </span>
            <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
              {p.enrollmentsCount}
            </span>
            <span style={{ width: 80 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: p.isActive ? "var(--green-soft)" : "var(--bg-3)",
                  color: p.isActive ? "var(--green-strong)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {p.isActive ? "ACTIVE" : "DRAFT"}
              </span>
            </span>
            <span className="row" style={{ width: 260, justifyContent: "flex-end", gap: 6 }}>
              <a
                href={`/admin/cursos/${p.id}?tab=lessons`}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Lecciones
              </a>
              <a
                href={`/admin/cursos/${p.id}`}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Abrir
              </a>
              <button
                onClick={() => setEditing(p)}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Editar
              </button>
              <button
                onClick={() => deleteProgram(p.id)}
                disabled={busy}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin programas aún. Crea el primero.
          </div>
        )}
      </div>

      {(creating || editing) && (
        <ProgramDialog
          program={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setErr(null);
          }}
          onSave={(data) => (editing ? updateProgram(editing.id, data) : createProgram(data))}
          busy={busy}
          err={err}
        />
      )}
    </>
  );
}

function ProgramDialog({
  program,
  onClose,
  onSave,
  busy,
  err,
}: {
  program: Row | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  busy: boolean;
  err: string | null;
}) {
  const [form, setForm] = useState({
    title: program?.title || "",
    slug: program?.slug || "",
    subtitle: program?.subtitle || "",
    type: program?.type || "curso",
    durationLabel: program?.durationLabel || "",
    priceUsd: program?.priceUsd ?? 0,
    priceCompareUsd: program?.priceCompareUsd ?? null,
    installmentPriceUsd: program?.installmentPriceUsd ?? null,
    installmentCount: program?.installmentCount ?? null,
    accent: (program?.accent ?? "accent") as Accent,
    description: program?.description || "",
    bullets: program?.bullets ?? [],
    coverUrl: program?.coverUrl ?? "",
    coverKind: (program?.coverKind ?? null) as "image" | "video" | null,
    isActive: program?.isActive ?? true,
    isFeatured: program?.isFeatured ?? false,
  });
  // True once the user has manually edited slug — disables auto-fill from title.
  const [slugTouched, setSlugTouched] = useState(!!program?.slug);
  const slugValid = form.slug.length === 0 || isValidSlug(form.slug);

  function onTitleChange(next: string) {
    setForm((prev) => ({
      ...prev,
      title: next,
      // Auto-generate slug from title only while user hasn't touched it.
      slug: slugTouched ? prev.slug : slugify(next),
    }));
  }

  function onSlugChange(raw: string) {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: sanitizeSlugInput(raw) }));
  }

  function handleSave() {
    // Final pass to guarantee a clean slug even if the user pasted something weird.
    const finalSlug = slugify(form.slug || form.title);
    const cleaned = {
      ...form,
      slug: finalSlug,
      subtitle: form.subtitle || null,
      durationLabel: form.durationLabel || null,
      description: form.description || null,
      bullets: form.bullets.filter((b) => b.trim().length > 0),
      coverUrl: form.coverUrl ? form.coverUrl : null,
      coverKind: form.coverUrl ? form.coverKind ?? "image" : null,
    };
    onSave(cleaned);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 30, 58, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 18 }}>
          {program ? "Editar programa" : "Nuevo programa"}
        </h2>

        <div className="col" style={{ gap: 14 }}>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              style={input()}
              placeholder="Aprende a programar con IA"
            />
          </Field>
          <Field
            label={`Slug (URL: /programas/${form.slug || "tu-slug"})`}
          >
            <input
              value={form.slug}
              onChange={(e) => onSlugChange(e.target.value)}
              style={{
                ...input(),
                borderColor: slugValid ? undefined : "var(--red)",
              }}
              placeholder="aprende-a-programar-con-ia"
              spellCheck={false}
              autoCapitalize="off"
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: slugValid ? "var(--muted)" : "var(--red)",
                marginTop: 4,
                letterSpacing: "0.02em",
              }}
            >
              {slugValid
                ? slugTouched
                  ? "Se completa solo desde el título; lo puedes editar."
                  : "Se autogenera al escribir el título."
                : "Solo a-z, 0-9 y guiones simples. Ej: aprende-a-programar-con-ia"}
            </div>
          </Field>
          <CoverField
            url={form.coverUrl}
            kind={form.coverKind}
            onChange={(url, kind) => setForm((p) => ({ ...p, coverUrl: url, coverKind: kind }))}
          />
          <Field label="Subtítulo (max 240)">
            <textarea
              value={form.subtitle}
              maxLength={240}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              style={{ ...input(), minHeight: 60 }}
            />
          </Field>
          <Field label="Descripción larga (max 5000)">
            <textarea
              value={form.description}
              maxLength={5000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...input(), minHeight: 120 }}
            />
          </Field>

          <Field label="Bullets">
            <div className="col" style={{ gap: 6 }}>
              {form.bullets.map((b, i) => (
                <div key={i} className="row" style={{ gap: 6 }}>
                  <input
                    value={b}
                    maxLength={140}
                    onChange={(e) => {
                      const next = [...form.bullets];
                      next[i] = e.target.value;
                      setForm({ ...form, bullets: next });
                    }}
                    style={{ ...input(), flex: 1 }}
                    placeholder="Punto del programa..."
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bullets: form.bullets.filter((_, j) => j !== i) })}
                    className="mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "0 12px",
                      borderRadius: 6,
                      background: "white",
                      color: "var(--red)",
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, bullets: [...form.bullets, ""] })}
                disabled={form.bullets.length >= 20}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink-2)",
                  border: "1px dashed var(--line-2)",
                  cursor: form.bullets.length >= 20 ? "not-allowed" : "pointer",
                  alignSelf: "flex-start",
                  marginTop: 2,
                }}
              >
                + Agregar bullet
              </button>
            </div>
          </Field>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Tipo">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={input()}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Color acento">
                <select
                  value={form.accent}
                  onChange={(e) => setForm({ ...form, accent: e.target.value as Accent })}
                  style={input()}
                >
                  {ACCENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Duración">
                <input
                  value={form.durationLabel}
                  onChange={(e) => setForm({ ...form, durationLabel: e.target.value })}
                  placeholder="6 semanas"
                  style={input()}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Precio (USD)">
                <input
                  type="number"
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: parseInt(e.target.value || "0", 10) })}
                  style={input()}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Precio comparativo (USD)">
                <input
                  type="number"
                  value={form.priceCompareUsd ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceCompareUsd: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="opcional"
                  style={input()}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Precio mensualidad (USD)">
                <input
                  type="number"
                  value={form.installmentPriceUsd ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      installmentPriceUsd: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="opcional"
                  style={input()}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="N° mensualidades">
                <input
                  type="number"
                  value={form.installmentCount ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      installmentCount: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="opcional"
                  style={input()}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 18 }}>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Activo
            </label>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              Destacado (featured)
            </label>
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: "color-mix(in srgb, var(--red) 10%, white)",
              color: "var(--red)",
              fontSize: 12,
              marginTop: 14,
            }}
          >
            {err}
          </div>
        )}

        <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !form.title || !form.slug || !slugValid}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : program ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

/**
 * Convierte el error JSON del API en un mensaje legible en español.
 * El API devuelve { error: "invalid", details: ZodIssue[] } para 400s de Zod,
 * { error: "slug_in_use" } para 409, etc. Antes mostrábamos solo "invalid"
 * lo cual era inútil — ahora apuntamos al campo y al mensaje del issue.
 */
function humanizeError(j: { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> }): string {
  if (j?.error === "slug_in_use") return "Ese slug ya está en uso. Cambia el título o el slug.";
  if (j?.error === "invalid" && Array.isArray(j.details) && j.details.length > 0) {
    const issue = j.details[0];
    const field = issue.path?.join(".") ?? "campo";
    return `${field}: ${issue.message ?? "valor inválido"}`;
  }
  return j?.error || "No se pudo guardar";
}

function input(): React.CSSProperties {
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

/**
 * CoverField — Imagen o video de portada del curso.
 *
 * Dos formas de cargarla:
 *   1. "Subir archivo": file picker → POST /api/admin/upload → URL local
 *      (imágenes hasta 8MB, videos cortos hasta 50MB).
 *   2. "Pegar URL": para Vimeo/YouTube o assets ya hosteados en CDN.
 *
 * El preview se muestra arriba (mantiene aspect 16:9). Para video que
 * sea archivo subido o URL .mp4/.webm, usa <video>. Para Vimeo/YouTube
 * usa iframe embebido.
 */
function CoverField({
  url,
  kind,
  onChange,
}: {
  url: string;
  kind: "image" | "video" | null;
  onChange: (url: string, kind: "image" | "video" | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  function detectKindFromUrl(u: string): "image" | "video" | null {
    if (!u) return null;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return "video";
    if (/vimeo\.com|youtube\.com|youtu\.be/i.test(u)) return "video";
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(u)) return "image";
    return null;
  }

  async function handleFile(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload?type=cover", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "Error al subir");
        return;
      }
      onChange(j.url, j.kind as "image" | "video");
    } catch {
      setErr("Error de red al subir");
    } finally {
      setUploading(false);
    }
  }

  function applyUrl() {
    if (!urlInput.trim()) return;
    const k = detectKindFromUrl(urlInput.trim()) ?? "image";
    onChange(urlInput.trim(), k);
    setUrlInput("");
  }

  const isVimeo = /vimeo\.com\/(\d+)/i.exec(url || "");
  const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i.exec(url || "");

  return (
    <Field label="Portada del curso (imagen o video)">
      <div
        style={{
          border: "1px dashed rgba(10,30,58,0.18)",
          borderRadius: 12,
          padding: 14,
          background: "color-mix(in srgb, var(--gold) 4%, white)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Preview */}
        {url && (
          <div
            style={{
              position: "relative",
              borderRadius: 10,
              overflow: "hidden",
              aspectRatio: "16 / 9",
              background: "#0a0a0a",
              boxShadow: "0 4px 14px rgba(10,30,58,0.18)",
            }}
          >
            {kind === "video" || isVimeo || isYouTube ? (
              isVimeo ? (
                <iframe
                  src={`https://player.vimeo.com/video/${isVimeo[1]}?title=0&byline=0&portrait=0`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                  title="Preview"
                />
              ) : isYouTube ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${isYouTube[1]}`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                  title="Preview"
                />
              ) : (
                <video src={url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Portada"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            <button
              type="button"
              onClick={() => onChange("", null)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
              }}
              aria-label="Quitar portada"
              title="Quitar portada"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = ""; // allow re-uploading same file
          }}
          style={{ display: "none" }}
        />
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              background: "var(--navy)",
              color: "white",
              border: "none",
              fontWeight: 700,
              fontSize: 12,
              cursor: uploading ? "wait" : "pointer",
              boxShadow: "0 2px 0 #061b36",
            }}
          >
            {uploading ? "Subiendo…" : url ? "Reemplazar archivo" : "📤 Subir imagen / video"}
          </button>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            o pega una URL
          </span>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            placeholder="https://vimeo.com/123  ó  https://cdn.../cover.jpg"
            style={{ ...input(), flex: 1, minWidth: 200, fontSize: 12 }}
          />
          {urlInput && (
            <button
              type="button"
              onClick={applyUrl}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                background: "var(--gold)",
                color: "var(--navy)",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Usar
            </button>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
          Imagen: JPG, PNG, WebP, GIF, AVIF · max 8 MB. Video: MP4, WebM, MOV · max 50 MB.
          Para videos largos preferimos Vimeo (pega el link).
        </div>
        {err && (
          <div className="mono" style={{ fontSize: 11, color: "var(--red)" }}>
            {err}
          </div>
        )}
      </div>
    </Field>
  );
}
