"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidSlug, sanitizeSlugInput, slugify } from "@/lib/slug";
import {
  type Currency,
  SUPPORTED_CURRENCIES,
  CURRENCY_META,
  formatMoney,
  formatGrouping,
  parseAmount,
  suggestPricing,
} from "@/lib/money";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type Accent = "accent" | "warm" | "green" | "navy" | "gold";

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  type: string;
  durationLabel: string;
  currency: Currency;
  priceUsd: number;
  priceCompareUsd: number | null;
  installmentPriceUsd: number | null;
  installmentCount: number | null;
  pricePerMonth: number | null;
  pricePerYear: number | null;
  accent: Accent;
  description: string;
  bullets: string[];
  coverUrl: string | null;
  coverKind: "image" | "video" | null;
  isActive: boolean;
  isFeatured: boolean;
  includedInMembership: "silver" | "gold" | "black" | null;
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
  const bulk = useBulkSelection<string>();
  const visibleIds = rows.map((p) => p.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/programs/bulk-delete",
    entityLabel: { singular: "programa", plural: "programas" },
    description:
      "Borra también módulos, lecciones, cohortes/generaciones e inscripciones. " +
      "ATENCIÓN: programas con ventas pagadas NO se pueden eliminar — se preservan automáticamente. " +
      "Esta acción no se puede deshacer.",
    successMessage: (b) => {
      const parts = [`${b.deleted} ${b.deleted === 1 ? "programa eliminado" : "programas eliminados"}`];
      const blocked = (b as { blocked?: unknown[] }).blocked ?? [];
      if (blocked.length > 0) {
        parts.push(`${blocked.length} ${blocked.length === 1 ? "bloqueado" : "bloqueados"} por tener ventas pagadas`);
      }
      return parts.join(" · ");
    },
    onSuccess: bulk.clear,
  });

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

  async function toggleActive(id: string, next: boolean) {
    const res = await fetch(`/api/admin/programs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar el estado");
      throw new Error("toggle_failed");
    }
    router.refresh();
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
          gap: 12,
        }}
      >
        <span style={{ width: 24, display: "flex", alignItems: "center" }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todos los programas"
          />
        </span>
        <span style={{ flex: 2 }}>Programa</span>
        <span style={{ width: 110 }}>Tipo</span>
        <span style={{ width: 90, textAlign: "right" }}>Precio</span>
        <span style={{ width: 70, textAlign: "right" }}>Módulos</span>
        <span style={{ width: 70, textAlign: "right" }}>Alumnos</span>
        <span style={{ width: 80, textAlign: "center" }}>Activo</span>
        <span style={{ width: 260, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {rows.map((p) => {
          const isChecked = bulk.isSelected(p.id);
          return (
            <div
              key={p.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                gap: 12,
                ...selectedRowBg(isChecked),
              }}
            >
              <span style={{ width: 24, display: "flex", alignItems: "center" }}>
                <BulkCheckbox
                  checked={isChecked}
                  onChange={(c) => bulk.toggleOne(p.id, c)}
                  ariaLabel={`Seleccionar ${p.title}`}
                />
              </span>
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
                {formatMoney(p.priceUsd, p.currency)}
              </span>
              <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
                {p.modulesCount}
              </span>
              <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
                {p.enrollmentsCount}
              </span>
              <span style={{ width: 80, display: "flex", justifyContent: "center" }}>
                <ActiveToggle
                  value={p.isActive}
                  onToggle={(next) => toggleActive(p.id, next)}
                  ariaLabel={`Activar/desactivar ${p.title}`}
                />
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
          );
        })}
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

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "programa", plural: "programas" }}
        subtitle="PROGRAMAS CON VENTAS PAGADAS SE PRESERVAN AUTOMÁTICAMENTE"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
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
    currency: (program?.currency ?? "USD") as Currency,
    priceUsd: program?.priceUsd ?? 0,
    priceCompareUsd: program?.priceCompareUsd ?? null,
    installmentPriceUsd: program?.installmentPriceUsd ?? null,
    installmentCount: program?.installmentCount ?? null,
    pricePerMonth: program?.pricePerMonth ?? null,
    pricePerYear: program?.pricePerYear ?? null,
    accent: (program?.accent ?? "accent") as Accent,
    description: program?.description || "",
    bullets: program?.bullets ?? [],
    coverUrl: program?.coverUrl ?? "",
    coverKind: (program?.coverKind ?? null) as "image" | "video" | null,
    isActive: program?.isActive ?? true,
    isFeatured: program?.isFeatured ?? false,
    includedInMembership: (program?.includedInMembership ?? null) as
      | "silver"
      | "gold"
      | "black"
      | null,
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
          <Field label="Título" required>
            <input
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              style={input()}
              placeholder="Aprende a programar con IA"
            />
          </Field>
          <Field
            label={`Slug (URL: /programas/${form.slug || "tu-slug"})`}
            required
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
          <MediaUploadField
            label="Portada del curso (imagen o video)"
            url={form.coverUrl}
            kind={form.coverKind}
            onChange={(url, kind) => setForm((p) => ({ ...p, coverUrl: url, coverKind: kind }))}
            mode="image-or-video"
            aspectRatio="16 / 9"
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

          <PricingSection
            currency={form.currency}
            priceUsd={form.priceUsd}
            priceCompareUsd={form.priceCompareUsd}
            installmentPriceUsd={form.installmentPriceUsd}
            installmentCount={form.installmentCount}
            pricePerMonth={form.pricePerMonth}
            pricePerYear={form.pricePerYear}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

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

          <Field label="Incluido en membresía">
            <select
              value={form.includedInMembership ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm({
                  ...form,
                  includedInMembership:
                    v === "silver" || v === "gold" || v === "black" ? v : null,
                });
              }}
              style={input()}
            >
              <option value="">No incluido (solo compra)</option>
              <option value="silver">🥈 Plata o superior</option>
              <option value="gold">🥇 Oro o superior</option>
              <option value="black">🖤 Solo Black</option>
            </select>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Si está marcado, los miembros del plan elegido (o superior) acceden gratis MIENTRAS la membresía esté activa. No afecta compras one-shot — sigue siendo comprable también.
            </div>
          </Field>
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

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
        {required && <span style={{ color: "#b32f1a", marginLeft: 4 }}>*</span>}
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
 * PricingSection — Estrategia de precios con 4 modos de venta.
 *
 * Bloque autocontenido que reemplazó los 4 inputs sueltos anteriores.
 * Diseño basado en el feedback: "deja todo inteligentemente para que sea
 * una buena oferta y el alumno no tenga opción de pretexto de inscribirse".
 *
 * Estructura:
 *   1) Selector de moneda (USD / MXN / EUR)
 *   2) Precio único (lo que vale el curso de un solo pago)
 *   3) Precio comparativo (tachado en marketing) con validación > único
 *   4) Toggle "Plan de pagos" → N° mensualidades + Precio por mes
 *      Total se calcula en vivo. Aviso si total < único.
 *   5) Toggle "Suscripción mensual" → precio/mes
 *   6) Toggle "Suscripción anual" → precio/año
 *
 * Cada amount input formatea el número con grouping al perder foco
 * (123456 → "123,456") usando la locale de la currency.
 *
 * El botón "Sugerir precios" calcula valores con suggestPricing() del
 * helper money.ts — útil cuando el admin acaba de poner el precio base
 * y quiere arrancar con valores razonables que luego puede ajustar.
 */
function PricingSection({
  currency,
  priceUsd,
  priceCompareUsd,
  installmentPriceUsd,
  installmentCount,
  pricePerMonth,
  pricePerYear,
  onChange,
}: {
  currency: Currency;
  priceUsd: number;
  priceCompareUsd: number | null;
  installmentPriceUsd: number | null;
  installmentCount: number | null;
  pricePerMonth: number | null;
  pricePerYear: number | null;
  onChange: (patch: Partial<{
    currency: Currency;
    priceUsd: number;
    priceCompareUsd: number | null;
    installmentPriceUsd: number | null;
    installmentCount: number | null;
    pricePerMonth: number | null;
    pricePerYear: number | null;
  }>) => void;
}) {
  const planEnabled = installmentPriceUsd != null && installmentCount != null;
  const monthlySubEnabled = pricePerMonth != null;
  const yearlySubEnabled = pricePerYear != null;

  // Cross-field validations for live feedback (errors are also enforced server-side).
  const errors = useMemo(() => {
    const out: { compare?: string; plan?: string; planCount?: string; monthly?: string; yearly?: string } = {};
    if (priceCompareUsd != null && priceUsd > 0 && priceCompareUsd <= priceUsd) {
      out.compare = "Debe ser MAYOR al precio único (es el precio tachado).";
    }
    if (planEnabled && priceUsd > 0 && installmentPriceUsd! * installmentCount! < priceUsd) {
      out.plan = `El total del plan (${formatMoney(installmentPriceUsd! * installmentCount!, currency)}) es menor que el precio único.`;
    }
    if (planEnabled && installmentCount! < 2) {
      out.planCount = "Mínimo 2 mensualidades.";
    }
    if (monthlySubEnabled && pricePerMonth! < 1) {
      out.monthly = "El precio mensual debe ser positivo.";
    }
    if (yearlySubEnabled && pricePerYear! < 1) {
      out.yearly = "El precio anual debe ser positivo.";
    }
    return out;
  }, [priceUsd, priceCompareUsd, installmentPriceUsd, installmentCount, pricePerMonth, pricePerYear, planEnabled, monthlySubEnabled, yearlySubEnabled, currency]);

  // Computed values shown to the user.
  const planTotal = planEnabled ? installmentPriceUsd! * installmentCount! : 0;
  const planMarkupPct = planEnabled && priceUsd > 0 ? Math.round(((planTotal - priceUsd) / priceUsd) * 100) : 0;
  const compareDiscountPct =
    priceCompareUsd != null && priceCompareUsd > priceUsd && priceUsd > 0
      ? Math.round(((priceCompareUsd - priceUsd) / priceCompareUsd) * 100)
      : 0;

  function applySuggestions() {
    if (priceUsd <= 0) return;
    const s = suggestPricing(priceUsd);
    onChange({
      priceCompareUsd: priceCompareUsd ?? s.priceCompare,
      installmentCount: installmentCount ?? s.installmentCount,
      installmentPriceUsd: installmentPriceUsd ?? s.installmentPrice,
      pricePerMonth: pricePerMonth ?? s.pricePerMonth,
      pricePerYear: pricePerYear ?? s.pricePerYear,
    });
  }

  // Free course toggle — cuando true, fuerza priceUsd=0 y limpia el resto.
  const isFree = priceUsd === 0;
  function toggleFree(on: boolean) {
    if (on) {
      // Limpia todo el pricing — el curso se vuelve lead magnet gratis
      onChange({
        priceUsd: 0,
        priceCompareUsd: null,
        installmentPriceUsd: null,
        installmentCount: null,
        pricePerMonth: null,
        pricePerYear: null,
      });
    } else {
      // Vuelve a precio mínimo sugerido (97 USD) para que tenga algo razonable
      onChange({ priceUsd: 97 });
    }
  }

  return (
    <section
      style={{
        border: `1px solid ${isFree ? "rgba(53,183,121,0.40)" : "rgba(216,168,63,0.30)"}`,
        borderRadius: 14,
        padding: 18,
        background: isFree
          ? "color-mix(in srgb, #35B779 6%, white)"
          : "color-mix(in srgb, var(--gold) 4%, white)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div className="between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: isFree ? "var(--green-strong)" : "var(--gold-deep)",
              fontWeight: 800,
              letterSpacing: "0.1em",
            }}
          >
            {isFree ? "🎁 LEAD MAGNET (GRATIS)" : "ESTRATEGIA DE PRECIO"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {isFree
              ? "El alumno se inscribe sin pagar. Útil para atraer prospectos calientes y venderles después consultoría o productos premium."
              : "Define moneda, precio único y los modos de venta que quieres ofrecer."}
          </div>
        </div>
        {!isFree && priceUsd > 0 && (
          <button
            type="button"
            onClick={applySuggestions}
            className="mono"
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px dashed var(--gold-deep)",
              background: "transparent",
              color: "var(--gold-deep)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            ✨ Sugerir desglose
          </button>
        )}
      </div>

      {/* Toggle "curso gratuito" */}
      <label
        className="row"
        style={{
          gap: 10,
          alignItems: "flex-start",
          padding: 12,
          background: "white",
          borderRadius: 10,
          border: `1px solid ${isFree ? "rgba(53,183,121,0.35)" : "var(--line)"}`,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isFree}
          onChange={(e) => toggleFree(e.target.checked)}
          style={{ marginTop: 2, accentColor: "#35B779" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
            Curso gratuito (lead magnet)
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>
            El alumno se inscribe con un click sin pasar por checkout. Sigue contando como{" "}
            <strong>prospecto</strong> hasta que compre algo de paga. Bueno para captar leads.
          </div>
        </div>
      </label>

      {isFree && (
        <div
          style={{
            padding: "14px 16px",
            background: "color-mix(in srgb, #35B779 12%, white)",
            border: "1px solid rgba(53,183,121,0.30)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              background: "linear-gradient(135deg, #2da064 0%, #35B779 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            GRATIS
          </span>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
            La página de venta mostrará un botón <strong>"Inscribirme gratis →"</strong>. Si quieres
            cobrar este curso después, desmarca la casilla de arriba.
          </div>
        </div>
      )}

      {/* Todo el bloque siguiente sólo aplica a cursos de paga */}
      {!isFree && (
      <>
      {/* Moneda + Precio único + Comparativo */}
      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 180 }}>
          <Field label="Moneda" required>
            <select
              value={currency}
              onChange={(e) => onChange({ currency: e.target.value as Currency })}
              style={input()}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_META[c].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Field label={`Precio único (${currency})`} required>
            <AmountInput
              value={priceUsd}
              currency={currency}
              onChange={(n) => onChange({ priceUsd: n })}
              placeholder="0"
            />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
              Lo que cobras por el curso de un solo pago.
            </div>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Field label={`Precio tachado (${currency})`}>
            <AmountInput
              value={priceCompareUsd ?? 0}
              currency={currency}
              onChange={(n) => onChange({ priceCompareUsd: n > 0 ? n : null })}
              placeholder="opcional"
              error={!!errors.compare}
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: errors.compare ? "#b32f1a" : "var(--muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {errors.compare
                ? errors.compare
                : compareDiscountPct > 0
                  ? `–${compareDiscountPct}% de ahorro vs precio tachado.`
                  : "Opcional. Se muestra tachado para anclar valor."}
            </div>
          </Field>
        </div>
      </div>

      {/* Plan de pagos */}
      <PaymentMode
        title="Plan de pagos (mensualidades)"
        desc="Divide el precio en cuotas mensuales sin intereses."
        enabled={planEnabled}
        onToggle={(on) => {
          if (on && priceUsd > 0) {
            const s = suggestPricing(priceUsd);
            onChange({ installmentCount: s.installmentCount, installmentPriceUsd: s.installmentPrice });
          } else if (!on) {
            onChange({ installmentCount: null, installmentPriceUsd: null });
          }
        }}
      >
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 140 }}>
            <Field label="N° mensualidades">
              <input
                type="number"
                min={2}
                max={36}
                value={installmentCount ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null;
                  onChange({ installmentCount: v });
                }}
                style={{ ...input(), borderColor: errors.planCount ? "#b32f1a" : undefined }}
                placeholder="6"
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Field label={`Precio por mes (${currency})`}>
              <AmountInput
                value={installmentPriceUsd ?? 0}
                currency={currency}
                onChange={(n) => onChange({ installmentPriceUsd: n > 0 ? n : null })}
                placeholder="0"
                error={!!errors.plan}
              />
            </Field>
          </div>
          <div style={{ minWidth: 180, display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: "white",
                border: "1px solid var(--line)",
              }}
            >
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>
                TOTAL PLAN
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>
                {formatMoney(planTotal, currency)}
              </div>
              {planEnabled && planMarkupPct !== 0 && (
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: planMarkupPct < 0 ? "#b32f1a" : "var(--gold-deep)",
                    marginTop: 2,
                  }}
                >
                  {planMarkupPct > 0 ? `+${planMarkupPct}%` : `${planMarkupPct}%`} vs único
                </div>
              )}
            </div>
          </div>
        </div>
        {errors.plan && (
          <div className="mono" style={{ fontSize: 11, color: "#b32f1a", marginTop: 6 }}>
            {errors.plan}
          </div>
        )}
      </PaymentMode>

      {/* Suscripción mensual */}
      <PaymentMode
        title="Suscripción mensual"
        desc="Cobro recurrente cada mes. El alumno puede cancelar cuando quiera."
        enabled={monthlySubEnabled}
        onToggle={(on) => {
          if (on && priceUsd > 0) {
            onChange({ pricePerMonth: suggestPricing(priceUsd).pricePerMonth });
          } else if (!on) {
            onChange({ pricePerMonth: null });
          }
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label={`Precio mensual (${currency})`}>
              <AmountInput
                value={pricePerMonth ?? 0}
                currency={currency}
                onChange={(n) => onChange({ pricePerMonth: n > 0 ? n : null })}
                placeholder="0"
              />
            </Field>
          </div>
          {monthlySubEnabled && pricePerMonth! > 0 && (
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--muted)", padding: "10px 0" }}
            >
              ≈ {formatMoney(pricePerMonth! * 12, currency)} / año
            </div>
          )}
        </div>
      </PaymentMode>

      {/* Suscripción anual */}
      <PaymentMode
        title="Suscripción anual"
        desc="Cobro anual con descuento vs mensual. Ideal anclaje."
        enabled={yearlySubEnabled}
        onToggle={(on) => {
          if (on && priceUsd > 0) {
            onChange({ pricePerYear: suggestPricing(priceUsd).pricePerYear });
          } else if (!on) {
            onChange({ pricePerYear: null });
          }
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label={`Precio anual (${currency})`}>
              <AmountInput
                value={pricePerYear ?? 0}
                currency={currency}
                onChange={(n) => onChange({ pricePerYear: n > 0 ? n : null })}
                placeholder="0"
              />
            </Field>
          </div>
          {yearlySubEnabled && pricePerYear! > 0 && pricePerMonth && pricePerMonth > 0 && (
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--gold-deep)", padding: "10px 0" }}
            >
              Ahorra {Math.max(0, Math.round((1 - pricePerYear! / (pricePerMonth * 12)) * 100))}% vs mensual
            </div>
          )}
        </div>
      </PaymentMode>

      {/* Preview que verá el alumno */}
      {priceUsd > 0 && (
        <div
          style={{
            background: "var(--navy)",
            color: "white",
            borderRadius: 12,
            padding: 16,
            marginTop: 4,
          }}
        >
          <div className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.08em", fontWeight: 700 }}>
            VISTA PREVIA (LO QUE VERÁ EL ALUMNO)
          </div>
          <div className="row" style={{ gap: 14, marginTop: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            {priceCompareUsd != null && priceCompareUsd > priceUsd && (
              <span
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "line-through",
                }}
              >
                {formatMoney(priceCompareUsd, currency)}
              </span>
            )}
            <span className="serif" style={{ fontSize: 30, fontWeight: 700, color: "white" }}>
              {formatMoney(priceUsd, currency)}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
              pago único
            </span>
            {compareDiscountPct > 0 && (
              <span
                className="mono"
                style={{
                  background: "var(--gold)",
                  color: "var(--navy)",
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                –{compareDiscountPct}%
              </span>
            )}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
            {planEnabled && installmentPriceUsd! > 0 && installmentCount! > 0 && (
              <li>
                • o {installmentCount} pagos mensuales de{" "}
                <strong>{formatMoney(installmentPriceUsd!, currency)}</strong>
              </li>
            )}
            {monthlySubEnabled && pricePerMonth! > 0 && (
              <li>
                • o suscripción de <strong>{formatMoney(pricePerMonth!, currency)}/mes</strong> (cancela cuando quieras)
              </li>
            )}
            {yearlySubEnabled && pricePerYear! > 0 && (
              <li>
                • o plan anual de <strong>{formatMoney(pricePerYear!, currency)}/año</strong>
              </li>
            )}
          </ul>
        </div>
      )}
      </>
      )}
    </section>
  );
}

/** Wrapper visual de un modo de pago — toggle + descripción + contenido condicional. */
function PaymentMode({
  title,
  desc,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        border: enabled ? "1.5px solid rgba(216,168,63,0.40)" : "1px solid var(--line)",
        borderRadius: 12,
        padding: 14,
        opacity: enabled ? 1 : 0.85,
      }}
    >
      <label className="row" style={{ alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
        </div>
      </label>
      {enabled && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

/** Amount input — formatted with currency-aware grouping on blur. */
function AmountInput({
  value,
  currency,
  onChange,
  placeholder,
  error,
}: {
  value: number;
  currency: Currency;
  onChange: (n: number) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? value > 0
      ? String(value)
      : ""
    : value > 0
      ? formatGrouping(value, currency)
      : "";
  return (
    <div style={{ position: "relative" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted)",
          fontSize: 13,
          pointerEvents: "none",
          fontWeight: 600,
        }}
      >
        {CURRENCY_META[currency].symbol}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseAmount(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          ...input(),
          paddingLeft: 26,
          borderColor: error ? "#b32f1a" : undefined,
        }}
      />
    </div>
  );
}

