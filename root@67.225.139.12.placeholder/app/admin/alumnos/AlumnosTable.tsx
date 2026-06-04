"use client";
import { useMemo, useState } from "react";
import { initials, formatRelative } from "@/lib/utils";
import { RoleBadge } from "@/components/admin/AdminPageShell";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

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
  const bulk = useBulkSelection<string>();

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

  // IDs the current admin is allowed to delete (excludes superadmins + self).
  const selectableIds = useMemo(
    () => filtered.filter((r) => r.role !== "superadmin" && r.id !== currentUserId).map((r) => r.id),
    [filtered, currentUserId],
  );
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => bulk.isSelected(id));
  const someVisibleSelected = !allVisibleSelected && selectableIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/users/bulk-delete",
    entityLabel: { singular: "alumno", plural: "alumnos" },
    description:
      "Se borrará TODA su data personal: sesiones, posts, comentarios, lecciones, notas, mensajes, " +
      "inscripciones y certificados. Las ventas y órdenes asociadas SE PRESERVAN como historial " +
      "(con el nombre y email originales), solo se desvincula el usuario. Esta acción no se puede deshacer.",
    successMessage: (b) => {
      const parts = [`${b.deleted} ${b.deleted === 1 ? "alumno eliminado" : "alumnos eliminados"}`];
      const preserved = (b as { preservedOrders?: number }).preservedOrders ?? 0;
      if (preserved > 0) {
        parts.push(`${preserved} ${preserved === 1 ? "venta preservada" : "ventas preservadas"} en el historial`);
      }
      const blocked = (b as { blocked?: unknown[] }).blocked ?? [];
      if (blocked.length) parts.push(`${blocked.length} omitidos`);
      return parts.join(" · ");
    },
    onSuccess: bulk.clear,
  });

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
          <BulkCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={(c) => bulk.toggleAllVisible(c, selectableIds)}
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
          const lockReason = isSelf
            ? "No puedes seleccionar tu propia cuenta"
            : isSuperadmin
              ? "Los superadmins no se pueden eliminar"
              : null;
          const isChecked = bulk.isSelected(u.id);
          return (
            <div
              key={u.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                gap: 12,
                ...selectedRowBg(isChecked),
              }}
            >
              <span style={{ width: 24, display: "flex", alignItems: "center" }} title={lockReason ?? undefined}>
                <BulkCheckbox
                  checked={isChecked}
                  onChange={(c) => bulk.toggleOne(u.id, c)}
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
              <span className="mono" style={{ width: 120, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
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

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "alumno", plural: "alumnos" }}
        subtitle="LAS VENTAS SE PRESERVAN COMO HISTORIAL"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}
