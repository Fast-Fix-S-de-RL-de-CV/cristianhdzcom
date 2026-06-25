"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { SelectField } from "@/components/ui/SelectField";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";
import { apiErrorMessage } from "@/lib/apiError";
import { coverEmbedUrl } from "@/lib/video";

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  kind: string;
  tagline: string | null;
  description: string | null;
  glyph: string | null;
  hue: number;
  badge: string | null;
  metricLabel: string | null;
  priceLabel: string | null;
  ctaLabel: string;
  ctaUrl: string | null;
  coverVideoUrl: string | null;
  isCtaCard: boolean;
  showLiveBadge: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

type Filter = "all" | "saas" | "agency" | "consulting" | "inactive";

const KIND_LABELS: Record<string, { label: string; emoji: string }> = {
  saas: { label: "SaaS", emoji: "💻" },
  software: { label: "Software", emoji: "🛠️" },
  consulting: { label: "Consultoría", emoji: "🤝" },
  agency: { label: "Agencia", emoji: "🚀" },
  service: { label: "Servicio", emoji: "📦" },
};

export function ServiciosManager({ rows }: { rows: ServiceRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const bulk = useBulkSelection<string>();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "inactive") return !r.isActive;
      if (filter !== "all") return r.kind === filter;
      return true;
    });
  }, [rows, filter]);

  const visibleIds = filtered.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/services/bulk-delete",
    entityLabel: { singular: "empresa", plural: "empresas" },
    description: "Se eliminan del catálogo público. Esta acción no se puede deshacer.",
    onSuccess: bulk.clear,
  });

  async function removeOne(r: ServiceRow) {
    const ok = await confirm({
      title: `¿Eliminar "${r.name}"?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/services/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar.");
      return;
    }
    toast.success("Eliminado.");
    router.refresh();
  }

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: rows.length },
    { value: "saas", label: "SaaS", count: rows.filter((r) => r.kind === "saas").length },
    { value: "agency", label: "Agencia", count: rows.filter((r) => r.kind === "agency").length },
    { value: "consulting", label: "Consultoría", count: rows.filter((r) => r.kind === "consulting").length },
    { value: "inactive", label: "Inactivos", count: rows.filter((r) => !r.isActive).length },
  ];

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = filter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className="mono"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid " + (active ? "var(--ink)" : "var(--line-2)"),
                  background: active ? "var(--ink)" : "white",
                  color: active ? "var(--bg)" : "var(--ink-2)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.label} · {t.count}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn btn-primary"
          style={{ padding: "6px 12px", fontSize: 11 }}
        >
          + Nueva empresa
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
          gap: 12,
        }}
      >
        <span style={{ width: 24 }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todos"
          />
        </span>
        <span style={{ width: 48 }}>Logo</span>
        <span style={{ flex: 1 }}>Empresa</span>
        <span style={{ width: 110 }}>Tipo</span>
        <span style={{ width: 100 }}>Badge</span>
        <span style={{ width: 70, textAlign: "right" }}>Orden</span>
        <span style={{ width: 70 }}>Status</span>
        <span style={{ width: 140, textAlign: "right" }}>Acciones</span>
      </div>

      {filtered.map((r) => {
        const isChecked = bulk.isSelected(r.id);
        const kindMeta = KIND_LABELS[r.kind] ?? { label: r.kind, emoji: "📦" };
        return (
          <div
            key={r.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              gap: 12,
              ...selectedRowBg(isChecked),
            }}
          >
            <span style={{ width: 24 }}>
              <BulkCheckbox
                checked={isChecked}
                onChange={(c) => bulk.toggleOne(r.id, c)}
                ariaLabel={`Seleccionar ${r.name}`}
              />
            </span>
            <span style={{ width: 48 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: r.isCtaCard
                    ? "var(--bg-2)"
                    : `linear-gradient(135deg, oklch(58% 0.18 ${r.hue}), oklch(42% 0.14 ${r.hue}))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: r.isCtaCard ? "var(--ink)" : "white",
                }}
              >
                {r.glyph ?? r.name.charAt(0)}
              </div>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                {r.domain ?? r.slug} {r.tagline ? `· ${r.tagline}` : ""}
              </div>
            </div>
            <span className="mono" style={{ width: 110, fontSize: 11 }}>
              {kindMeta.emoji} {kindMeta.label}
            </span>
            <span style={{ width: 100, fontSize: 11 }}>
              {r.badge ? (
                <span
                  className="mono"
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--bg-2)",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  {r.badge}
                </span>
              ) : (
                <span style={{ color: "var(--muted)" }}>—</span>
              )}
            </span>
            <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
              {r.sortOrder}
            </span>
            <span style={{ width: 70 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: r.isActive ? "var(--green-soft)" : "var(--bg-3)",
                  color: r.isActive ? "var(--green-strong)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {r.isActive ? "ACTIVE" : "OFF"}
              </span>
            </span>
            <span className="row" style={{ width: 140, justifyContent: "flex-end", gap: 6 }}>
              <button onClick={() => setEditing(r)} className="mono" style={btnStyle("ghost")}>
                Editar
              </button>
              <button onClick={() => removeOne(r)} className="mono" style={btnStyle("danger")}>
                Borrar
              </button>
            </span>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Sin empresas en este filtro.
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "empresa", plural: "empresas" }}
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />

      {(editing || creating) && (
        <ServiceDialog
          service={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ─────────── Dialog: crear/editar ─────────── */

function ServiceDialog({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: service?.slug || "",
    name: service?.name || "",
    domain: service?.domain || "",
    kind: service?.kind || "saas",
    tagline: service?.tagline || "",
    description: service?.description || "",
    glyph: service?.glyph || "",
    hue: service?.hue ?? 22,
    badge: service?.badge || "",
    metricLabel: service?.metricLabel || "",
    priceLabel: service?.priceLabel || "",
    ctaLabel: service?.ctaLabel || "Ver SaaS →",
    ctaUrl: service?.ctaUrl || "",
    coverVideoUrl: service?.coverVideoUrl || "",
    isCtaCard: service?.isCtaCard ?? false,
    showLiveBadge: service?.showLiveBadge ?? true,
    isActive: service?.isActive ?? true,
    sortOrder: service?.sortOrder ?? 0,
  });

  const coverPreview = !form.isCtaCard ? coverEmbedUrl(form.coverVideoUrl) : null;

  async function save() {
    setBusy(true);
    setErr(null);
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      domain: form.domain || null,
      kind: form.kind as "saas" | "software" | "consulting" | "agency" | "service",
      tagline: form.tagline || null,
      description: form.description || null,
      glyph: form.glyph || null,
      hue: Number(form.hue),
      badge: form.badge || null,
      metricLabel: form.metricLabel || null,
      priceLabel: form.priceLabel || null,
      ctaLabel: form.ctaLabel || "Ver SaaS →",
      ctaUrl: form.ctaUrl || null,
      coverVideoUrl: form.coverVideoUrl || null,
      isCtaCard: form.isCtaCard,
      showLiveBadge: form.showLiveBadge,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };

    const url = service ? `/api/admin/services/${service.id}` : "/api/admin/services";
    const method = service ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.error === "slug_taken"
            ? "Ese slug ya está en uso."
            : apiErrorMessage(json, "No se pudo guardar.");
        setErr(msg);
        return;
      }
      toast.success(service ? "Cambios guardados." : "Empresa creada.");
      onSaved();
    } catch {
      setErr("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,30,58,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 14,
          padding: 28,
          maxWidth: 680,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 6 }}>
          {service ? "Editar" : "Nueva"} empresa
        </h2>
        <p className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 22 }}>
          APARECE EN LA SECCIÓN "EMPRESAS Y PROYECTOS" DEL HOME Y EN /EMPRESAS
        </p>

        <div className="col" style={{ gap: 14 }}>
          {/* Preview en vivo del banner */}
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 6 }}>
              PREVIEW
            </div>
            <div
              style={{
                width: "100%",
                maxWidth: 320,
                aspectRatio: "16 / 9",
                margin: "0 auto",
                borderRadius: 10,
                background: coverPreview
                  ? "#0b1220"
                  : form.isCtaCard
                    ? "repeating-linear-gradient(135deg, var(--bg-2) 0 1px, transparent 1px 10px), var(--bg)"
                    : `linear-gradient(135deg, oklch(58% 0.18 ${form.hue}), oklch(42% 0.14 ${form.hue}))`,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {coverPreview && (
                <iframe
                  src={coverPreview}
                  title="Preview del video de portada"
                  allow="autoplay; fullscreen; picture-in-picture"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, pointerEvents: "none" }}
                />
              )}
              {!coverPreview && (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.95)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-serif)",
                    fontSize: 24,
                    fontWeight: 600,
                    color: form.isCtaCard ? "var(--ink)" : `oklch(42% 0.14 ${form.hue})`,
                  }}
                >
                  {form.glyph || form.name.charAt(0) || "?"}
                </div>
              )}
              {form.badge && !form.isCtaCard && (
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    padding: "3px 8px",
                    background: "rgba(255,255,255,0.18)",
                    color: "white",
                    fontSize: 9,
                    borderRadius: 999,
                    letterSpacing: "0.06em",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {form.badge}
                </span>
              )}
              {form.domain && !form.isCtaCard && (
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 12,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {form.domain}
                </span>
              )}
            </div>
          </div>

          <Field label="Nombre">
            <input
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, name: v, slug: form.slug || slugify(v) });
              }}
              style={inputStyle()}
            />
          </Field>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Slug">
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={inputStyle()} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Dominio (ej. bengalpos.com)">
                <input
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  style={inputStyle()}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <SelectField
                label="Tipo"
                size="md"
                value={form.kind}
                onChange={(v) => setForm({ ...form, kind: v })}
                options={[
                  { value: "saas", label: "💻 SaaS productizado" },
                  { value: "software", label: "🛠️ Software a medida" },
                  { value: "consulting", label: "🤝 Consultoría" },
                  { value: "agency", label: "🚀 Agencia / desarrollo" },
                  { value: "service", label: "📦 Servicio" },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Tagline (eyebrow sobre el nombre)">
                <input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  style={inputStyle()}
                  placeholder="PUNTO DE VENTA, E-COMMERCE, etc."
                  maxLength={80}
                />
              </Field>
            </div>
          </div>

          <Field label="Descripción (1-2 líneas, máx ~140 chars)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle(), minHeight: 70 }}
            />
          </Field>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 110 }}>
              <Field label="Glyph (1-4 chars)">
                <input
                  value={form.glyph}
                  maxLength={4}
                  onChange={(e) => setForm({ ...form, glyph: e.target.value })}
                  style={inputStyle()}
                  placeholder="B, TS, M+"
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label={`Hue (0-360) · color principal del banner`}>
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={form.hue}
                  onChange={(e) => setForm({ ...form, hue: Number(e.target.value) })}
                  style={inputStyle()}
                />
                <div className="row" style={{ gap: 4, marginTop: 6 }}>
                  {[22, 50, 165, 195, 250, 300].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForm({ ...form, hue: h })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: form.hue === h ? "2px solid var(--ink)" : "1px solid var(--line)",
                        background: `linear-gradient(135deg, oklch(58% 0.18 ${h}), oklch(42% 0.14 ${h}))`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </Field>
            </div>
            <div style={{ width: 120 }}>
              <Field label="Orden">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  style={inputStyle()}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Badge (esquina superior izq.)">
                <input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  style={inputStyle()}
                  placeholder="INSIGNIA, NUEVO, TOP LATAM…"
                  maxLength={40}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Métrica destacada">
                <input
                  value={form.metricLabel}
                  onChange={(e) => setForm({ ...form, metricLabel: e.target.value })}
                  style={inputStyle()}
                  placeholder="+ 2.400 negocios"
                  maxLength={80}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Precio mostrado">
                <input
                  value={form.priceLabel}
                  onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
                  style={inputStyle()}
                  placeholder="Desde $29/mes, Comisión 8%, Hablemos…"
                  maxLength={60}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Texto del botón CTA">
                <input
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                  style={inputStyle()}
                  placeholder="Ver SaaS →, Cotizar →"
                  maxLength={60}
                />
              </Field>
            </div>
          </div>

          <Field label="URL del CTA (https://… o mailto:)">
            <input
              value={form.ctaUrl}
              onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
              style={inputStyle()}
              placeholder="https://bengalpos.com o mailto:info@cristianhdz.com"
            />
          </Field>

          <Field label="Video de portada (URL Vimeo o YouTube)">
            <input
              value={form.coverVideoUrl}
              onChange={(e) => setForm({ ...form, coverVideoUrl: e.target.value })}
              style={inputStyle()}
              placeholder="https://vimeo.com/1204662764"
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, display: "block" }}>
              Se reproduce en loop, mudo, sobre la portada. Vacío = portada con color + logo.
            </span>
          </Field>

          <div className="row" style={{ gap: 18, paddingTop: 6 }}>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.isCtaCard}
                onChange={(e) => setForm({ ...form, isCtaCard: e.target.checked })}
              />
              Es card CTA (Tu próximo SaaS / cotiza)
            </label>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.showLiveBadge}
                onChange={(e) => setForm({ ...form, showLiveBadge: e.target.checked })}
              />
              Mostrar chip "● EN VIVO"
            </label>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Visible en home
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

        <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={busy || !form.name || !form.slug}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : service ? "Guardar" : "Crear"}
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

function btnStyle(kind: "ghost" | "danger"): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 6,
    background: kind === "danger" ? "white" : "var(--bg-2)",
    color: kind === "danger" ? "var(--red)" : "var(--ink)",
    border: "1px solid var(--line)",
    cursor: "pointer",
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
