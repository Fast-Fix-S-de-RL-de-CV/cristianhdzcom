"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initials, formatRelative } from "@/lib/utils";
import { RoleBadge } from "@/components/admin/AdminPageShell";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  avatarUrl: string | null;
  createdAt: string;
};

type Filter = "all" | "member" | "admin" | "superadmin";

export function AlumnosTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.role !== filter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle)
      );
    });
  }, [rows, filter, q]);

  // Rows that the current admin is allowed to delete (excludes superadmins
  // and self). Used for both the "select all" checkbox and bulk delete.
  const selectableIds = useMemo(
    () => filtered.filter((r) => r.role !== "superadmin" && r.id !== currentUserId).map((r) => r.id),
    [filtered, currentUserId],
  );

  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someVisibleSelected = !allVisibleSelected && selectableIds.some((id) => selected.has(id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) selectableIds.forEach((id) => next.add(id));
      else selectableIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;

    const ok = await confirm({
      title: `Eliminar ${ids.length} ${ids.length === 1 ? "alumno" : "alumnos"} permanentemente`,
      description:
        "Se borrará TODA su data personal: sesiones, posts, comentarios, lecciones, notas, mensajes, " +
        "inscripciones y certificados. Las ventas y órdenes asociadas SE PRESERVAN como historial " +
        "(con el nombre y email originales), solo se desvincula el usuario. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar permanentemente",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.ok === false) {
          const reason =
            body?.error === "forbidden"
              ? "No tienes permisos para esta acción."
              : body?.blocked?.length
                ? "Ningún usuario era elegible (superadmins o tu propia cuenta)."
                : "No se pudo completar la eliminación.";
          toast.error(reason);
          return;
        }
        const parts = [
          `${body.deleted} ${body.deleted === 1 ? "alumno eliminado" : "alumnos eliminados"}`,
        ];
        if (body.preservedOrders > 0) {
          parts.push(
            `${body.preservedOrders} ${body.preservedOrders === 1 ? "venta preservada" : "ventas preservadas"} en el historial`,
          );
        }
        if (body.blocked?.length) {
          parts.push(`${body.blocked.length} omitidos (superadmin o tú mismo)`);
        }
        toast.success(parts.join(" · "));
        clearSelection();
        router.refresh();
      } catch (e) {
        toast.error("Error de red al eliminar.");
      }
    });
  }

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: rows.length },
    { value: "member", label: "Members", count: rows.filter((r) => r.role === "member").length },
    { value: "admin", label: "Admins", count: rows.filter((r) => r.role === "admin").length },
    { value: "superadmin", label: "Superadmins", count: rows.filter((r) => r.role === "superadmin").length },
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
        <input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 999,
            fontSize: 13,
            minWidth: 240,
            background: "white",
          }}
        />
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
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={(c) => toggleAllVisible(c)}
            disabled={selectableIds.length === 0}
            ariaLabel="Seleccionar todos los alumnos visibles"
          />
        </span>
        <span style={{ flex: 1 }}>Alumno</span>
        <span style={{ width: 100 }}>Role</span>
        <span style={{ width: 70, textAlign: "right" }}>Nivel</span>
        <span style={{ width: 80, textAlign: "right" }}>XP</span>
        <span style={{ width: 70, textAlign: "right" }}>Racha</span>
        <span style={{ width: 120, textAlign: "right" }}>Registro</span>
        <span style={{ width: 110, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((u) => {
          const isSelf = u.id === currentUserId;
          const isSuperadmin = u.role === "superadmin";
          const lockReason = isSelf ? "No puedes seleccionar tu propia cuenta" : isSuperadmin ? "Los superadmins no se pueden eliminar" : null;
          const isChecked = selected.has(u.id);
          return (
            <div
              key={u.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                background: isChecked ? "rgba(216, 168, 63, 0.08)" : "white",
                transition: "background 120ms",
                gap: 12,
              }}
            >
              <span style={{ width: 24, display: "flex", alignItems: "center" }} title={lockReason ?? undefined}>
                <Checkbox
                  checked={isChecked}
                  onChange={(c) => toggleOne(u.id, c)}
                  disabled={!!lockReason}
                  ariaLabel={`Seleccionar ${u.name}`}
                />
              </span>
              <div className="row" style={{ flex: 1, gap: 12, minWidth: 0 }}>
                <div className="av" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                  {initials(u.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{u.name}</div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </div>
              <span style={{ width: 100 }}>
                <RoleBadge role={u.role} />
              </span>
              <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12 }}>
                Lv.{u.level}
              </span>
              <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                {u.xp.toLocaleString("es-MX")}
              </span>
              <span
                className="mono"
                style={{
                  width: 70,
                  textAlign: "right",
                  fontSize: 12,
                  color: u.streakDays > 0 ? "oklch(45% 0.16 50)" : "var(--muted)",
                }}
              >
                {u.streakDays > 0 ? `🔥 ${u.streakDays}d` : "—"}
              </span>
              <span
                className="mono"
                style={{ width: 120, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
              >
                {formatRelative(new Date(u.createdAt))}
              </span>
              <span style={{ width: 110, textAlign: "right" }}>
                <a
                  href={`/u/${u.id}`}
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: "var(--bg-2)",
                    color: "var(--ink)",
                    textDecoration: "none",
                    border: "1px solid var(--line)",
                  }}
                >
                  Ver perfil
                </a>
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin resultados para “{q}”.
          </div>
        )}
      </div>

      {/* Floating bulk-action bar */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Acciones masivas"
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 28,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 18px",
            background: "linear-gradient(180deg, #061B36 0%, #0B2548 100%)",
            color: "white",
            borderRadius: 14,
            boxShadow: "0 18px 48px rgba(6,27,54,0.35)",
            border: "1px solid rgba(216,168,63,0.35)",
            minWidth: 360,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {selected.size} {selected.size === 1 ? "alumno seleccionado" : "alumnos seleccionados"}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>
              LAS VENTAS SE PRESERVAN COMO HISTORIAL
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={clearSelection}
            disabled={pending}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={deleteSelected}
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: pending ? "rgba(220, 73, 73, 0.4)" : "#DC4949",
              color: "white",
              border: "1px solid #B83A3A",
              fontSize: 12,
              fontWeight: 700,
              cursor: pending ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(220, 73, 73, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {pending ? "Eliminando…" : "Eliminar permanentemente"}
          </button>
        </div>
      )}
    </>
  );
}

/* ──────────── Custom checkbox (no native browser UI) ──────────── */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const isOn = checked || !!indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: "1.5px solid " + (isOn ? "var(--accent, #D8A83F)" : "var(--line-2)"),
        background: isOn ? "var(--accent, #D8A83F)" : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "all 120ms",
      }}
    >
      {indeterminate ? (
        <span style={{ display: "block", width: 8, height: 2, background: "white", borderRadius: 1 }} />
      ) : checked ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2L5 8.7L9.5 3.3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}
