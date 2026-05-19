"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  isActive: boolean;
  isFeatured: boolean;
  modulesCount: number;
  enrollmentsCount: number;
};

const TYPES = ["taller", "curso", "certificacion", "consultoria", "agencia"];
const ACCENTS: Accent[] = ["accent", "warm", "green", "navy", "gold"];

export function CursosManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
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
        throw new Error(j.error || "Error al crear");
      }
      setCreating(false);
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
        throw new Error(j.error || "Error al guardar");
      }
      setEditing(null);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProgram(id: string) {
    if (!confirm("¿Eliminar este programa? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/programs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error al borrar");
      }
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
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
    isActive: program?.isActive ?? true,
    isFeatured: program?.isFeatured ?? false,
  });

  function handleSave() {
    const cleaned = {
      ...form,
      subtitle: form.subtitle || null,
      durationLabel: form.durationLabel || null,
      description: form.description || null,
      bullets: form.bullets.filter((b) => b.trim().length > 0),
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
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={input()}
            />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={input()}
              placeholder="curso-ia"
            />
          </Field>
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
            disabled={busy || !form.title || !form.slug}
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
