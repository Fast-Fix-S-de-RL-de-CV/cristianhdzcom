import type { Metadata } from "next";
import { SaasNav, SaasFooter } from "../chrome";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar sesión — mimarca.app",
  description: "Entra a tu plataforma o al panel de administración de mimarca.app.",
};

/**
 * Login del realm PLATAFORMA (mimarca.app/login). Un solo formulario que
 * enruta a superadmin, admin de tenant o miembro (ver /api/platform/login).
 * Nota: los miembros también pueden entrar directo en su plataforma
 * ({dominio-del-tenant}/login o mimarca.app/{slug}/login) — esto es el
 * "¿dónde estaba mi plataforma?" central, estilo Skool.
 */
export default function PlatformLoginPage() {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <SaasNav />
      <main
        className="sec"
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 48, paddingBottom: 64 }}
      >
        <LoginClient />
      </main>
      <SaasFooter />
    </div>
  );
}
