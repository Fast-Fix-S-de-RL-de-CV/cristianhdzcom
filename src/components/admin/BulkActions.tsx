"use client";
import { useCallback, useMemo, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";

/**
 * Shared building blocks for "select rows + run a bulk action" UX used across
 * admin tables (alumnos, prospectos, clientes, comunidad, cursos, blog,
 * talleres). All admin tables should feel identical: same checkbox, same
 * floating action bar, same confirm + toast flow.
 *
 * Use:
 *   const bulk = useBulkSelection<string>();
 *   const ids = bulk.allSelected;   // current Set<string>
 *   bulk.toggleOne(id, checked);
 *   bulk.toggleAllVisible(checked, visibleIds);
 *   bulk.clear();
 *
 *   <BulkCheckbox checked={bulk.isSelected(id)} onChange={c => bulk.toggleOne(id, c)} />
 *
 *   <BulkActionBar
 *     selectedCount={bulk.size}
 *     entityLabel={{ singular: "alumno", plural: "alumnos" }}
 *     subtitle="LAS VENTAS SE PRESERVAN COMO HISTORIAL"
 *     onCancel={bulk.clear}
 *     onDelete={async () => { ... }}
 *   />
 */

/* ─────────── Custom checkbox (no native browser UI) ─────────── */

export function BulkCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  ariaLabel,
  size = 18,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  size?: number;
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
        width: size,
        height: size,
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
        flexShrink: 0,
      }}
    >
      {indeterminate ? (
        <span style={{ display: "block", width: size * 0.44, height: 2, background: "white", borderRadius: 1 }} />
      ) : checked ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2L5 8.7L9.5 3.3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}

/* ─────────── Floating bulk-action bar ─────────── */

type EntityLabel = { singular: string; plural: string };

export function BulkActionBar({
  selectedCount,
  entityLabel,
  subtitle,
  onCancel,
  onDelete,
  pending,
  deleteLabel = "Eliminar permanentemente",
  extraActions,
}: {
  selectedCount: number;
  entityLabel: EntityLabel;
  /** Small uppercase line under the count. e.g. "LAS VENTAS SE PRESERVAN". */
  subtitle?: string;
  onCancel: () => void;
  onDelete: () => void | Promise<void>;
  pending?: boolean;
  deleteLabel?: string;
  /** Extra buttons rendered between Cancel and Delete (e.g. Bulk-edit). */
  extraActions?: ReactNode;
}) {
  if (selectedCount === 0) return null;
  const label = selectedCount === 1 ? entityLabel.singular : entityLabel.plural;
  return (
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
        maxWidth: "calc(100vw - 40px)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {selectedCount} {label}
          {selectedCount === 1 ? " seleccionado" : " seleccionados"}
        </span>
        {subtitle ? (
          <span className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>
            {subtitle}
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1 }} />
      {extraActions}
      <button
        onClick={onCancel}
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
        onClick={onDelete}
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
        {pending ? "Eliminando…" : deleteLabel}
      </button>
    </div>
  );
}

/* ─────────── Selection hook ─────────── */

export function useBulkSelection<T extends string | number>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  const toggleOne = useCallback((id: T, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback((checked: boolean, visibleIds: T[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return useMemo(
    () => ({
      allSelected: selected,
      size: selected.size,
      isSelected,
      toggleOne,
      toggleAllVisible,
      clear,
    }),
    [selected, isSelected, toggleOne, toggleAllVisible, clear],
  );
}

/* ─────────── High-level helper: bulkDelete() ─────────── */

/**
 * Run a confirm → POST → toast → router.refresh() sequence for a bulk
 * delete. Returns a callback you can wire to BulkActionBar's onDelete.
 *
 * Each table just needs to provide:
 *   - the endpoint URL
 *   - the selected ids
 *   - the entity label
 *   - an optional description for the confirm dialog
 */
export function useBulkDelete<T extends string | number>(opts: {
  url: string;
  entityLabel: EntityLabel;
  /** Description shown inside the confirm dialog. */
  description?: string;
  /** Override the confirm title (default: "¿Eliminar N <label>?"). */
  titleOverride?: (count: number) => string;
  /** Map the success response into the toast body. */
  successMessage?: (response: { deleted: number } & Record<string, unknown>) => string;
  /** Called after a successful delete (e.g. clear selection). */
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    async (ids: T[]) => {
      if (ids.length === 0) return;
      const count = ids.length;
      const label = count === 1 ? opts.entityLabel.singular : opts.entityLabel.plural;
      const ok = await confirm({
        title: opts.titleOverride
          ? opts.titleOverride(count)
          : `¿Eliminar ${count} ${label} ${count === 1 ? "permanentemente" : "permanentemente"}?`,
        description: opts.description ?? "Esta acción no se puede deshacer.",
        confirmLabel: "Eliminar permanentemente",
        cancelLabel: "Cancelar",
        tone: "danger",
      });
      if (!ok) return;

      startTransition(async () => {
        try {
          const res = await fetch(opts.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || body.ok === false) {
            const reason =
              body?.error === "forbidden"
                ? "No tienes permisos para esta acción."
                : body?.error === "in_use"
                  ? `No se puede eliminar: hay registros que dependen de ${label}.`
                  : "No se pudo completar la eliminación.";
            toast.error(reason);
            return;
          }
          const msg = opts.successMessage
            ? opts.successMessage(body)
            : `${body.deleted} ${body.deleted === 1 ? opts.entityLabel.singular : opts.entityLabel.plural} eliminado${body.deleted === 1 ? "" : "s"}.`;
          toast.success(msg);
          opts.onSuccess?.();
          router.refresh();
        } catch {
          toast.error("Error de red al eliminar.");
        }
      });
    },
    [opts, confirm, toast, router],
  );

  return { run, pending };
}

/* ─────────── Row styling helpers ─────────── */

export function selectedRowBg(selected: boolean): CSSProperties {
  return selected
    ? { background: "rgba(216, 168, 63, 0.08)", transition: "background 120ms" }
    : { background: "white", transition: "background 120ms" };
}
