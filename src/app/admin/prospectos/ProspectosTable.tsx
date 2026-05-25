"use client";
import { useMemo } from "react";
import Link from "next/link";
import { initials } from "@/lib/utils";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

export type ProspectoRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  country: string | null;
  createdAt: string;
  enrollmentsCount: number;
  lessonsDone: number;
  attemptsCount: number;
};

export function ProspectosTable({
  rows,
  currentUserId,
}: {
  rows: ProspectoRow[];
  currentUserId: string;
}) {
  const bulk = useBulkSelection<string>();

  // All prospects in this view are non-admin already (filtered server-side),
  // but extra defense: exclude the current user from selection.
  const selectableIds = useMemo(
    () => rows.filter((r) => r.id !== currentUserId).map((r) => r.id),
    [rows, currentUserId],
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && selectableIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/users/bulk-delete",
    entityLabel: { singular: "prospecto", plural: "prospectos" },
    description:
      "Se borra TODA su data personal (sesiones, inscripciones gratuitas, posts, comentarios, " +
      "progreso, mensajes). Como los prospectos no tienen ventas pagadas, no queda historial — " +
      "el registro desaparece por completo. Esta acción no se puede deshacer.",
    successMessage: (b) => {
      const parts = [`${b.deleted} ${b.deleted === 1 ? "prospecto eliminado" : "prospectos eliminados"}`];
      const blocked = (b as { blocked?: unknown[] }).blocked ?? [];
      if (blocked.length) parts.push(`${blocked.length} omitidos`);
      return parts.join(" · ");
    },
    onSuccess: bulk.clear,
  });

  return (
    <>
      {/* Header */}
      <div
        className="row"
        style={{
          padding: "12px 24px",
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
            onChange={(c) => bulk.toggleAllVisible(c, selectableIds)}
            disabled={selectableIds.length === 0}
            ariaLabel="Seleccionar todos los prospectos"
          />
        </span>
        <span style={{ flex: 2 }}>Prospecto</span>
        <span style={{ width: 100, textAlign: "right" }}>Engagement</span>
        <span style={{ width: 80, textAlign: "right" }}>XP</span>
        <span style={{ width: 90, textAlign: "right" }}>Racha</span>
        <span style={{ width: 90 }}>País</span>
        <span style={{ width: 110, textAlign: "right" }}>Registro</span>
        <span style={{ width: 100 }}>Estado</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 40 }}>🌱</div>
          <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>
            Aún no hay prospectos.
          </div>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Cuando alguien se registre gratis o se inscriba en un curso/taller gratuito, aparecerá aquí.
          </p>
        </div>
      ) : (
        rows.map((r, i) => {
          const isSelf = r.id === currentUserId;
          const isChecked = bulk.isSelected(r.id);
          const temperature =
            r.enrollmentsCount >= 2 || r.lessonsDone >= 5
              ? { label: "CALIENTE", bg: "color-mix(in srgb, #E89B3D 18%, white)", color: "#a05a0a" }
              : r.enrollmentsCount >= 1 || r.lessonsDone >= 1
                ? { label: "TIBIO", bg: "color-mix(in srgb, var(--gold) 14%, white)", color: "var(--gold-deep)" }
                : { label: "FRÍO", bg: "var(--bg-3)", color: "var(--muted)" };
          return (
            <div
              key={r.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
                alignItems: "center",
                gap: 12,
                ...selectedRowBg(isChecked),
              }}
            >
              <span
                style={{ width: 24, display: "flex", alignItems: "center" }}
                title={isSelf ? "No puedes seleccionar tu propia cuenta" : undefined}
              >
                <BulkCheckbox
                  checked={isChecked}
                  onChange={(c) => bulk.toggleOne(r.id, c)}
                  disabled={isSelf}
                  ariaLabel={`Seleccionar ${r.name}`}
                />
              </span>
              <div className="row" style={{ flex: 2, gap: 12, alignItems: "center", minWidth: 0 }}>
                <Link href={`/u/${r.id}`} aria-label={r.name} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <div className="av" style={{ width: 38, height: 38, fontSize: 12 }}>
                    {initials(r.name)}
                  </div>
                </Link>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
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
                    {r.email}
                  </div>
                </div>
              </div>
              <span
                className="mono"
                style={{ width: 100, textAlign: "right", fontSize: 11, color: "var(--ink-2)" }}
              >
                {r.enrollmentsCount} curs · {r.lessonsDone} lec
              </span>
              <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                {r.xp.toLocaleString("es-MX")}
              </span>
              <span
                className="mono"
                style={{
                  width: 90,
                  textAlign: "right",
                  fontSize: 11,
                  color: r.streakDays > 0 ? "#a05a0a" : "var(--muted)",
                }}
              >
                {r.streakDays > 0 ? `🔥 ${r.streakDays}d` : "—"}
              </span>
              <span className="mono" style={{ width: 90, fontSize: 11, color: "var(--ink-2)" }}>
                {r.country || "—"}
              </span>
              <span
                className="mono"
                style={{ width: 110, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
              >
                {formatDate(r.createdAt)}
              </span>
              <span style={{ width: 100 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 9,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: temperature.bg,
                    color: temperature.color,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  {temperature.label}
                </span>
              </span>
            </div>
          );
        })
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "prospecto", plural: "prospectos" }}
        subtitle="LIMPIA LEADS FRÍOS · NO HAY VENTAS QUE PRESERVAR"
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}
