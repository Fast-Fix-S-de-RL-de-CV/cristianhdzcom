"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Botón de toolbar para POST /api/admin/tiers/backfill: recalcula el tier +
 * tierScore + lifetimeSpendCents de TODOS los alumnos desde sus orders
 * pagadas. Útil tras cambios masivos (refunds, importaciones) o para
 * reconciliar.
 */
export function BackfillTiersButton() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    const ok = await confirm({
      title: "¿Recalcular tiers de todos los alumnos?",
      description:
        "Se recalculará el tier de cada alumno según su gasto histórico (compras pagadas). Úsalo después de cambios masivos de pagos o para reconciliar los niveles.",
      confirmLabel: "Recalcular",
      tone: "warm",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/tiers/backfill", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudieron recalcular los tiers"));
        return;
      }
      const processed = typeof j?.processed === "number" ? j.processed : 0;
      toast.success(
        processed === 1
          ? "Tiers recalculados — 1 alumno procesado"
          : `Tiers recalculados — ${processed.toLocaleString("es-MX")} alumnos procesados`,
      );
      router.refresh();
    } catch {
      toast.error("No se pudieron recalcular los tiers — revisa tu conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      onClick={run}
      disabled={busy}
      style={{ padding: "8px 14px", fontSize: 12 }}
    >
      {busy ? "Recalculando…" : "↻ Recalcular tiers"}
    </Button>
  );
}
