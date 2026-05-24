"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ConfirmProvider";

/**
 * Botón de inscripción gratuita para cursos con priceUsd === 0.
 * Llama a /api/checkout/free, que (a) exige sesión iniciada y (b) crea
 * la enrollment + una order $0 marcada como succeeded para que el alumno
 * cuente como "cliente" del lead magnet.
 *
 * Si el usuario no tiene sesión, lo manda a /registro?next=/programas/[slug]
 * para que se cree cuenta y vuelva a inscribirse.
 */
export function FreeEnrollButton({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function enroll() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/free", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/registro?next=/programas/${slug}`);
        return;
      }
      if (!res.ok) {
        toast.error(j?.message || j?.error || "No se pudo inscribir");
        return;
      }
      // Inscripción exitosa → directo al curso
      toast.success("¡Inscrito! Llevándote al curso…");
      router.push(`/plataforma/curso/${slug}`);
    } catch (e) {
      toast.error((e as Error).message || "Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={enroll}
      size="lg"
      disabled={busy}
      style={{
        width: "100%",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2da064 0%, #35B779 100%)",
        color: "white",
        border: "none",
      }}
    >
      {busy ? "Inscribiendo…" : "Inscribirme gratis →"}
    </Button>
  );
}
