"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";

export function MembershipManageClient({
  cancelAtPeriodEnd,
  accessUntil,
}: {
  cancelAtPeriodEnd: boolean;
  accessUntil: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  async function cancel() {
    const ok = await confirm({
      title: "¿Cancelar tu membresía?",
      description: `Mantienes acceso hasta el ${new Date(accessUntil).toLocaleDateString(
        "es-MX",
        { day: "numeric", month: "long", year: "numeric" },
      )}. Después dejarás de recibir mastermind, 1:1, biblioteca premium y descuentos. Tu crédito acumulado tiene 90 días para usarse antes de caducar. ¿Continuar?`,
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Mantener mi plan",
      tone: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/membership/cancel", { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast.error("No se pudo cancelar. Escríbenos a info@cristianhdz.com.");
          return;
        }
        toast.success("Cancelada. Mantienes acceso hasta el periodo actual.");
        setDone("canceled");
        router.refresh();
      } catch {
        toast.error("Error de red.");
      }
    });
  }

  async function resume() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/membership/resume", { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast.error("No se pudo reactivar.");
          return;
        }
        toast.success("Suscripción reactivada. Tu plan continúa.");
        setDone("resumed");
        router.refresh();
      } catch {
        toast.error("Error de red.");
      }
    });
  }

  if (cancelAtPeriodEnd && done !== "resumed") {
    return (
      <div>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
          Cancelaste tu suscripción. No se renovará automáticamente. Si cambias de opinión, reactívala ahora
          sin perder el crédito acumulado ni los beneficios.
        </p>
        <button
          onClick={resume}
          disabled={pending}
          style={{
            padding: "10px 18px",
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Procesando…" : "Reactivar suscripción"}
        </button>
      </div>
    );
  }

  return (
    <div className="row" style={{ gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
      <button
        onClick={cancel}
        disabled={pending}
        style={{
          padding: "9px 16px",
          background: "white",
          color: "var(--red)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        Cancelar suscripción
      </button>
    </div>
  );
}
