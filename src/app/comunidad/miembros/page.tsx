import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MiembrosClient } from "./MiembrosClient";

export const dynamic = "force-dynamic";

export default async function MiembrosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidad/miembros");

  // Pull all community members, ordered by recent activity (XP as proxy).
  const members = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      level: schema.users.level,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.xp))
    .limit(120);

  return (
    <AlumnoShell user={user} active="miembros">
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Comunidad</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Miembros
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              {members.length} {members.length === 1 ? "miembro" : "miembros"} en la comunidad. Conecta con quien quieras y mándale un mensaje.
            </p>
            <span className="gold-rule" style={{ marginTop: 14 }} />
          </div>

          {members.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Aún no hay miembros.
            </Card>
          ) : (
            <MiembrosClient members={members} currentUserId={user.id} />
          )}
      </div>
    </AlumnoShell>
  );
}
