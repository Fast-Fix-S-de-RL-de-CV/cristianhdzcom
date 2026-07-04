import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SiteTabs } from "@/components/admin/SiteTabs";
import { DomainSection } from "@/components/admin/DomainSection";

export const dynamic = "force-dynamic";

export default async function DomainAdminPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = (await getCurrentUser())!;

  return (
    <AdminPageShell
      user={user}
      active="sitio"
      title="Dominio propio"
      subtitle="Conecta tu dominio (tumarca.com) para que tu plataforma viva ahí"
    >
      <SiteTabs current="/admin/ajustes/dominio" />
      <DomainSection />
    </AdminPageShell>
  );
}
