"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { initials } from "@/lib/utils";
import { StartDmButton } from "@/components/community/StartDmButton";

type Member = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  streakDays: number;
};

type FilterKey = "all" | "lvl5" | "lvl10" | "admins";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "lvl5", label: "Nivel 5+" },
  { key: "lvl10", label: "Nivel 10+" },
  { key: "admins", label: "Admins" },
];

export function MiembrosClient({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      const isAdmin = m.role === "admin" || m.role === "superadmin";
      if (filter === "lvl5" && m.level < 5) return false;
      if (filter === "lvl10" && m.level < 10) return false;
      if (filter === "admins" && !isAdmin) return false;
      return true;
    });
  }, [members, query, filter]);

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 240, maxWidth: 360 }}
        />
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              className={active ? "btn btn-primary" : "btn btn-ghost"}
              type="button"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No hay miembros que coincidan con tu búsqueda.
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
          {filtered.map((m) => {
            const isMe = m.id === currentUserId;
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
                  {!isMe && <StartDmButton userId={m.id} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
