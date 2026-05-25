"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

export type BookRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverUrl: string | null;
  pages: number | null;
  priceDigitalUsd: number | null;
  pricePrintUsd: number | null;
  priceCompareUsd: number | null;
  priceBundleUsd: number | null;
  hasDigital: boolean;
  hasPhysical: boolean;
  stockPhysical: number | null;
  digitalFileUrl: string | null;
  isBundle: boolean;
  bundleIncludes: { books?: string[]; programs?: string[] };
  ratingAvg: number | null;
  ratingCount: number;
  bullets: string[];
  accent: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

type Filter = "all" | "books" | "bundles" | "inactive";

export function LibrosManager({ rows }: { rows: BookRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [creating, setCreating] = useState<"book" | "bundle" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const bulk = useBulkSelection<string>();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "books" && r.isBundle) return false;
      if (filter === "bundles" && !r.isBundle) return false;
      if (filter === "inactive" && r.isActive) return false;
      return true;
    });
  }, [rows, filter]);

  const visibleIds = filtered.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/books/bulk-delete",
    entityLabel: { singular: "producto", plural: "productos" },
    description:
      "Se eliminan permanentemente del catálogo. Las órdenes ya pagadas conservan el snapshot " +
      "del producto comprado (título y precio) — no quedan huérfanas. Esta acción no se puede deshacer.",
    onSuccess: bulk.clear,
  });

  async function removeOne(row: BookRow) {
    const ok = await confirm({
      title: `¿Eliminar "${row.title}"?`,
      description: row.isBundle ? "Es un bundle activo." : "Es un libro activo.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/books/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar.");
      return;
    }
    toast.success("Eliminado.");
    router.refresh();
  }

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: rows.length },
    { value: "books", label: "Libros", count: rows.filter((r) => !r.isBundle).length },
    { value: "bundles", label: "Bundles", count: rows.filter((r) => r.isBundle).length },
    { value: "inactive", label: "Inactivos", count: rows.filter((r) => !r.isActive).length },
  ];

  return (
    <>
      {/* Toolbar: filtros + crear */}
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
        <div className="row" style={{ gap: 8 }}>
          <button
            onClick={() => setCreating("bundle")}
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: 11 }}
          >
            + Bundle
          </button>
          <button
            onClick={() => setCreating("book")}
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontSize: 11 }}
          >
            + Nuevo libro
          </button>
        </div>
      </div>

      {/* Header */}
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
        <span style={{ width: 60 }}>Tipo</span>
        <span style={{ flex: 1 }}>Producto</span>
        <span style={{ width: 140 }}>Precios USD</span>
        <span style={{ width: 80 }}>Stock</span>
        <span style={{ width: 80 }}>Status</span>
        <span style={{ width: 160, textAlign: "right" }}>Acciones</span>
      </div>

      {filtered.map((r) => {
        const isChecked = bulk.isSelected(r.id);
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
                ariaLabel={`Seleccionar ${r.title}`}
              />
            </span>
            <span style={{ width: 60 }}>
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: r.isBundle ? "color-mix(in srgb, var(--accent) 18%, white)" : "var(--bg-3)",
                  color: r.isBundle ? "var(--accent)" : "var(--muted)",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                {r.isBundle ? "BUNDLE" : "LIBRO"}
              </span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {r.title} {r.badge && <span className="mono" style={{ fontSize: 9, color: "var(--accent)", marginLeft: 6 }}>· {r.badge}</span>}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                /libros/{r.slug}
              </div>
            </div>
            <span className="mono" style={{ width: 140, fontSize: 11, color: "var(--ink-2)" }}>
              {r.isBundle ? (
                <>${r.priceBundleUsd ?? "—"} bundle</>
              ) : (
                <>
                  {r.hasDigital && `$${r.priceDigitalUsd ?? "—"} dig`}
                  {r.hasDigital && r.hasPhysical && " · "}
                  {r.hasPhysical && `$${r.pricePrintUsd ?? "—"} fís`}
                </>
              )}
            </span>
            <span className="mono" style={{ width: 80, fontSize: 11 }}>
              {r.stockPhysical == null ? (
                <span style={{ color: "var(--muted)" }}>∞</span>
              ) : (
                <span style={{ color: r.stockPhysical > 10 ? "var(--ink-2)" : "var(--red)", fontWeight: 600 }}>
                  {r.stockPhysical}
                </span>
              )}
            </span>
            <span style={{ width: 80 }}>
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
            <span className="row" style={{ width: 160, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => setEditing(r)}
                className="mono"
                style={btnStyle("ghost")}
              >
                Editar
              </button>
              <button
                onClick={() => removeOne(r)}
                className="mono"
                style={btnStyle("danger")}
              >
                Borrar
              </button>
            </span>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Sin productos.
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "producto", plural: "productos" }}
        subtitle="LAS ÓRDENES YA PAGADAS CONSERVAN EL SNAPSHOT"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />

      {(editing || creating) && (
        <BookDialog
          book={editing}
          mode={creating ?? (editing?.isBundle ? "bundle" : "book")}
          allBooks={rows}
          onClose={() => {
            setEditing(null);
            setCreating(null);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ─────────── Dialog: crear/editar libro o bundle ─────────── */

function BookDialog({
  book,
  mode,
  allBooks,
  onClose,
  onSaved,
}: {
  book: BookRow | null;
  mode: "book" | "bundle";
  allBooks: BookRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isBundle = book?.isBundle ?? mode === "bundle";

  const [form, setForm] = useState({
    slug: book?.slug || "",
    title: book?.title || "",
    subtitle: book?.subtitle || "",
    description: book?.description || "",
    coverUrl: book?.coverUrl || "",
    pages: book?.pages ?? "",
    priceDigitalUsd: book?.priceDigitalUsd ?? "",
    pricePrintUsd: book?.pricePrintUsd ?? "",
    priceCompareUsd: book?.priceCompareUsd ?? "",
    priceBundleUsd: book?.priceBundleUsd ?? "",
    hasDigital: book?.hasDigital ?? true,
    hasPhysical: book?.hasPhysical ?? true,
    stockPhysical: book?.stockPhysical ?? "",
    digitalFileUrl: book?.digitalFileUrl || "",
    bundleBookSlugs: book?.bundleIncludes?.books ?? [],
    bundleProgramSlugs: book?.bundleIncludes?.programs ?? [],
    bullets: (book?.bullets ?? []).join("\n"),
    accent: book?.accent || "accent",
    badge: book?.badge || "",
    sortOrder: book?.sortOrder ?? 0,
    isActive: book?.isActive ?? true,
  });

  async function save() {
    setBusy(true);
    setErr(null);
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      description: form.description || null,
      coverUrl: form.coverUrl || null,
      pages: form.pages === "" ? null : Number(form.pages),
      priceDigitalUsd: !isBundle && form.priceDigitalUsd !== "" ? Number(form.priceDigitalUsd) : null,
      pricePrintUsd: !isBundle && form.pricePrintUsd !== "" ? Number(form.pricePrintUsd) : null,
      priceCompareUsd: form.priceCompareUsd !== "" ? Number(form.priceCompareUsd) : null,
      priceBundleUsd: isBundle && form.priceBundleUsd !== "" ? Number(form.priceBundleUsd) : null,
      hasDigital: form.hasDigital,
      hasPhysical: form.hasPhysical,
      stockPhysical: form.stockPhysical === "" ? null : Number(form.stockPhysical),
      digitalFileUrl: form.digitalFileUrl || null,
      isBundle,
      bundleIncludes: isBundle
        ? { books: form.bundleBookSlugs, programs: form.bundleProgramSlugs }
        : {},
      bullets: form.bullets
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      accent: form.accent as "warm" | "accent" | "ink",
      badge: form.badge || null,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };

    const url = book ? `/api/admin/books/${book.id}` : "/api/admin/books";
    const method = book ? "PUT" : "POST";

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
            ? "Ese slug ya existe en otro producto."
            : json.error === "invalid"
              ? humanizeIssues(json.details)
              : "No se pudo guardar.";
        setErr(msg);
        return;
      }
      toast.success(book ? "Cambios guardados." : `${isBundle ? "Bundle" : "Libro"} creado.`);
      onSaved();
    } catch {
      setErr("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  const otherBooks = allBooks.filter((b) => !b.isBundle && b.id !== book?.id);

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
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          maxWidth: 720,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 4 }}>
          {book ? "Editar" : "Nuevo"} {isBundle ? "bundle" : "libro"}
        </h2>
        <p className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 24 }}>
          {isBundle
            ? "UN BUNDLE COMBINA VARIOS LIBROS Y/O PROGRAMAS CON UN PRECIO ÚNICO"
            : "LIBRO INDIVIDUAL — PUEDE TENER FORMATO DIGITAL Y/O FÍSICO"}
        </p>

        <div className="col" style={{ gap: 14 }}>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, title: v, slug: form.slug || slugify(v) });
              }}
              style={inputStyle()}
            />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={inputStyle()} />
          </Field>
          <Field label="Subtítulo">
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} style={inputStyle()} />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle(), minHeight: 80 }}
            />
          </Field>
          <Field label="Bullets (uno por línea)">
            <textarea
              value={form.bullets}
              onChange={(e) => setForm({ ...form, bullets: e.target.value })}
              style={{ ...inputStyle(), minHeight: 80, fontFamily: "var(--font-mono)", fontSize: 12 }}
              placeholder="Audio narrado por Cristian&#10;Plantillas + ejercicios&#10;Casos reales"
            />
          </Field>
          <Field label="Imagen de portada (URL o /uploads/…)">
            <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} style={inputStyle()} />
          </Field>

          {/* Pricing */}
          {isBundle ? (
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Precio bundle USD">
                  <input
                    type="number"
                    value={form.priceBundleUsd}
                    onChange={(e) => setForm({ ...form, priceBundleUsd: e.target.value })}
                    style={inputStyle()}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Precio comparativo (tachado)">
                  <input
                    type="number"
                    value={form.priceCompareUsd}
                    onChange={(e) => setForm({ ...form, priceCompareUsd: e.target.value })}
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Precio digital USD">
                    <input
                      type="number"
                      value={form.priceDigitalUsd}
                      onChange={(e) => setForm({ ...form, priceDigitalUsd: e.target.value })}
                      style={inputStyle()}
                      disabled={!form.hasDigital}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Precio físico USD">
                    <input
                      type="number"
                      value={form.pricePrintUsd}
                      onChange={(e) => setForm({ ...form, pricePrintUsd: e.target.value })}
                      style={inputStyle()}
                      disabled={!form.hasPhysical}
                    />
                  </Field>
                </div>
                <div style={{ width: 140 }}>
                  <Field label="Precio compare">
                    <input
                      type="number"
                      value={form.priceCompareUsd}
                      onChange={(e) => setForm({ ...form, priceCompareUsd: e.target.value })}
                      style={inputStyle()}
                    />
                  </Field>
                </div>
              </div>
              <div className="row" style={{ gap: 24 }}>
                <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.hasDigital}
                    onChange={(e) => setForm({ ...form, hasDigital: e.target.checked })}
                  />
                  Vender formato digital
                </label>
                <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.hasPhysical}
                    onChange={(e) => setForm({ ...form, hasPhysical: e.target.checked })}
                  />
                  Vender formato físico
                </label>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Páginas">
                    <input
                      type="number"
                      value={form.pages}
                      onChange={(e) => setForm({ ...form, pages: e.target.value })}
                      style={inputStyle()}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Stock físico (vacío = ilimitado)">
                    <input
                      type="number"
                      value={form.stockPhysical}
                      onChange={(e) => setForm({ ...form, stockPhysical: e.target.value })}
                      style={inputStyle()}
                      disabled={!form.hasPhysical}
                    />
                  </Field>
                </div>
              </div>
              <Field label="URL del archivo digital (PDF/EPUB entregado tras la compra)">
                <input
                  value={form.digitalFileUrl}
                  onChange={(e) => setForm({ ...form, digitalFileUrl: e.target.value })}
                  style={inputStyle()}
                  disabled={!form.hasDigital}
                  placeholder="/uploads/2026-05/libro.pdf"
                />
              </Field>
            </>
          )}

          {/* Bundle includes */}
          {isBundle && (
            <Field label="Libros incluidos">
              <div className="col" style={{ gap: 6 }}>
                {otherBooks.map((b) => {
                  const checked = form.bundleBookSlugs.includes(b.slug);
                  return (
                    <label key={b.slug} className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setForm({
                            ...form,
                            bundleBookSlugs: checked
                              ? form.bundleBookSlugs.filter((s) => s !== b.slug)
                              : [...form.bundleBookSlugs, b.slug],
                          });
                        }}
                      />
                      {b.title}{" "}
                      <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                        ({b.slug})
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}

          {/* Display */}
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Acento visual">
                <select
                  value={form.accent}
                  onChange={(e) => setForm({ ...form, accent: e.target.value })}
                  style={inputStyle()}
                >
                  <option value="accent">accent (dorado)</option>
                  <option value="warm">warm (cobrizo)</option>
                  <option value="ink">ink (navy)</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Badge (opcional)">
                <input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  style={inputStyle()}
                  placeholder="RECOMENDADO, MÁS ELEGIDO…"
                  maxLength={40}
                />
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
          <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Visible en /libros (público)
          </label>
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
            onClick={save}
            disabled={busy || !form.title || !form.slug}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : book ? "Guardar" : "Crear"}
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

function humanizeIssues(details: unknown): string {
  if (!details || typeof details !== "object") return "Validación falló.";
  const issues = (details as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues;
  if (!issues?.length) return "Validación falló.";
  const first = issues[0];
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}
