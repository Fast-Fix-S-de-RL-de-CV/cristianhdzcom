"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Button that starts (or reopens) a DM conversation with a member and
 * navigates to the chat. Used in /comunidad/miembros and the public
 * profile page.
 */
export function StartDmButton({
  userId,
  label = "Mensaje",
  style,
}: {
  userId: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dm/conversations/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.conversation?.id) {
        router.push(`/mensajes/${j.conversation.id}`);
      } else {
        setBusy(false);
        toast.error(apiErrorMessage(j, "No se pudo abrir el chat — intenta de nuevo"));
      }
    } catch {
      setBusy(false);
      toast.error("Sin conexión — no se pudo abrir el chat");
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="btn btn-primary"
      style={{ flex: 1, fontSize: 12, padding: "8px 12px", cursor: busy ? "wait" : "pointer", ...style }}
    >
      {busy ? "…" : label}
    </button>
  );
}
