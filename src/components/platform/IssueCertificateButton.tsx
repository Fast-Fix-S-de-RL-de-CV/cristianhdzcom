"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Calls /api/certificates/[programId]/issue and navigates to the cert.
 * Used when a course is completed but the certificate wasn't auto-issued
 * (e.g. legacy completions before this feature).
 */
export function IssueCertificateButton({ programId }: { programId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function issue() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/certificates/${programId}/issue`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.certificate?.code) {
        router.push(`/cert/${j.certificate.code}`);
      } else {
        setErr(j.error || "No se pudo emitir el certificado");
      }
    } catch {
      setErr("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        type="button"
        onClick={issue}
        disabled={busy}
        style={{
          padding: "12px 22px",
          borderRadius: 999,
          background: "var(--gold)",
          color: "var(--navy)",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Emitiendo…" : "Generar mi certificado →"}
      </button>
      {err && (
        <div className="mono" style={{ fontSize: 10, color: "#ffaaaa" }}>
          {err}
        </div>
      )}
    </div>
  );
}
