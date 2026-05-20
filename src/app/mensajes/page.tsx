import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ConvoRow = {
  id: string;
  lastMessageAt: string | Date;
  createdAt: string | Date;
  peerId: string;
  peerName: string | null;
  peerRole: string | null;
  peerLevel: number | null;
  lastBody: string | null;
  lastAuthorId: string | null;
  unread: number;
};

export default async function MensajesInbox() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mensajes");

  const res = (await db.execute(sql`
    SELECT
      c.id                 AS "id",
      c.last_message_at    AS "lastMessageAt",
      c.created_at         AS "createdAt",
      CASE WHEN c.user_a_id = ${user.id} THEN c.user_b_id ELSE c.user_a_id END AS "peerId",
      u.name               AS "peerName",
      u.role               AS "peerRole",
      u.level              AS "peerLevel",
      (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1)
                           AS "lastBody",
      (SELECT m.author_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1)
                           AS "lastAuthorId",
      (SELECT COUNT(*)::int FROM messages m
        WHERE m.conversation_id = c.id
          AND m.author_id <> ${user.id}
          AND m.read_at IS NULL)
                           AS "unread"
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user_a_id = ${user.id} THEN c.user_b_id ELSE c.user_a_id END
    WHERE c.user_a_id = ${user.id} OR c.user_b_id = ${user.id}
    ORDER BY c.last_message_at DESC
    LIMIT 100
  `)) as unknown as { rows?: ConvoRow[] } | ConvoRow[];
  const conversations: ConvoRow[] = Array.isArray(res) ? res : (res.rows ?? []);

  return (
    <AlumnoShell user={user} active="mensajes">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow">Mensajes directos</div>
          <h1 className="serif" style={{ fontSize: 38, marginTop: 8 }}>
            Bandeja de entrada
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
            Conversaciones privadas con otros miembros y el equipo de CH.
          </p>
        </div>

        {conversations.length === 0 ? (
          <Card style={{ padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <h2 className="serif" style={{ fontSize: 22 }}>Aún no tienes conversaciones</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
              Entra al <Link href="/comunidad/miembros" style={{ color: "var(--accent)", fontWeight: 600 }}>
                directorio de miembros
              </Link>{" "}
              y dale "Mensaje" a alguien para empezar.
            </p>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {conversations.map((c, i) => {
              const isLast = c.lastAuthorId === user.id;
              const preview = c.lastBody ?? "Conversación nueva — saluda 👋";
              const time = c.lastMessageAt ? formatTime(new Date(c.lastMessageAt as any).toISOString()) : "";
              return (
                <Link
                  key={c.id}
                  href={`/mensajes/${c.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr auto",
                    gap: 14,
                    padding: "16px 20px",
                    borderBottom: i < conversations.length - 1 ? "1px solid var(--line)" : "none",
                    color: "inherit",
                    textDecoration: "none",
                    alignItems: "center",
                    background: c.unread > 0 ? "color-mix(in srgb, var(--accent-soft) 50%, white)" : "white",
                  }}
                >
                  <div className="av" style={{ width: 44, height: 44, fontSize: 14 }}>
                    {initials(c.peerName ?? "—")}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
                        {c.peerName ?? "—"}
                      </span>
                      {(c.peerRole === "admin" || c.peerRole === "superadmin") && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            background: "var(--gold)",
                            color: "var(--navy)",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          {c.peerRole === "superadmin" ? "FUNDADOR" : "ADMIN"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: c.unread > 0 ? "var(--ink)" : "var(--muted)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: c.unread > 0 ? 600 : 400,
                      }}
                    >
                      {isLast && "Tú: "}
                      {preview}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {time}
                    </span>
                    {c.unread > 0 && (
                      <span
                        style={{
                          background: "var(--accent)",
                          color: "white",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 22,
                          textAlign: "center",
                        }}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </div>
    </AlumnoShell>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "ahora";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}min`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h`;
  if (diffSec < 86400 * 7) return `${Math.round(diffSec / 86400)}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
