"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";

type Row = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  readMinutes: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export function BlogManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(method: "POST" | "PUT", url: string, data: Partial<Row>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error");
      }
      setEditing(null);
      setCreating(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "¿Eliminar post?",
      description: "Esto es permanente.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blog-posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el post");
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
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => setCreating(true)}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          + Nuevo post
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
        <span style={{ flex: 1 }}>Título</span>
        <span style={{ width: 120 }}>Categoría</span>
        <span style={{ width: 100 }}>Status</span>
        <span style={{ width: 80, textAlign: "right" }}>Lectura</span>
        <span style={{ width: 110, textAlign: "right" }}>Creado</span>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                /blog/{p.slug}
              </div>
            </div>
            <span className="mono" style={{ width: 120, fontSize: 11, color: "var(--ink-2)" }}>
              {p.category || "—"}
            </span>
            <span style={{ width: 100 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: p.publishedAt ? "var(--green-soft)" : "var(--bg-3)",
                  color: p.publishedAt ? "var(--green-strong)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {p.publishedAt ? "PUBLISHED" : "DRAFT"}
              </span>
            </span>
            <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12 }}>
              {p.readMinutes} min
            </span>
            <span className="mono" style={{ width: 110, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
              {formatRelative(new Date(p.createdAt))}
            </span>
            <span className="row" style={{ width: 160, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => setEditing(p)}
                className="mono"
                style={btnStyle("ghost")}
              >
                Editar
              </button>
              <button
                onClick={() => remove(p.id)}
                disabled={busy}
                className="mono"
                style={btnStyle("danger")}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin posts aún. Escribe el primero.
          </div>
        )}
      </div>

      {(creating || editing) && (
        <PostDialog
          post={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            setErr(null);
          }}
          onSave={(data) =>
            editing
              ? save("PUT", `/api/admin/blog-posts/${editing.id}`, data)
              : save("POST", `/api/admin/blog-posts`, data)
          }
          busy={busy}
          err={err}
        />
      )}
    </>
  );
}

function PostDialog({
  post,
  onClose,
  onSave,
  busy,
  err,
}: {
  post: Row | null;
  onClose: () => void;
  onSave: (data: Partial<Row> & { published?: boolean }) => void;
  busy: boolean;
  err: string | null;
}) {
  const [form, setForm] = useState({
    title: post?.title || "",
    slug: post?.slug || "",
    excerpt: post?.excerpt || "",
    body: post?.body || "",
    category: post?.category || "",
    readMinutes: post?.readMinutes ?? 8,
    isFeatured: post?.isFeatured ?? false,
    published: !!post?.publishedAt,
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
          maxWidth: 700,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 18 }}>
          {post ? "Editar post" : "Nuevo post"}
        </h2>

        <div className="col" style={{ gap: 14 }}>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle()}
            />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={inputStyle()}
            />
          </Field>
          <Field label="Categoría">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={inputStyle()}
              placeholder="IA, Negocios…"
            />
          </Field>
          <Field label="Excerpt">
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              style={{ ...inputStyle(), minHeight: 60 }}
            />
          </Field>
          <Field label="Body (Markdown)">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              style={{ ...inputStyle(), minHeight: 180, fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
          </Field>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 140 }}>
              <Field label="Lectura (min)">
                <input
                  type="number"
                  value={form.readMinutes}
                  onChange={(e) => setForm({ ...form, readMinutes: parseInt(e.target.value || "0", 10) })}
                  style={inputStyle()}
                />
              </Field>
            </div>
            <div className="row" style={{ gap: 18, alignSelf: "flex-end", paddingBottom: 4 }}>
              <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                Destacado
              </label>
              <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                Publicado
              </label>
            </div>
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
            disabled={busy || !form.title || !form.slug || !form.body}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : post ? "Guardar" : "Crear"}
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
