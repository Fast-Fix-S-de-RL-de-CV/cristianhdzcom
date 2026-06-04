import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RankingTabs } from "./RankingTabs";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidad/ranking");

  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      level: schema.users.level,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.xp))
    .limit(50);

  return (
    <AlumnoShell user={user} active="ranking">
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Comunidad</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Ranking
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              Top 50 miembros por XP acumulado. Gana puntos completando módulos, retos y participando.
            </p>
          </div>

          <RankingTabs initialRows={rows} currentUserId={user.id} />
      </div>
    </AlumnoShell>
  );
}
