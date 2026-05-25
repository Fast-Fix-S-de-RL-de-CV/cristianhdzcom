import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/admin/marketing` se fusionó con `/admin/prospectos` — son el mismo
 * embudo (un email capturado sin compra = un prospecto, sin distinción
 * entre "lead" y "registrado"). Mantenemos el redirect para no romper
 * bookmarks ni links de campañas antiguas.
 */
export default function MarketingPage() {
  redirect("/admin/prospectos");
}
