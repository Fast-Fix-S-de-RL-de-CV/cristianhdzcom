"use client";

/**
 * Pill switch para activar/desactivar un row en una lista admin.
 * Llama a `onToggle(newValue)` y muestra estado de "saving" mientras la
 * promesa se resuelve. Si onToggle lanza, vuelve al estado previo.
 */
import { useState } from "react";

export function ActiveToggle({
  value,
  onToggle,
  ariaLabel,
  size = "md",
}: {
  value: boolean;
  onToggle: (next: boolean) => Promise<void> | void;
  ariaLabel?: string;
  size?: "sm" | "md";
}) {
  const [optimistic, setOptimistic] = useState(value);
  const [busy, setBusy] = useState(false);

  // Si el padre re-renderiza con otro value (refresh), sincronizamos.
  if (!busy && optimistic !== value) {
    setOptimistic(value);
  }

  const W = size === "sm" ? 36 : 44;
  const H = size === "sm" ? 20 : 24;
  const D = H - 4;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    const next = !optimistic;
    setOptimistic(next);
    setBusy(true);
    try {
      await onToggle(next);
    } catch {
      setOptimistic(!next); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={ariaLabel ?? (optimistic ? "Desactivar" : "Activar")}
      onClick={handleClick}
      disabled={busy}
      style={{
        width: W,
        height: H,
        borderRadius: H,
        border: "none",
        padding: 0,
        background: optimistic ? "var(--green-strong, #2da064)" : "var(--line-2, #d4d4d4)",
        cursor: busy ? "wait" : "pointer",
        position: "relative",
        transition: "background 0.2s ease",
        opacity: busy ? 0.7 : 1,
        flexShrink: 0,
      }}
      title={optimistic ? "Activo · clic para ocultar" : "Oculto · clic para activar"}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: optimistic ? W - D - 2 : 2,
          width: D,
          height: D,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}
