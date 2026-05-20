"use client";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/ConfirmProvider";

/**
 * AIGenerateModal — Estructura un curso completo con Claude.
 *
 * Dos rutas:
 *   1. mode="doc"     → el admin pega o sube un archivo (md/txt/pdf/docx) y
 *                       Claude lo organiza como módulos + lecciones.
 *   2. mode="scratch" → solo brief, Claude inventa todo desde cero.
 *
 * Flujo: configurar → generar → confirmar. Mostramos progreso porque Claude
 * puede tardar 30-90 s. Al éxito, refresca el editor con onCreated().
 */
export function AIGenerateModal({
  programId,
  initialMode,
  hasExistingModules,
  onClose,
  onCreated,
}: {
  programId: string;
  initialMode: "doc" | "scratch";
  hasExistingModules: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [mode] = useState<"doc" | "scratch">(initialMode);
  const [sourceText, setSourceText] = useState("");
  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState("");
  const [moduleCount, setModuleCount] = useState(6);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; chars: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Bug fix: en modales con muchos inputs, arrastrar el mouse fuera cerraba
  // el modal por error. Trackeamos dónde empezó el mousedown para ignorar
  // clicks "fantasma" cuando vienen de drag interno.
  const downTarget = useRef<EventTarget | null>(null);

  async function handleFile(file: File) {
    setExtracting(true);
    setFileMeta(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/extract-text", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.message || j.error || "No se pudo extraer texto del archivo");
        return;
      }
      setSourceText(j.text || "");
      setFileMeta({ name: file.name, chars: j.chars ?? (j.text?.length ?? 0) });
    } finally {
      setExtracting(false);
    }
  }

  async function generate() {
    if (brief.trim().length < 10) {
      toast.error("Escribe un brief un poco más detallado (≥10 caracteres)");
      return;
    }
    if (mode === "doc" && sourceText.trim().length < 50) {
      toast.error("Pega o sube el material fuente (al menos 50 caracteres)");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/ai-generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceText: mode === "doc" ? sourceText : null,
          brief,
          audience: audience.trim() || null,
          moduleCount,
          replaceExisting,
          language: "es",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j.message || j.error || "Falló la generación";
        toast.error(msg);
        return;
      }
      toast.success(`Generados ${j.modulesCreated} módulos y ${j.lessonsCreated} lecciones`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Error de red");
    } finally {
      setGenerating(false);
    }
  }

  const title = mode === "doc" ? "Generar curso desde un documento" : "Generar curso desde cero";
  const subtitle =
    mode === "doc"
      ? "Sube un .md, .pdf, .docx o pega el contenido. La IA lo estructurará en módulos y lecciones."
      : "Solo describe el curso. La IA inventará los módulos y lecciones desde cero.";

  return (
    <div
      onMouseDown={(e) => {
        downTarget.current = e.target;
      }}
      onClick={(e) => {
        // Solo cierra si AMBOS eventos (down y click) ocurrieron en el backdrop
        if (
          !generating &&
          !extracting &&
          e.target === e.currentTarget &&
          downTarget.current === e.currentTarget
        ) {
          onClose();
        }
        downTarget.current = null;
      }}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,27,54,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #FFFDF8 0%, #FAF7F0 100%)",
          borderRadius: 18,
          padding: 28,
          maxWidth: 720,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(6,27,54,0.35)",
          border: "1px solid rgba(216,168,63,0.30)",
        }}
      >
        <div className="row" style={{ alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(160deg, #F2C65A 0%, #B88523 100%)",
              color: "var(--navy)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              boxShadow: "0 4px 0 #B88523",
            }}
            aria-hidden
          >
            ✨
          </span>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)" }}>
            {title}
          </h2>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          {subtitle}
        </p>

        {/* DOC MODE: file upload + paste */}
        {mode === "doc" && (
          <section
            style={{
              border: "1px dashed rgba(216,168,63,0.40)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
              background: "color-mix(in srgb, var(--gold) 4%, white)",
            }}
          >
            <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", fontWeight: 700, letterSpacing: "0.08em" }}>
              MATERIAL FUENTE
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.txt,.pdf,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={extracting || generating}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  background: "var(--navy)",
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: extracting ? "wait" : "pointer",
                }}
              >
                {extracting ? "Procesando…" : "📤 Subir .md / .pdf / .docx"}
              </button>
              {fileMeta && (
                <span className="mono" style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 700 }}>
                  ✓ {fileMeta.name} · {fileMeta.chars.toLocaleString("es-MX")} chars
                </span>
              )}
            </div>
            <div style={{ position: "relative", marginTop: 12 }}>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="…o pega aquí directamente el texto (libro, manual, transcripción, lo que tengas)"
                style={{
                  width: "100%",
                  minHeight: 180,
                  padding: 12,
                  border: "1px solid var(--line-2)",
                  borderRadius: 10,
                  fontFamily: "inherit",
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: "white",
                  resize: "vertical",
                }}
                disabled={generating}
              />
              <div
                className="mono"
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 12,
                  fontSize: 10,
                  color: "var(--muted)",
                  background: "rgba(255,255,255,0.85)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {sourceText.length.toLocaleString("es-MX")} chars
              </div>
            </div>
          </section>
        )}

        {/* Brief — always shown */}
        <section style={{ marginBottom: 14 }}>
          <Label required>Brief del curso</Label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={
              mode === "doc"
                ? "Resume en 1-3 oraciones lo que quieres que aprenda el alumno. La IA usará esto + el material fuente."
                : "Describe el curso a fondo: tema, nivel, qué debe lograr el alumno al terminar, tono. Mientras más claro, mejor."
            }
            style={inputStyle({ minHeight: 90 })}
            disabled={generating}
            maxLength={2000}
          />
        </section>

        <section style={{ marginBottom: 14 }}>
          <Label>Audiencia objetivo (opcional)</Label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Ej: Programadores con 1-3 años de experiencia que quieren saltar a SaaS"
            style={inputStyle()}
            disabled={generating}
            maxLength={500}
          />
        </section>

        <section style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 180 }}>
              <Label>Número de módulos</Label>
              <input
                type="number"
                min={2}
                max={12}
                value={moduleCount}
                onChange={(e) => setModuleCount(Math.max(2, Math.min(12, parseInt(e.target.value || "6", 10))))}
                style={inputStyle()}
                disabled={generating}
              />
            </div>
            {hasExistingModules && (
              <label
                className="row"
                style={{
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12,
                  background: "color-mix(in srgb, var(--red) 6%, white)",
                  border: "1px solid color-mix(in srgb, var(--red) 25%, white)",
                  padding: "10px 12px",
                  borderRadius: 10,
                  alignSelf: "flex-end",
                }}
              >
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  disabled={generating}
                />
                <span style={{ color: "var(--ink)" }}>
                  Reemplazar módulos existentes (borra los actuales antes de generar)
                </span>
              </label>
            )}
          </div>
        </section>

        {/* Action bar */}
        <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid rgba(6,27,54,0.16)",
              background: "white",
              color: "var(--navy)",
              fontWeight: 700,
              fontSize: 13,
              cursor: generating ? "wait" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={generating || extracting || brief.trim().length < 10}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              background:
                generating || extracting ? "var(--muted)" : "linear-gradient(160deg, #F2C65A 0%, #B88523 100%)",
              color: "var(--navy)",
              fontWeight: 800,
              fontSize: 13,
              cursor: generating ? "wait" : "pointer",
              boxShadow: generating ? "none" : "0 3px 0 #B88523",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {generating ? (
              <>
                <Spinner /> Generando con Claude… (puede tardar 30-90 s)
              </>
            ) : (
              <>✨ Generar curso</>
            )}
          </button>
        </div>

        {generating && (
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 12,
              textAlign: "center",
              letterSpacing: "0.02em",
            }}
          >
            No cierres esta ventana. Claude está estructurando tu curso…
          </p>
        )}
      </div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        color: "var(--muted)",
        letterSpacing: "0.08em",
        fontWeight: 700,
        marginBottom: 6,
        textTransform: "uppercase",
      }}
    >
      {children}
      {required && <span style={{ color: "#b32f1a", marginLeft: 4 }}>*</span>}
    </div>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "white",
    lineHeight: 1.5,
    ...extra,
  };
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(6,27,54,0.25)",
        borderTopColor: "var(--navy)",
        animation: "ai-spin 0.8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
