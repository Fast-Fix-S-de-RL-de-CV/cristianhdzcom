"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

type Post = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  authorName: string;
};

type Comment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  authorName: string;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string;
  color: string;
  sortOrder: number;
};

type Tab = "posts" | "comments" | "categories";

export function ComunidadManager({
  posts,
  comments,
  categories,
}: {
  posts: Post[];
  comments: Comment[];
  categories: Category[];
}) {
  const [tab, setTab] = useState<Tab>("posts");

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "posts", label: "Posts", count: posts.length },
    { value: "comments", label: "Comentarios", count: comments.length },
    { value: "categories", label: "Categorías", count: categories.length },
  ];

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
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

      {tab === "posts" && <PostsTab posts={posts} />}
      {tab === "comments" && <CommentsTab comments={comments} />}
      {tab === "categories" && <CategoriesTab categories={categories} />}
    </>
  );
}

/* ──────────────────── POSTS ──────────────────── */

function PostsTab({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const bulk = useBulkSelection<string>();
  const visibleIds = posts.map((p) => p.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/posts/bulk-delete",
    entityLabel: { singular: "post", plural: "posts" },
    description:
      "Se borran también los likes y todos los comentarios asociados. Esta acción no se puede deshacer.",
    onSuccess: bulk.clear,
  });

  async function togglePin(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}/pin`, { method: "PUT" });
      if (!res.ok) throw new Error("Error");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo cambiar el pin");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "¿Eliminar post?",
      description: "Se borran también los likes y comentarios asociados.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el post");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="row" style={{ ...headerRowStyle(), gap: 12 }}>
        <span style={{ width: 24, display: "flex", alignItems: "center" }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todos los posts"
          />
        </span>
        <span style={{ width: 80 }}>ID</span>
        <span style={{ flex: 1 }}>Título / Autor</span>
        <span style={{ width: 60, textAlign: "right" }}>Likes</span>
        <span style={{ width: 70, textAlign: "right" }}>Coment.</span>
        <span style={{ width: 60, textAlign: "right" }}>Views</span>
        <span style={{ width: 80 }}>Pinned</span>
        <span style={{ width: 100 }}>Fecha</span>
        <span style={{ width: 140, textAlign: "right" }}>Acciones</span>
      </div>
      {posts.map((p) => {
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
            <span className="mono" style={{ width: 80, fontSize: 11, color: "var(--muted)" }}>
              {p.id.slice(0, 8)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {p.authorName}
              </div>
            </div>
            <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12 }}>
              {p.likesCount}
            </span>
            <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
              {p.commentsCount}
            </span>
            <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12 }}>
              {p.viewsCount}
            </span>
            <span style={{ width: 80 }}>
              <button
                onClick={() => togglePin(p.id)}
                disabled={busy === p.id}
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: p.pinned ? "var(--warm-soft)" : "var(--bg-2)",
                  color: p.pinned ? "var(--warm)" : "var(--muted)",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid var(--line)",
                }}
              >
                {p.pinned ? "📌 PIN" : "Pin"}
              </button>
            </span>
            <span className="mono" style={{ width: 100, fontSize: 11, color: "var(--muted)" }}>
              {formatRelative(new Date(p.createdAt))}
            </span>
            <span className="row" style={{ width: 140, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => remove(p.id)}
                disabled={busy === p.id}
                className="mono"
                style={btnStyle("danger")}
              >
                Borrar
              </button>
            </span>
          </div>
        );
      })}
      {posts.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Sin posts.
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "post", plural: "posts" }}
        subtitle="LIKES Y COMENTARIOS TAMBIÉN SE BORRAN"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}

/* ──────────────────── COMMENTS ──────────────────── */

function CommentsTab({ comments }: { comments: Comment[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const bulk = useBulkSelection<string>();
  const visibleIds = comments.map((c) => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/comments/bulk-delete",
    entityLabel: { singular: "comentario", plural: "comentarios" },
    onSuccess: bulk.clear,
  });

  async function remove(id: string) {
    const ok = await confirm({
      title: "¿Eliminar comentario?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el comentario");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="row" style={{ ...headerRowStyle(), gap: 12 }}>
        <span style={{ width: 24, display: "flex", alignItems: "center" }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todos los comentarios"
          />
        </span>
        <span style={{ width: 140 }}>Autor</span>
        <span style={{ width: 100 }}>Post ID</span>
        <span style={{ flex: 1 }}>Fragmento</span>
        <span style={{ width: 100 }}>Fecha</span>
        <span style={{ width: 100, textAlign: "right" }}>Acciones</span>
      </div>
      {comments.map((c) => {
        const isChecked = bulk.isSelected(c.id);
        return (
          <div
            key={c.id}
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
                onChange={(checked) => bulk.toggleOne(c.id, checked)}
                ariaLabel={`Seleccionar comentario de ${c.authorName}`}
              />
            </span>
            <span style={{ width: 140, fontSize: 13, fontWeight: 600 }}>{c.authorName}</span>
            <span className="mono" style={{ width: 100, fontSize: 11, color: "var(--muted)" }}>
              {c.postId.slice(0, 8)}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "var(--ink-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {c.body.slice(0, 120)}
              {c.body.length > 120 ? "…" : ""}
            </span>
            <span className="mono" style={{ width: 100, fontSize: 11, color: "var(--muted)" }}>
              {formatRelative(new Date(c.createdAt))}
            </span>
            <span className="row" style={{ width: 100, justifyContent: "flex-end" }}>
              <button
                onClick={() => remove(c.id)}
                disabled={busy === c.id}
                className="mono"
                style={btnStyle("danger")}
              >
                Borrar
              </button>
            </span>
          </div>
        );
      })}
      {comments.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Sin comentarios.
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "comentario", plural: "comentarios" }}
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}

/* ──────────────────── CATEGORIES ──────────────────── */

function CategoriesTab({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bulk = useBulkSelection<number>();
  const visibleIds = categories.map((c) => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<number>({
    url: "/api/admin/categories/bulk-delete",
    entityLabel: { singular: "categoría", plural: "categorías" },
    description: "Los posts asignados a estas categorías quedarán sin categoría (no se borran).",
    onSuccess: bulk.clear,
  });

  async function save(method: "POST" | "PUT", url: string, data: Partial<Category>) {
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

  async function remove(id: number) {
    const ok = await confirm({
      title: "¿Eliminar categoría?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar la categoría");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ padding: "12px 24px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}>
          + Nueva categoría
        </button>
      </div>
      <div className="row" style={{ ...headerRowStyle(), gap: 12 }}>
        <span style={{ width: 24, display: "flex", alignItems: "center" }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todas las categorías"
          />
        </span>
        <span style={{ width: 60 }}>ID</span>
        <span style={{ width: 60 }}>Emoji</span>
        <span style={{ flex: 1 }}>Nombre</span>
        <span style={{ flex: 1 }}>Slug</span>
        <span style={{ width: 100 }}>Color</span>
        <span style={{ width: 70, textAlign: "right" }}>Orden</span>
        <span style={{ width: 160, textAlign: "right" }}>Acciones</span>
      </div>
      {categories.map((c) => {
        const isChecked = bulk.isSelected(c.id);
        return (
          <div
            key={c.id}
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
                onChange={(checked) => bulk.toggleOne(c.id, checked)}
                ariaLabel={`Seleccionar ${c.name}`}
              />
            </span>
            <span className="mono" style={{ width: 60, fontSize: 11, color: "var(--muted)" }}>
              {c.id}
            </span>
            <span style={{ width: 60, fontSize: 18 }}>{c.emoji || "—"}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
            <span className="mono" style={{ flex: 1, fontSize: 11, color: "var(--muted)" }}>
              {c.slug}
            </span>
            <span style={{ width: 100 }}>
              {c.color ? (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: c.color,
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  {c.color}
                </span>
              ) : (
                <span style={{ color: "var(--muted)" }}>—</span>
              )}
            </span>
            <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
              {c.sortOrder}
            </span>
            <span className="row" style={{ width: 160, justifyContent: "flex-end", gap: 6 }}>
              <button onClick={() => setEditing(c)} className="mono" style={btnStyle("ghost")}>
                Editar
              </button>
              <button onClick={() => remove(c.id)} disabled={busy} className="mono" style={btnStyle("danger")}>
                Borrar
              </button>
            </span>
          </div>
        );
      })}
      {categories.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Sin categorías.
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "categoría", plural: "categorías" }}
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />

      {(creating || editing) && (
        <CategoryDialog
          category={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            setErr(null);
          }}
          onSave={(data) =>
            editing
              ? save("PUT", `/api/admin/categories/${editing.id}`, data)
              : save("POST", `/api/admin/categories`, data)
          }
          busy={busy}
          err={err}
        />
      )}
    </>
  );
}

function CategoryDialog({
  category,
  onClose,
  onSave,
  busy,
  err,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: (data: Partial<Category>) => void;
  busy: boolean;
  err: string | null;
}) {
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    emoji: category?.emoji || "",
    color: category?.color || "",
    sortOrder: category?.sortOrder ?? 0,
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
          maxWidth: 480,
          width: "100%",
        }}
      >
        <h2 className="serif" style={{ fontSize: 22, marginBottom: 18 }}>
          {category ? "Editar categoría" : "Nueva categoría"}
        </h2>
        <div className="col" style={{ gap: 12 }}>
          <Field label="Nombre">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle()} />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={inputStyle()} />
          </Field>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 100 }}>
              <Field label="Emoji">
                <input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  style={inputStyle()}
                  maxLength={4}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Color (CSS)">
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={inputStyle()}
                  placeholder="var(--accent)"
                />
              </Field>
            </div>
            <div style={{ width: 100 }}>
              <Field label="Orden">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value || "0", 10) })}
                  style={inputStyle()}
                />
              </Field>
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
            disabled={busy || !form.name || !form.slug}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : category ? "Guardar" : "Crear"}
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

function headerRowStyle(): React.CSSProperties {
  return {
    padding: "14px 24px",
    background: "var(--bg-2)",
    borderBottom: "1px solid var(--line)",
    fontSize: 11,
    color: "var(--muted)",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}
