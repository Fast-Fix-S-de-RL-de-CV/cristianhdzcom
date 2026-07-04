"use client";
import { useState } from "react";
import { LogOut, UserCog } from "lucide-react";

/**
 * Barra de impersonación (patrón syscom). Se muestra cuando el superadmin está
 * "viendo como" un tenant. "Salir" → POST /api/platform/superadmin/stop-impersonation
 * (ruta de plataforma, va directo a la raíz — sin tp()) → /superadmin.
 */
export function ImpersonationBanner({ userName, siteName }: { userName: string; siteName?: string }) {
  const [leaving, setLeaving] = useState(false);

  async function stop() {
    setLeaving(true);
    try {
      const res = await fetch("/api/platform/superadmin/stop-impersonation", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      window.location.href = j.redirectUrl || "/superadmin";
    } catch {
      setLeaving(false);
    }
  }

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "8px 16px",
        background: "#F5C518",
        color: "#3A2E00",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        borderBottom: "1px solid #C79A00",
      }}
    >
      <span className="row" style={{ gap: 8, alignItems: "center" }}>
        <UserCog size={15} />
        Estás viendo como <strong>{userName}</strong>
        {siteName ? <span style={{ opacity: 0.7 }}>· {siteName}</span> : null}
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={leaving}
        className="row"
        style={{
          gap: 6,
          alignItems: "center",
          fontSize: 12,
          fontWeight: 700,
          padding: "5px 12px",
          borderRadius: 999,
          border: "1px solid #3A2E00",
          background: "#3A2E00",
          color: "#F5C518",
          cursor: leaving ? "default" : "pointer",
          opacity: leaving ? 0.6 : 1,
        }}
      >
        <LogOut size={13} />
        {leaving ? "Saliendo…" : "Salir de impersonación"}
      </button>
    </div>
  );
}
