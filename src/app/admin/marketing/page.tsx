import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/admin/marketing` se fusionó con `/admin/prospectos` (tab "Leads").
 * Mantenemos el redirect para no romper bookmarks ni links en campañas
 * de marketing antiguas que apunten aquí.
 */
export default function MarketingPage() {
  redirect("/admin/prospectos?tab=leads");
}
