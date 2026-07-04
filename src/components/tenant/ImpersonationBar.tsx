import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { ImpersonationBanner } from "./ImpersonationBanner";

/**
 * Wrapper server del banner de impersonación. Se monta en el root layout y solo
 * renderiza la barra cuando la sesión actual está impersonando (getCurrentUser
 * expone isImpersonating leyendo sessions.impersonatorUserId).
 */
export async function ImpersonationBar() {
  const user = await getCurrentUser();
  if (!user || !user.isImpersonating) return null;
  const ctx = await getTenantCtx();
  return <ImpersonationBanner userName={user.name} siteName={ctx?.branding.siteName} />;
}
