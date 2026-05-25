"use client";
import { useMemo, useState } from "react";
import { initials, formatRelative } from "@/lib/utils";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

type Row = {
  userId: string | null;
  email: string;
  name: string;
  ordersCount: number;
  lifetimeCents: number;
  lastOrderAt: string | null;
};

export function ClientesTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const bulk = useBulkSelection<string>();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  // Only rows that still have a userId AND are not the current admin can be
  // selected. Orphaned rows (userId === null) have no user left to delete —
  // only the historical orders remain.
  const selectableIds = useMemo(
    () =>
      filtered
        .map((r) => r.userId)
        .filter((id): id is string => !!id && id !== currentUserId),
    [filtered, currentUserId],
  );
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => bulk.isSelected(id));
  const someVisibleSelected =
    !allVisibleSelected && selectableIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/users/bulk-delete",
    entityLabel: { singular: "cliente", plural: "clientes" },
    description:
      "Se borra TODA su data personal (sesiones, inscripciones, posts, mensajes). " +
      "Las ventas que pagó SE PRESERVAN en el historial con el nombre y email originales — " +
      "solo desaparece su cuenta. Esta acción no se puede deshacer.",
    successMessage: (b) => {
      const parts = [`${b.deleted} ${b.deleted === 1 ? "cliente eliminado" : "clientes eliminados"}`];
      const preserved = (b as { preservedOrders?: number }).preservedOrders ?? 0;
      if (preserved > 0) {
        parts.push(`${preserved} ${preserved === 1 ? "venta preservada" : "ventas preservadas"}`);
      }
      return parts.join(" · ");
    },
    onSuccess: bulk.clear,
  });

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
          justifyContent: "flex-end",
        }}
      >
        <input
          type="search"
          placeholder="Buscar cliente…"
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
            ariaLabel="Seleccionar todos los clientes visibles"
          />
        </span>
        <span style={{ flex: 1 }}>Cliente</span>
        <span style={{ width: 90, textAlign: "right" }}># Orders</span>
        <span style={{ width: 130, textAlign: "right" }}>Lifetime Value</span>
        <span style={{ width: 130, textAlign: "right" }}>Última compra</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((u) => {
          const orphan = !u.userId;
          const isSelf = u.userId === currentUserId;
          const lockReason = orphan
            ? "Este cliente ya no tiene cuenta — solo quedan sus ventas"
            : isSelf
              ? "No puedes seleccionar tu propia cuenta"
              : null;
          const isChecked = !!u.userId && bulk.isSelected(u.userId);
          return (
            <div
              key={u.email + (u.userId ?? "")}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                gap: 12,
                ...selectedRowBg(isChecked),
              }}
            >
              <span
                style={{ width: 24, display: "flex", alignItems: "center" }}
                title={lockReason ?? undefined}
              >
                <BulkCheckbox
                  checked={isChecked}
                  onChange={(c) => u.userId && bulk.toggleOne(u.userId, c)}
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
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </div>
              <span
                className="mono"
                style={{ width: 90, textAlign: "right", fontSize: 13, fontWeight: 600 }}
              >
                {u.ordersCount}
              </span>
              <span
                className="mono"
                style={{ width: 130, textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--green-strong)" }}
              >
                ${(u.lifetimeCents / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
              </span>
              <span
                className="mono"
                style={{ width: 130, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
              >
                {u.lastOrderAt ? formatRelative(new Date(u.lastOrderAt)) : "—"}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            {rows.length === 0
              ? "Aún no hay clientes con compras pagadas."
              : `Sin resultados para “${q}”.`}
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "cliente", plural: "clientes" }}
        subtitle="LAS VENTAS QUE PAGÓ SE PRESERVAN EN EL HISTORIAL"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}
