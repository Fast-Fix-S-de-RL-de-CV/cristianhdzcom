import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { AlumnosTable } from "./AlumnosTable";

export const dynamic = "force-dynamic";

export default async function AlumnosPage() {
  // layout guarantees user exists with admin role
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      level: schema.users.level,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
      avatarUrl: schema.users.avatarUrl,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt));

  const data = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/alumnos"
      title="Alumnos"
      subtitle={`${rows.length} usuarios registrados`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <AlumnosTable rows={data} />
      </Card>
    </AdminPageShell>
  );
}
