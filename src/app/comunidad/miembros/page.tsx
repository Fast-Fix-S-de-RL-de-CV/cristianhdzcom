import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { initials } from "@/lib/utils";

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

          <div className="row" style={{ gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Buscar por nombre…"
              style={{ flex: 1, minWidth: 240, maxWidth: 360 }}
            />
            <button className="btn btn-ghost" type="button">Todos</button>
            <button className="btn btn-ghost" type="button">Nivel 5+</button>
            <button className="btn btn-ghost" type="button">Nivel 10+</button>
            <button className="btn btn-ghost" type="button">Admins</button>
          </div>

          {members.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Aún no hay miembros.
            </Card>
          ) : (
            <div
              className="members-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {members.map((m) => {
                const isMe = m.id === user.id;
                const isAdmin = m.role === "admin" || m.role === "superadmin";
                return (
                  <Card
                    key={m.id}
                    hover
                    style={{
                      padding: 20,
                      borderColor: isMe ? "var(--gold)" : undefined,
                      boxShadow: isMe ? "0 0 0 1px var(--gold-line) inset" : undefined,
                    }}
                  >
                    <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                      <div
                        className="av"
                        style={{
                          width: 56,
                          height: 56,
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {initials(m.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)" }}>
                            {m.name}
                          </span>
                          {isAdmin && (
                            <span className="chip chip-gold mono" style={{ fontSize: 9, padding: "2px 6px" }}>
                              ADMIN
                            </span>
                          )}
                          {isMe && (
                            <span className="chip chip-accent mono" style={{ fontSize: 9, padding: "2px 6px" }}>
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                          Nivel {m.level} · {m.xp.toLocaleString("es-MX")} XP
                          {m.streakDays > 0 && ` · 🔥 ${m.streakDays}d`}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 16 }}>
                      <Link
                        href={`/u/${m.id}`}
                        className="btn btn-ghost"
                        style={{ flex: 1, fontSize: 12, padding: "8px 12px", textAlign: "center" }}
                      >
                        Ver perfil
                      </Link>
                      {!isMe && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: 12, padding: "8px 12px" }}
                        >
                          Mensaje
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
      </div>
    </AlumnoShell>
  );
}
