import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getSiteSettings } from "@/lib/site-settings";
import { HeroEditor } from "./HeroEditor";

export const dynamic = "force-dynamic";

export default async function HeroAdminPage() {
  const user = (await getCurrentUser())!;
  const settings = await getSiteSettings();

  return (
    <AdminPageShell
      user={user}
      active="/admin/ajustes"
      title="Hero del Home"
      subtitle="Título, bio, foto de portada, chips, stats y quote del landing público"
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <HeroEditor initial={settings} />
      </Card>
    </AdminPageShell>
  );
}
