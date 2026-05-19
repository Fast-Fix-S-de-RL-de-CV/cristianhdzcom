"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  type: string;
  priceUsd: number;
  durationLabel: string;
  isActive: boolean;
  isFeatured: boolean;
  modulesCount: number;
  enrollmentsCount: number;
};

const TYPES = ["taller", "curso", "certificacion", "consultoria", "agencia"];

export function CursosManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createProgram(data: Partial<Row>) {
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

  async function updateProgram(id: string, data: Partial<Row>) {
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
        <span style={{ width: 160, textAlign: "right" }}>Acciones</span>
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
            <span className="row" style={{ width: 160, justifyContent: "flex-end", gap: 6 }}>
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
  onSave: (data: Partial<Row>) => void;
  busy: boolean;
  err: string | null;
}) {
  const [form, setForm] = useState({
    title: program?.title || "",
    slug: program?.slug || "",
    subtitle: program?.subtitle || "",
    type: program?.type || "curso",
    priceUsd: program?.priceUsd ?? 0,
    durationLabel: program?.durationLabel || "",
    isActive: program?.isActive ?? true,
    isFeatured: program?.isFeatured ?? false,
  });

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
          maxWidth: 560,
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
          <Field label="Subtítulo">
            <textarea
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              style={{ ...input(), minHeight: 60 }}
            />
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
            <div style={{ width: 140 }}>
              <Field label="Precio (USD)">
                <input
                  type="number"
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: parseInt(e.target.value || "0", 10) })}
                  style={input()}
                />
              </Field>
            </div>
          </div>
          <Field label="Duración">
            <input
              value={form.durationLabel}
              onChange={(e) => setForm({ ...form, durationLabel: e.target.value })}
              placeholder="6 semanas"
              style={input()}
            />
          </Field>
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
              Destacado
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
            onClick={() => onSave(form)}
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
