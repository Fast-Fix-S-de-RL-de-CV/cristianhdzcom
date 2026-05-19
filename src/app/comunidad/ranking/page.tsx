import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";
import { RankingTabs } from "./RankingTabs";

export const dynamic = "force-dynamic";

const MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

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
    <div className="plat">
      <PlatformSidebar activeHref="/comunidad/ranking" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
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

          <RankingTabs />

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div
              className="row"
              style={{
                padding: "14px 24px",
                background: "var(--bg-2)",
                borderBottom: "1px solid var(--line)",
                fontSize: 11,
                color: "var(--muted)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <span style={{ width: 64 }}>Rank</span>
              <span style={{ flex: 1 }}>Miembro</span>
              <span style={{ width: 90, textAlign: "right" }}>Nivel</span>
              <span style={{ width: 110, textAlign: "right" }}>XP</span>
              <span style={{ width: 90, textAlign: "right" }}>Racha</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              {rows.map((u, i) => {
                const rank = i + 1;
                const isMe = u.id === user.id;
                const medal = MEDALS[rank];
                return (
                  <div
                    key={u.id}
                    className="row"
                    style={{
                      padding: "14px 24px",
                      borderBottom: "1px solid var(--line)",
                      background: isMe ? "var(--accent-soft)" : "white",
                      borderLeft: isMe ? "3px solid var(--accent)" : "3px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        width: 64,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {medal ? (
                        <span style={{ fontSize: 22, lineHeight: 1 }}>{medal}</span>
                      ) : (
                        <span
                          className="mono"
                          style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}
                        >
                          #{rank}
                        </span>
                      )}
                    </span>
                    <div className="row" style={{ flex: 1, gap: 12 }}>
                      <div className="av" style={{ width: 36, height: 36, fontSize: 12 }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                          {u.name}
                          {isMe && (
                            <span
                              className="mono"
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                padding: "2px 6px",
                                background: "var(--accent)",
                                color: "white",
                                borderRadius: 4,
                              }}
                            >
                              TÚ
                            </span>
                          )}
                        </div>
                        {rank <= 3 && (
                          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                            {rank === 1 ? "PRIMER LUGAR" : rank === 2 ? "SEGUNDO LUGAR" : "TERCER LUGAR"}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className="mono"
                      style={{
                        width: 90,
                        textAlign: "right",
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 8px",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        Lv.{u.level}
                      </span>
                    </span>
                    <span
                      className="mono"
                      style={{ width: 110, textAlign: "right", fontSize: 14, fontWeight: 600 }}
                    >
                      {u.xp.toLocaleString("es-MX")}
                    </span>
                    <span
                      className="mono"
                      style={{
                        width: 90,
                        textAlign: "right",
                        fontSize: 12,
                        color: u.streakDays > 0 ? "oklch(45% 0.16 50)" : "var(--muted)",
                      }}
                    >
                      {u.streakDays > 0 ? `🔥 ${u.streakDays}d` : "—"}
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                  Sin miembros aún.
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
