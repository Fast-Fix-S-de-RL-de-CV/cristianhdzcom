"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ConfirmProvider";
import { useTenant } from "@/components/tenant/TenantProvider";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Tarjeta "Mi sitio" para /admin/ajustes: branding del tenant (mimarca.app).
 *
 * - Carga inicial: GET /api/admin/branding (colores, logo, footer, redes, plan)
 * - Guardar:       PUT /api/admin/branding (merge server-side sobre el jsonb)
 *
 * El preview replica los CSS vars derivados EXACTAMENTE igual que brandVars()
 * en src/app/layout.tsx (color-mix), para que lo que ves sea lo que sale.
 */

const COLOR_DEFAULTS = { accent: "#C8A951", ink: "#0A1E3A", bg: "#FBFAF5" } as const;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type FooterLink = { label: string; href: string };

type SocialKey = "instagram" | "facebook" | "youtube" | "tiktok" | "x" | "linkedin";
type Social = Partial<Record<SocialKey, string>>;

const SOCIAL_FIELDS: Array<{ key: SocialKey; label: string; placeholder: string }> = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/tumarca" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/tumarca" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@tumarca" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@tumarca" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/tumarca" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/tumarca" },
];

type Form = {
  siteName: string;
  accent: string;
  ink: string;
  bg: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  footerText: string;
  footerLinks: FooterLink[];
  social: Social;
  hideMimarcaBadge: boolean;
};

const EMPTY: Form = {
  siteName: "",
  accent: COLOR_DEFAULTS.accent,
  ink: COLOR_DEFAULTS.ink,
  bg: COLOR_DEFAULTS.bg,
  logoUrl: null,
  faviconUrl: null,
  footerText: "",
  footerLinks: [],
  social: {},
  hideMimarcaBadge: false,
};

/** Misma derivación de paleta que brandVars() en src/app/layout.tsx. */
function previewVars(accent: string, ink: string, bg: string): React.CSSProperties {
  return {
    ["--bg" as string]: bg,
    ["--bg-2" as string]: `color-mix(in srgb, ${bg} 96%, ${ink})`,
    ["--bg-3" as string]: `color-mix(in srgb, ${bg} 90%, ${ink})`,
    ["--ink" as string]: ink,
    ["--ink-2" as string]: `color-mix(in srgb, ${ink} 85%, ${bg})`,
    ["--navy" as string]: ink,
    ["--navy-2" as string]: `color-mix(in srgb, ${ink} 88%, white)`,
    ["--navy-3" as string]: `color-mix(in srgb, ${ink} 75%, white)`,
    ["--navy-soft" as string]: `color-mix(in srgb, ${ink} 10%, ${bg})`,
    ["--accent" as string]: `color-mix(in srgb, ${ink} 88%, white)`,
    ["--gold" as string]: accent,
    ["--gold-light" as string]: `color-mix(in srgb, ${accent} 72%, white)`,
    ["--gold-deep" as string]: `color-mix(in srgb, ${accent} 62%, black)`,
    ["--gold-soft" as string]: `color-mix(in srgb, ${accent} 14%, ${bg})`,
    ["--gold-line" as string]: `color-mix(in srgb, ${accent} 45%, ${bg})`,
    ["--gold-gradient" as string]: `linear-gradient(135deg, color-mix(in srgb, ${accent} 62%, black) 0%, color-mix(in srgb, ${accent} 72%, white) 40%, ${accent} 70%, color-mix(in srgb, ${accent} 55%, black) 100%)`,
  };
}

export function MiSitioCard() {
  const { tp } = useTenant();
  const router = useRouter();
  const toast = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Form>(EMPTY);
  const [meta, setMeta] = useState<{ slug: string; plan: string; hideBadgeAllowed: boolean }>({
    slug: "",
    plan: "basico",
    hideBadgeAllowed: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    fetch(tp("/api/admin/branding"))
      .then((r) => r.json())
      .then((j) => {
        if (!j.branding) {
          setLoadFailed(true);
          return;
        }
        const b = j.branding;
        setForm({
          siteName: b.siteName ?? "",
          accent: b.accent ?? COLOR_DEFAULTS.accent,
          ink: b.ink ?? COLOR_DEFAULTS.ink,
          bg: b.bg ?? COLOR_DEFAULTS.bg,
          logoUrl: b.logoUrl ?? null,
          faviconUrl: b.faviconUrl ?? null,
          footerText: b.footerText ?? "",
          footerLinks: Array.isArray(b.footerLinks) ? b.footerLinks : [],
          social: b.social ?? {},
          hideMimarcaBadge: !!b.hideMimarcaBadge,
        });
        setMeta({
          slug: j.slug ?? "",
          plan: j.plan ?? "basico",
          hideBadgeAllowed: !!j.hideBadgeAllowed,
        });
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function addLink() {
    setForm((p) => ({ ...p, footerLinks: [...p.footerLinks, { label: "", href: "" }] }));
  }
  function updateLink(i: number, patch: Partial<FooterLink>) {
    setForm((p) => ({
      ...p,
      footerLinks: p.footerLinks.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    }));
  }
  function removeLink(i: number) {
    setForm((p) => ({ ...p, footerLinks: p.footerLinks.filter((_, j) => j !== i) }));
  }

  function resetColors() {
    setForm((p) => ({ ...p, ...COLOR_DEFAULTS }));
  }

  async function upload(kind: "logo" | "favicon", file: File) {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(tp(`/api/admin/upload?type=${kind}`), { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error || "No se pudo subir.");
        return;
      }
      set(kind === "logo" ? "logoUrl" : "faviconUrl", json.url);
      toast.success(kind === "logo" ? "Logo subido." : "Favicon subido.");
    } catch {
      toast.error("Error de red al subir.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    for (const [label, value] of [
      ["acento", form.accent],
      ["texto", form.ink],
      ["fondo", form.bg],
    ] as const) {
      if (!HEX_RE.test(value)) {
        toast.error(`El color de ${label} debe ser hex #RRGGBB (ej. #C8A951).`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(tp("/api/admin/branding"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteName: form.siteName.trim() || undefined,
          accent: form.accent,
          ink: form.ink,
          bg: form.bg,
          logoUrl: form.logoUrl ?? "",
          faviconUrl: form.faviconUrl ?? "",
          footerText: form.footerText,
          // La API exige label y href: descarta enlaces a medio llenar
          footerLinks: form.footerLinks.filter((l) => l.label.trim() && l.href.trim()),
          social: form.social,
          ...(meta.hideBadgeAllowed ? { hideMimarcaBadge: form.hideMimarcaBadge } : {}),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar"));
        return;
      }
      toast.success("Ajustes de tu sitio guardados");
      router.refresh();
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        Cargando branding…
      </div>
    );
  }

  const accentOk = HEX_RE.test(form.accent) ? form.accent : COLOR_DEFAULTS.accent;
  const inkOk = HEX_RE.test(form.ink) ? form.ink : COLOR_DEFAULTS.ink;
  const bgOk = HEX_RE.test(form.bg) ? form.bg : COLOR_DEFAULTS.bg;

  return (
    <div className="col" style={{ gap: 18 }}>
      {loadFailed && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--red) 35%, white)",
            background: "color-mix(in srgb, var(--red) 8%, white)",
            color: "var(--red)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>
            No se pudo cargar el branding. El guardado está deshabilitado para no sobrescribir tu
            configuración con valores vacíos.
          </span>
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: 12, flexShrink: 0 }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Identidad ── */}
      <Section title="Identidad">
        <Field label="Nombre del sitio">
          <input
            value={form.siteName}
            onChange={(e) => set("siteName", e.target.value)}
            maxLength={80}
            placeholder="Mi Marca"
            style={inputStyle()}
          />
        </Field>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <ImageField
              label="Logo (nav y emails)"
              value={form.logoUrl}
              onChange={(v) => set("logoUrl", v)}
              onPickFile={() => logoInputRef.current?.click()}
              uploading={uploading === "logo"}
              hint="PNG/SVG con fondo transparente, ~200×48"
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("logo", f);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <ImageField
              label="Favicon (pestaña del navegador)"
              value={form.faviconUrl}
              onChange={(v) => set("faviconUrl", v)}
              onPickFile={() => faviconInputRef.current?.click()}
              uploading={uploading === "favicon"}
              hint="Cuadrado, PNG 64×64 o más"
            />
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("favicon", f);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </Section>

      {/* ── Colores + preview ── */}
      <Section title="Colores">
        <div className="mi-sitio-colors" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18, alignItems: "flex-start" }}>
          <div className="col" style={{ gap: 12 }}>
            <ColorField label="Acento (botones, detalles)" value={form.accent} onChange={(v) => set("accent", v)} />
            <ColorField label="Texto / tinta" value={form.ink} onChange={(v) => set("ink", v)} />
            <ColorField label="Fondo" value={form.bg} onChange={(v) => set("bg", v)} />
            <button
              type="button"
              onClick={resetColors}
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 12, alignSelf: "flex-start" }}
            >
              Restablecer colores
            </button>
          </div>

          {/* Preview en vivo con los mismos CSS vars que el layout */}
          <div
            style={{
              ...previewVars(accentOk, inkOk, bgOk),
              border: "1px solid var(--line)",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                borderBottom: "1px solid var(--gold-line)",
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="" style={{ height: 20, maxWidth: 90, objectFit: "contain" }} />
                ) : (
                  <span className="serif" style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {form.siteName || "Mi sitio"}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--gold)",
                  color: "var(--navy)",
                  whiteSpace: "nowrap",
                }}
              >
                Entrar
              </span>
            </div>
            <div style={{ padding: "18px 16px 20px" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--gold-deep)", marginBottom: 6 }}>
                ASÍ SE VERÁ TU SITIO
              </div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>
                {form.siteName || "Tu marca"}
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-2)", margin: "8px 0 14px", lineHeight: 1.5 }}>
                Cursos, comunidad y membresías con tu propia identidad.
              </p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "var(--gold-gradient)",
                    color: "var(--navy)",
                  }}
                >
                  Botón principal
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--gold-line)",
                    background: "var(--gold-soft)",
                    color: "var(--gold-deep)",
                  }}
                >
                  Secundario
                </span>
              </div>
            </div>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--navy)",
                color: "color-mix(in srgb, white 80%, var(--navy))",
                fontSize: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {form.footerText || `© ${new Date().getFullYear()} ${form.siteName || "Tu marca"}`}
              </span>
              <span style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                {form.footerLinks.filter((l) => l.label.trim()).slice(0, 3).map((l, i) => (
                  <span key={i} style={{ color: "var(--gold-light)" }}>{l.label}</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <Section title="Footer">
        <Field label="Texto del footer (máx. 300)">
          <textarea
            value={form.footerText}
            onChange={(e) => set("footerText", e.target.value)}
            maxLength={300}
            placeholder="© Mi Marca. Todos los derechos reservados."
            style={{ ...inputStyle(), minHeight: 60 }}
          />
        </Field>
        <div className="col" style={{ gap: 8 }}>
          <Label>Enlaces del footer (máx. 8)</Label>
          <div className="col" style={{ gap: 8 }}>
            {form.footerLinks.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: "4px 0" }}>
                Sin enlaces. Agrega abajo (ej. Aviso de privacidad, Contacto).
              </div>
            )}
            {form.footerLinks.map((l, i) => (
              <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
                <input
                  value={l.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  placeholder="Etiqueta"
                  maxLength={60}
                  style={{ ...inputStyle(), width: 180 }}
                />
                <input
                  value={l.href}
                  onChange={(e) => updateLink(i, { href: e.target.value })}
                  placeholder="/contacto o https://…"
                  maxLength={300}
                  style={{ ...inputStyle(), flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
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
            {form.footerLinks.length < 8 && (
              <button
                type="button"
                onClick={addLink}
                className="btn btn-ghost"
                style={{ padding: "8px 14px", fontSize: 12, alignSelf: "flex-start" }}
              >
                + Agregar enlace
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ── Redes sociales ── */}
      <Section title="Redes sociales">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <input
                value={form.social[key] ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, social: { ...p.social, [key]: e.target.value } }))
                }
                placeholder={placeholder}
                maxLength={300}
                style={inputStyle()}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Insignia mimarca ── */}
      <Section title="Insignia mimarca">
        {meta.hideBadgeAllowed ? (
          <label className="row" style={{ gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}>
            <input
              type="checkbox"
              checked={form.hideMimarcaBadge}
              onChange={(e) => set("hideMimarcaBadge", e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" }}
            />
            Ocultar la insignia &quot;hecho con mimarca&quot; en mi sitio
          </label>
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Ocultar la insignia &quot;hecho con mimarca&quot; está disponible en el plan Pro.
          </div>
        )}
      </Section>

      {/* Save */}
      <div className="row" style={{ justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={save}
          disabled={saving || loadFailed}
          className="btn btn-primary"
          style={{ padding: "10px 18px", fontSize: 13 }}
        >
          {saving ? "Guardando…" : "Guardar mi sitio"}
        </button>
      </div>
    </div>
  );
}

/* ─────────── Helpers ─────────── */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div>
      <Label>{label}</Label>
      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 40,
            height: 34,
            padding: 2,
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#C8A951"
          maxLength={7}
          spellCheck={false}
          style={{
            ...inputStyle(),
            width: 110,
            fontFamily: "var(--font-mono)",
            borderColor: valid ? "var(--line-2)" : "var(--red)",
          }}
        />
      </div>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  onPickFile,
  uploading,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  onPickFile: () => void;
  uploading: boolean;
  hint: string;
}) {
  return (
    <Field label={label}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 12,
          border: "1px dashed var(--line-2)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span className="mono" style={{ fontSize: 8, color: "var(--muted)", letterSpacing: "0.06em" }}>
              SIN IMAGEN
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="/uploads/… o https://…"
            style={{ ...inputStyle(), marginBottom: 8 }}
          />
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              className="btn btn-primary"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              {uploading ? "Subiendo…" : "Subir imagen"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Quitar
              </button>
            )}
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{hint}</span>
          </div>
        </div>
      </div>
    </Field>
  );
}

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
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
      {children}
    </span>
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
