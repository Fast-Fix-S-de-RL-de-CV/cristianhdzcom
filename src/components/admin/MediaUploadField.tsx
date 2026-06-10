"use client";

/**
 * Campo unificado para subir imágenes (y opcionalmente videos) al storage
 * del sitio. Sustituye los antiguos inputs de texto donde se pegaba una URL
 * manualmente.
 *
 * Dos modos:
 *  - mode="image" (default): SOLO permite subir archivos de imagen. No hay
 *    input de URL — la gráfica siempre se almacena en el storage del sitio.
 *  - mode="image-or-video": permite subir imagen O video, O pegar un link
 *    de Vimeo/YouTube. Usado en cursos (portadas que pueden ser video).
 *
 * En ambos modos el caller recibe `(url, kind)` — kind es "image" | "video".
 * Si el usuario quita el archivo, recibe `("", null)`.
 *
 * Convención del proyecto: para multimedia gráfica → upload. Para videos
 * largos → siempre pegar link de Vimeo/YouTube (no se sube el archivo).
 */
import { useRef, useState } from "react";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const ACCEPT_IMAGE_VIDEO = `${ACCEPT_IMAGE},video/mp4,video/webm,video/quicktime`;

type Kind = "image" | "video";

export function MediaUploadField({
  label,
  url,
  kind,
  onChange,
  mode = "image",
  aspectRatio = "16 / 9",
  hint,
}: {
  label: string;
  url: string;
  kind: Kind | null;
  onChange: (url: string, kind: Kind | null) => void;
  mode?: "image" | "image-or-video";
  aspectRatio?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const acceptsVideo = mode === "image-or-video";

  function detectKindFromUrl(u: string): Kind | null {
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
        setErr(
          j.error === "too_large"
            ? `Archivo muy grande (máx ${Math.round((j.maxBytes || 8 * 1048576) / 1048576)} MB)`
            : j.error === "unsupported_mime"
              ? "Formato no soportado"
              : "Error al subir",
        );
        return;
      }
      onChange(j.url, j.kind as Kind);
    } catch {
      setErr("Error de red al subir");
    } finally {
      setUploading(false);
    }
  }

  function applyUrl() {
    if (!urlInput.trim()) return;
    const k = detectKindFromUrl(urlInput.trim()) ?? "video";
    onChange(urlInput.trim(), k);
    setUrlInput("");
  }

  const isVimeo = /vimeo\.com\/(\d+)/i.exec(url || "");
  const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i.exec(url || "");

  return (
    <label className="col" style={{ gap: 6 }}>
      <span
        className="mono"
        style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        {label}
      </span>
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
              aspectRatio,
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
                alt="Preview"
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
              aria-label="Quitar"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload control */}
        <input
          ref={fileRef}
          type="file"
          accept={acceptsVideo ? ACCEPT_IMAGE_VIDEO : ACCEPT_IMAGE}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
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
            {uploading
              ? "Subiendo…"
              : url
                ? "Reemplazar archivo"
                : acceptsVideo
                  ? "📤 Subir imagen / video"
                  : "📤 Subir imagen"}
          </button>

          {acceptsVideo && (
            <>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                o pega un link de Vimeo/YouTube
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
                placeholder="https://vimeo.com/123 o https://youtu.be/..."
                style={{
                  flex: 1,
                  minWidth: 220,
                  fontSize: 12,
                  padding: "8px 10px",
                  border: "1px solid var(--line-2)",
                  borderRadius: 8,
                  background: "white",
                  fontFamily: "var(--font-sans)",
                }}
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
            </>
          )}
        </div>

        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
          {hint ??
            (acceptsVideo
              ? "Imagen: JPG/PNG/WebP/GIF/AVIF · max 8 MB. Video: MP4/WebM/MOV · max 50 MB. Para videos largos preferimos Vimeo."
              : "JPG, PNG, WebP, GIF, AVIF · max 8 MB. Se almacena en el servidor del sitio.")}
        </div>
        {err && (
          <div className="mono" style={{ fontSize: 11, color: "var(--red)" }}>
            {err}
          </div>
        )}
      </div>
    </label>
  );
}
