"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ConfirmProvider";
import { useTenant } from "@/components/tenant/TenantProvider";
import { apiErrorMessage } from "@/lib/apiError";
import { NAV_ITEMS_DEFAULT, NAV_TARGETS, type NavItem } from "@/lib/nav-items";

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
type EditableNavItem = NavItem & { linkMode?: "internal" | "external" };

type SocialKey = "instagram" | "facebook" | "youtube" | "tiktok" | "x" | "linkedin";
type Social = Partial<Record<SocialKey, string>>;
type LogoSuggestion = {
  accent: string;
  ink: string;
  bg: string;
  fontStyle: string;
  tone: string;
  rationale: string;
  confidence: number;
};

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
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImageUrl: string | null;
    canonicalUrl: string;
    robots: "index,follow" | "noindex,nofollow";
  };
  footerText: string;
  footerLinks: FooterLink[];
  navItems: EditableNavItem[];
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
  seo: {
    title: "",
    description: "",
    keywords: "",
    ogImageUrl: null,
    canonicalUrl: "",
    robots: "index,follow",
  },
  footerText: "",
  footerLinks: [],
  navItems: NAV_ITEMS_DEFAULT,
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

function isKnownInternal(href: string) {
  return NAV_TARGETS.some((target) => target.href === href);
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
  const [analyzingLogo, setAnalyzingLogo] = useState(false);
  const [logoSuggestion, setLogoSuggestion] = useState<LogoSuggestion | null>(null);

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
          seo: {
            title: b.seo?.title ?? "",
            description: b.seo?.description ?? "",
            keywords: Array.isArray(b.seo?.keywords) ? b.seo.keywords.join(", ") : "",
            ogImageUrl: b.seo?.ogImageUrl ?? null,
            canonicalUrl: b.seo?.canonicalUrl ?? "",
            robots: b.seo?.robots ?? "index,follow",
          },
          footerText: b.footerText ?? "",
          footerLinks: Array.isArray(b.footerLinks) ? b.footerLinks : [],
          navItems: Array.isArray(b.navItems)
            ? b.navItems.map((item: NavItem) => ({ ...item, linkMode: isKnownInternal(item.href) ? "internal" : "external" }))
            : NAV_ITEMS_DEFAULT.map((item) => ({ ...item, linkMode: "internal" })),
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

  function setSeo<K extends keyof Form["seo"]>(key: K, value: Form["seo"][K]) {
    setForm((p) => ({ ...p, seo: { ...p.seo, [key]: value } }));
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
  function addNavItem() {
    setForm((p) => ({ ...p, navItems: [...p.navItems, { label: "", href: "/", isVisible: true, linkMode: "internal" }] }));
  }
  function updateNavItem(i: number, patch: Partial<EditableNavItem>) {
    setForm((p) => ({
      ...p,
      navItems: p.navItems.map((item, j) => (j === i ? { ...item, ...patch } : item)),
    }));
  }
  function removeNavItem(i: number) {
    setForm((p) => ({ ...p, navItems: p.navItems.filter((_, j) => j !== i) }));
  }
  function moveNavItem(i: number, direction: -1 | 1) {
    setForm((p) => {
      const nextIndex = i + direction;
      if (nextIndex < 0 || nextIndex >= p.navItems.length) return p;
      const navItems = [...p.navItems];
      [navItems[i], navItems[nextIndex]] = [navItems[nextIndex], navItems[i]];
      return { ...p, navItems };
    });
  }

  function resetColors() {
    setForm((p) => ({ ...p, ...COLOR_DEFAULTS }));
    setLogoSuggestion(null);
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
      if (kind === "logo") setLogoSuggestion(null);
      toast.success(kind === "logo" ? "Logo subido." : "Favicon subido.");
    } catch {
      toast.error("Error de red al subir.");
    } finally {
      setUploading(null);
    }
  }

  async function analyzeLogo() {
    if (!form.logoUrl) {
      toast.error("Primero sube o pega la URL de un logo.");
      return;
    }
    setAnalyzingLogo(true);
    setLogoSuggestion(null);
    try {
      const res = await fetch(tp("/api/admin/branding/analyze-logo"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          logoUrl: form.logoUrl,
          current: { accent: form.accent, ink: form.ink, bg: form.bg },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo analizar el logo"));
        return;
      }
      setLogoSuggestion(j.suggestion);
      toast.success("Sugerencia generada. Revísala antes de aplicarla.");
    } catch {
      toast.error("Error de red al analizar el logo.");
    } finally {
      setAnalyzingLogo(false);
    }
  }

  async function applyLogoSuggestion(saveNow = false) {
    if (!logoSuggestion) return;
    const next = {
      ...form,
      accent: logoSuggestion.accent,
      ink: logoSuggestion.ink,
      bg: logoSuggestion.bg,
    };
    setForm(next);
    if (saveNow) {
      await save(next);
      return;
    }
    toast.success("Paleta aplicada al formulario. Guarda para publicarla.");
  }

  async function save(nextForm = form) {
    for (const [label, value] of [
      ["acento", nextForm.accent],
      ["texto", nextForm.ink],
      ["fondo", nextForm.bg],
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
          siteName: nextForm.siteName.trim() || undefined,
          accent: nextForm.accent,
          ink: nextForm.ink,
          bg: nextForm.bg,
          logoUrl: nextForm.logoUrl ?? "",
          faviconUrl: nextForm.faviconUrl ?? "",
          seo: {
            title: nextForm.seo.title.trim(),
            description: nextForm.seo.description.trim(),
            keywords: nextForm.seo.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .slice(0, 20),
            ogImageUrl: nextForm.seo.ogImageUrl ?? "",
            canonicalUrl: nextForm.seo.canonicalUrl.trim(),
            robots: nextForm.seo.robots,
          },
          footerText: nextForm.footerText,
          // La API exige label y href: descarta enlaces a medio llenar
          footerLinks: nextForm.footerLinks.filter((l) => l.label.trim() && l.href.trim()),
          navItems: nextForm.navItems
            .filter((item) => item.label.trim() && item.href.trim())
            .map(({ label, href, isVisible, openInNewTab }) => ({
              label: label.trim(),
              href: href.trim(),
              isVisible: isVisible !== false,
              openInNewTab: !!openInNewTab,
            })),
          social: nextForm.social,
          ...(meta.hideBadgeAllowed ? { hideMimarcaBadge: nextForm.hideMimarcaBadge } : {}),
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
              hint="PNG/JPG/WebP con fondo transparente, ~200x48"
              preview="logo"
              resolveSrc={tp}
            />
            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                onClick={analyzeLogo}
                disabled={analyzingLogo || !form.logoUrl}
                className="btn btn-ghost"
                style={{ padding: "8px 12px", fontSize: 12 }}
              >
                {analyzingLogo ? "Analizando logo…" : "Analizar logo con IA"}
              </button>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Genera sugerencias de color y estilo. No aplica cambios automáticamente.
              </span>
            </div>
            {logoSuggestion && (
              <div style={{ marginTop: 12 }}>
                <LogoSuggestionCard
                  suggestion={logoSuggestion}
                  current={{ accent: form.accent, ink: form.ink, bg: form.bg }}
                  onApply={() => applyLogoSuggestion(false)}
                  onApplyAndSave={() => applyLogoSuggestion(true)}
                  onDiscard={() => setLogoSuggestion(null)}
                  saving={saving}
                />
              </div>
            )}
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
              hint="Cuadrado, PNG/JPG/WebP 64x64 o mas"
              preview="favicon"
              resolveSrc={tp}
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

      {/* ── SEO ── */}
      <Section title="SEO">
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          Estos datos se renderizan desde el servidor en el HTML inicial para que bots y redes sociales puedan leerlos antes de cargar la app.
        </div>
        <Field label="Título SEO">
          <input
            value={form.seo.title}
            onChange={(e) => setSeo("title", e.target.value)}
            maxLength={120}
            placeholder={`${form.siteName || "Mi Marca"} — cursos, comunidad y membresías`}
            style={inputStyle()}
          />
        </Field>
        <Field label="Descripción SEO">
          <textarea
            value={form.seo.description}
            onChange={(e) => setSeo("description", e.target.value)}
            maxLength={260}
            placeholder="Describe tu sitio en 140-160 caracteres para Google y redes sociales."
            style={{ ...inputStyle(), minHeight: 74 }}
          />
        </Field>
        <Field label="Keywords separadas por coma">
          <input
            value={form.seo.keywords}
            onChange={(e) => setSeo("keywords", e.target.value)}
            maxLength={500}
            placeholder="curso, comunidad, membresía, consultoría"
            style={inputStyle()}
          />
        </Field>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <ImageField
              label="Imagen social / Open Graph"
              value={form.seo.ogImageUrl}
              onChange={(v) => setSeo("ogImageUrl", v)}
              uploading={false}
              hint="Recomendado 1200×630. Usa /uploads/... o una URL pública."
            />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <Field label="URL canonical">
              <input
                value={form.seo.canonicalUrl}
                onChange={(e) => setSeo("canonicalUrl", e.target.value)}
                placeholder="https://tudominio.com"
                style={inputStyle()}
              />
            </Field>
            <Field label="Robots">
              <select value={form.seo.robots} onChange={(e) => setSeo("robots", e.target.value as Form["seo"]["robots"])} style={inputStyle()}>
                <option value="index,follow">Indexar y seguir enlaces</option>
                <option value="noindex,nofollow">No indexar</option>
              </select>
            </Field>
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

      {/* ── Menú principal ── */}
      <Section title="Menú principal">
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          Edita los enlaces del menú superior. Puedes apuntar a secciones del home, páginas internas o URLs externas.
        </div>
        <div className="col" style={{ gap: 10 }}>
          {form.navItems.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 12, padding: "4px 0" }}>
              Sin enlaces. Agrega uno abajo.
            </div>
          )}
          {form.navItems.map((item, i) => {
            const mode = item.linkMode ?? (isKnownInternal(item.href) ? "internal" : "external");
            return (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "white" }} className="col">
                <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={item.label}
                    onChange={(e) => updateNavItem(i, { label: e.target.value })}
                    placeholder="Texto del menú"
                    maxLength={60}
                    style={{ ...inputStyle(), width: 190 }}
                  />
                  <select
                    value={mode}
                    onChange={(e) => {
                      const nextMode = e.target.value as EditableNavItem["linkMode"];
                      updateNavItem(i, {
                        linkMode: nextMode,
                        href: nextMode === "internal" ? NAV_TARGETS[0].href : item.href.startsWith("http") ? item.href : "",
                        openInNewTab: nextMode === "external" ? item.openInNewTab : false,
                      });
                    }}
                    style={{ ...inputStyle(), width: 150 }}
                  >
                    <option value="internal">Sección / página</option>
                    <option value="external">URL externa</option>
                  </select>
                  {mode === "internal" ? (
                    <select
                      value={isKnownInternal(item.href) ? item.href : "/"}
                      onChange={(e) => updateNavItem(i, { href: e.target.value })}
                      style={{ ...inputStyle(), flex: 1, minWidth: 220 }}
                    >
                      {NAV_TARGETS.map((target) => (
                        <option key={target.href} value={target.href}>{target.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={item.href}
                      onChange={(e) => updateNavItem(i, { href: e.target.value })}
                      placeholder="https://…"
                      maxLength={500}
                      style={{ ...inputStyle(), flex: 1, minWidth: 220 }}
                    />
                  )}
                </div>
                <div className="row" style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={item.isVisible !== false}
                        onChange={(e) => updateNavItem(i, { isVisible: e.target.checked })}
                      />
                      Visible
                    </label>
                    {mode === "external" && (
                      <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!!item.openInNewTab}
                          onChange={(e) => updateNavItem(i, { openInNewTab: e.target.checked })}
                        />
                        Abrir en pestaña nueva
                      </label>
                    )}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button type="button" onClick={() => moveNavItem(i, -1)} disabled={i === 0} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }}>
                      Subir
                    </button>
                    <button type="button" onClick={() => moveNavItem(i, 1)} disabled={i === form.navItems.length - 1} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }}>
                      Bajar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNavItem(i)}
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
                </div>
              </div>
            );
          })}
          {form.navItems.length < 12 && (
            <button
              type="button"
              onClick={addNavItem}
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 12, alignSelf: "flex-start" }}
            >
              + Agregar enlace al menú
            </button>
          )}
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
          onClick={() => save()}
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

function LogoSuggestionCard({
  suggestion,
  current,
  onApply,
  onApplyAndSave,
  onDiscard,
  saving = false,
}: {
  suggestion: LogoSuggestion;
  current: { accent: string; ink: string; bg: string };
  onApply: () => void;
  onApplyAndSave?: () => void;
  onDiscard: () => void;
  saving?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid color-mix(in srgb, var(--gold-deep) 28%, white)",
        background: "color-mix(in srgb, var(--gold) 7%, white)",
        borderRadius: 12,
        padding: 14,
      }}
      className="col"
    >
      <div className="between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", letterSpacing: "0.08em", marginBottom: 4 }}>
            SUGERENCIA IA · {Math.round(suggestion.confidence * 100)}%
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{suggestion.tone}</div>
        </div>
        <button type="button" onClick={onDiscard} className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 11 }}>
          Descartar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <PalettePreview title="Actual" colors={current} />
        <PalettePreview title="Sugerida" colors={suggestion} />
      </div>

      <div
        style={{
          ...previewVars(suggestion.accent, suggestion.ink, suggestion.bg),
          border: "1px solid var(--gold-line)",
          background: "var(--bg)",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div className="between" style={{ gap: 10, alignItems: "center" }}>
          <span className="serif" style={{ fontSize: 15, color: "var(--ink)", fontWeight: 700 }}>Preview</span>
          <span style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, background: "var(--gold-gradient)", color: "var(--navy)", fontWeight: 700 }}>
            Botón
          </span>
        </div>
        <p style={{ color: "var(--ink-2)", fontSize: 12, lineHeight: 1.45, marginTop: 8 }}>
          {suggestion.rationale}
        </p>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45 }}>
        <strong>Tipografía sugerida:</strong> {suggestion.fontStyle}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onApply} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
          Aplicar al formulario
        </button>
        {onApplyAndSave && (
          <button type="button" onClick={onApplyAndSave} disabled={saving} className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}>
            {saving ? "Guardando..." : "Aplicar y guardar"}
          </button>
        )}
      </div>
    </div>
  );
}

function PalettePreview({ title, colors }: { title: string; colors: { accent: string; ink: string; bg: string } }) {
  return (
    <div style={{ border: "1px solid var(--line)", background: "white", borderRadius: 10, padding: 10 }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div className="row" style={{ gap: 6 }}>
        {[
          ["Acento", colors.accent],
          ["Texto", colors.ink],
          ["Fondo", colors.bg],
        ].map(([label, color]) => (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 28, borderRadius: 7, background: color, border: "1px solid var(--line)" }} />
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>{color}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  preview = "square",
  resolveSrc,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  onPickFile?: () => void;
  uploading: boolean;
  hint: string;
  preview?: "logo" | "favicon" | "square";
  resolveSrc?: (path: string) => string;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const isLogo = preview === "logo";
  const boxStyle = isLogo
    ? { width: 128, height: 64, borderRadius: 10 }
    : { width: 56, height: 56, borderRadius: 8 };

  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  return (
    <Field label={label}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: isLogo ? "flex-start" : "center",
          padding: 12,
          border: "1px dashed var(--line-2)",
          borderRadius: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            ...boxStyle,
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isLogo ? 10 : 0,
          }}
        >
          {value && !previewFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.startsWith("/uploads/") && resolveSrc ? resolveSrc(value) : value}
              alt=""
              onError={() => setPreviewFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <span
              className="mono"
              style={{
                fontSize: isLogo ? 9 : 8,
                color: previewFailed ? "var(--red)" : "var(--muted)",
                letterSpacing: "0.06em",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {previewFailed ? "NO CARGA" : "SIN IMAGEN"}
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
            {onPickFile && (
              <button
                type="button"
                onClick={onPickFile}
                disabled={uploading}
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
            )}
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
