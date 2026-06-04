"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { initials } from "@/lib/utils";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";

/**
 * Una sola fila representa UN email — independientemente de si vino por:
 *
 *   - solo el form de leads (no se registró)              → `userId === null`
 *   - registro en /registro (cuenta con password)         → `leadId === null`
 *   - ambos (dejó email Y después se registró)            → ambos presentes
 *
 * El backend hace el merge por LOWER(email).
 */
export type ProspectoRow = {
  email: string;
  /** Display name. Null cuando es lead puro sin cuenta. */
  name: string | null;
  /** Id en `users`. Null cuando solo es lead. */
  userId: string | null;
  /** Id en `leads`. Null cuando solo es user. */
  leadId: number | null;
  /** Fuente declarada en el lead (newsletter, popup, organic…). */
  source: string | null;
  /** Tag/categoría del lead. */
  tag: string | null;
  /** Curso/talleres gratis tomados. 0 si solo lead. */
  enrollmentsCount: number;
  /** Lecciones completadas. 0 si solo lead. */
  lessonsDone: number;
  /** XP acumulado en la plataforma. 0 si solo lead. */
  xp: number;
  /** Nivel Duolingo-style. */
  level: number;
  streakDays: number;
  country: string | null;
  /** Primera vez que vimos este email (min entre user.createdAt y lead.createdAt). */
  createdAt: string;
};

type Filter = "all" | "registered" | "lead-only" | "hot";

export function ProspectosTable({
  rows,
  currentUserId,
}: {
  rows: ProspectoRow[];
  currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const bulk = useBulkSelection<string>(); // key = lowercased email

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const isRegistered = r.userId != null;
      const isLeadOnly = r.userId == null && r.leadId != null;
      const isHot = r.enrollmentsCount > 0 || r.lessonsDone > 0;

      if (filter === "registered" && !isRegistered) return false;
      if (filter === "lead-only" && !isLeadOnly) return false;
      if (filter === "hot" && !isHot) return false;

      if (!needle) return true;
      return (
        r.email.toLowerCase().includes(needle) ||
        (r.name ?? "").toLowerCase().includes(needle) ||
        (r.source ?? "").toLowerCase().includes(needle) ||
        (r.tag ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filter]);

  // All visible rows are selectable — except if it's the current admin's own
  // account (only possible if admin somehow has no paid order, edge case).
  const selectableEmails = useMemo(
    () => filtered.filter((r) => r.userId !== currentUserId).map((r) => r.email.toLowerCase()),
    [filtered, currentUserId],
  );
  const allSelected = selectableEmails.length > 0 && selectableEmails.every((e) => bulk.isSelected(e));
  const someSelected = !allSelected && selectableEmails.some((e) => bulk.isSelected(e));

  // The endpoint expects { ids: [emails…] } — the shared `useBulkDelete` hook
  // always serializes to that shape, so we just pass emails as the "ids".
  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/prospects/bulk-delete",
    entityLabel: { singular: "prospecto", plural: "prospectos" },
    description:
      "Para cada email seleccionado se borra TODO lo que tengamos: la cuenta registrada con su " +
      "data (sesiones, inscripciones gratis, posts, comentarios, lecciones, mensajes), Y el " +
      "registro de captura del email (newsletter / popup / lead magnet). Las órdenes pendientes " +
      "o reembolsadas se preservan como historial. Esta acción no se puede deshacer.",
    successMessage: (b) => {
      const u = (b as { deletedUsers?: number }).deletedUsers ?? 0;
      const l = (b as { deletedLeads?: number }).deletedLeads ?? 0;
      const total = u + l;
      const parts = [`${total} ${total === 1 ? "prospecto eliminado" : "prospectos eliminados"}`];
      if (u > 0 && l > 0) {
        parts.push(`${u} con cuenta · ${l} solo email`);
      } else if (u > 0) {
        parts.push(`${u} con cuenta registrada`);
      } else if (l > 0) {
        parts.push(`${l} solo email`);
      }
      const preserved = (b as { preservedOrders?: number }).preservedOrders ?? 0;
      if (preserved > 0) parts.push(`${preserved} órdenes preservadas`);
      const blocked = (b as { blocked?: unknown[] }).blocked ?? [];
      if (blocked.length) parts.push(`${blocked.length} omitidos`);
      return parts.join(" · ");
    },
    onSuccess: bulk.clear,
  });

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: rows.length },
    { value: "registered", label: "Con cuenta", count: rows.filter((r) => r.userId != null).length },
    { value: "lead-only", label: "Solo email", count: rows.filter((r) => r.userId == null && r.leadId != null).length },
    {
      value: "hot",
      label: "Calientes",
      count: rows.filter((r) => r.enrollmentsCount > 0 || r.lessonsDone > 0).length,
    },
  ];

  return (
    <>
      {/* Filtros + búsqueda */}
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
          placeholder="Buscar por email, nombre, fuente o tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 999,
            fontSize: 13,
            minWidth: 260,
            background: "white",
          }}
        />
      </div>

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
            onChange={(c) => bulk.toggleAllVisible(c, selectableEmails)}
            disabled={selectableEmails.length === 0}
            ariaLabel="Seleccionar todos los prospectos visibles"
          />
        </span>
        <span style={{ flex: 2 }}>Prospecto</span>
        <span style={{ width: 120 }}>Origen</span>
        <span style={{ width: 110, textAlign: "right" }}>Engagement</span>
        <span style={{ width: 70, textAlign: "right" }}>XP</span>
        <span style={{ width: 70, textAlign: "right" }}>Racha</span>
        <span style={{ width: 90 }}>País</span>
        <span style={{ width: 110, textAlign: "right" }}>Capturado</span>
        <span style={{ width: 110 }}>Estado</span>
      </div>

      {/* Filas */}
      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 40 }}>🌱</div>
          <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>
            {rows.length === 0 ? "Aún no hay prospectos." : `Sin resultados para "${q}".`}
          </div>
          {rows.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 6 }}>
              Cuando alguien deje su email en el newsletter, se inscriba en un curso gratis o se
              registre sin comprar, aparecerá aquí.
            </p>
          )}
        </div>
      ) : (
        filtered.map((r, i) => {
          const key = r.email.toLowerCase();
          const isSelf = r.userId != null && r.userId === currentUserId;
          const isChecked = bulk.isSelected(key);
          const isRegistered = r.userId != null;
          const isLeadOnly = !isRegistered && r.leadId != null;
          const temperature =
            r.enrollmentsCount >= 2 || r.lessonsDone >= 5
              ? { label: "CALIENTE", bg: "color-mix(in srgb, #E89B3D 18%, white)", color: "#a05a0a" }
              : r.enrollmentsCount >= 1 || r.lessonsDone >= 1
                ? { label: "TIBIO", bg: "color-mix(in srgb, var(--gold) 14%, white)", color: "var(--gold-deep)" }
                : isLeadOnly
                  ? { label: "SOLO EMAIL", bg: "var(--bg-3)", color: "var(--muted)" }
                  : { label: "FRÍO", bg: "var(--bg-3)", color: "var(--muted)" };

          // Origin string — combines source (if any) + cuenta indicator
          const originBits: string[] = [];
          if (r.source) originBits.push(r.source);
          if (r.tag) originBits.push(r.tag);
          if (originBits.length === 0) {
            originBits.push(isRegistered ? "Registro directo" : "—");
          }
          const originText = originBits.join(" · ");

          return (
            <div
              key={key}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--line)" : "none",
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
                  onChange={(c) => bulk.toggleOne(key, c)}
                  disabled={isSelf}
                  ariaLabel={`Seleccionar ${r.email}`}
                />
              </span>

              {/* Prospecto: avatar + nombre + email */}
              <div className="row" style={{ flex: 2, gap: 12, alignItems: "center", minWidth: 0 }}>
                {r.userId ? (
                  <Link href={`/u/${r.userId}`} aria-label={r.name ?? r.email} style={{ textDecoration: "none", flexShrink: 0 }}>
                    <div className="av" style={{ width: 38, height: 38, fontSize: 12 }}>
                      {initials(r.name ?? r.email)}
                    </div>
                  </Link>
                ) : (
                  <div
                    className="av"
                    style={{
                      width: 38,
                      height: 38,
                      fontSize: 12,
                      background: "var(--bg-3)",
                      color: "var(--muted)",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    @
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {r.name ?? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Sin nombre</span>}
                  </div>
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

              {/* Origen */}
              <span
                className="mono"
                style={{
                  width: 120,
                  fontSize: 11,
                  color: "var(--ink-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={originText}
              >
                {originText}
              </span>

              {/* Engagement */}
              <span
                className="mono"
                style={{
                  width: 110,
                  textAlign: "right",
                  fontSize: 11,
                  color: r.enrollmentsCount + r.lessonsDone > 0 ? "var(--ink-2)" : "var(--muted)",
                }}
              >
                {isRegistered ? `${r.enrollmentsCount} curs · ${r.lessonsDone} lec` : "—"}
              </span>

              {/* XP */}
              <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                {isRegistered ? r.xp.toLocaleString("es-MX") : <span style={{ color: "var(--muted)" }}>—</span>}
              </span>

              {/* Racha */}
              <span
                className="mono"
                style={{
                  width: 70,
                  textAlign: "right",
                  fontSize: 11,
                  color: r.streakDays > 0 ? "#a05a0a" : "var(--muted)",
                }}
              >
                {r.streakDays > 0 ? `🔥 ${r.streakDays}d` : "—"}
              </span>

              {/* País */}
              <span className="mono" style={{ width: 90, fontSize: 11, color: "var(--ink-2)" }}>
                {r.country || "—"}
              </span>

              {/* Capturado */}
              <span
                className="mono"
                style={{ width: 110, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
              >
                {formatDate(r.createdAt)}
              </span>

              {/* Estado */}
              <span style={{ width: 110 }}>
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
        subtitle="LIMPIA EL EMBUDO · NO HAY VENTAS PAGADAS QUE PRESERVAR"
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
