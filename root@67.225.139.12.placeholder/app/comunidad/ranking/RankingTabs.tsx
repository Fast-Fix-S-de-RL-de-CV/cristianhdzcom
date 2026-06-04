"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { initials } from "@/lib/utils";

type Range = "week" | "month" | "all";

const TABS: { id: Range; label: string; range: "7d" | "30d" | "all" }[] = [
  { id: "week", label: "Esta semana", range: "7d" },
  { id: "month", label: "Este mes", range: "30d" },
  { id: "all", label: "Todo el tiempo", range: "all" },
];

const MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export type RankingRow = {
  id: string;
  name: string;
  level: number;
  xp: number;
  streakDays: number;
  periodXp?: number;
  rank?: number;
};

export function RankingTabs({
  initialRows,
  currentUserId,
}: {
  initialRows: RankingRow[];
  currentUserId: string;
}) {
  const [active, setActive] = useState<Range>("all");
  const [rows, setRows] = useState<RankingRow[]>(initialRows);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // All-time is already rendered server-side; reuse it without a fetch.
    if (active === "all") {
      setRows(initialRows);
      return;
    }
    const range = TABS.find((t) => t.id === active)!.range;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaderboard?range=${range}&limit=50`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RankingRow[] | null) => {
        if (!cancelled && Array.isArray(data)) setRows(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, initialRows]);

  return (
    <>
      <div
        className="row"
        style={{
          gap: 4,
          marginBottom: 20,
          padding: 4,
          background: "var(--bg-2)",
          borderRadius: 999,
          alignSelf: "flex-start",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn("mono")}
            style={{
              padding: "8px 14px",
              background: active === t.id ? "white" : "transparent",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: active === t.id ? 600 : 500,
              color: active === t.id ? "var(--ink)" : "var(--muted)",
              border: "none",
              cursor: "pointer",
              boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

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
        <div
          className="col"
          style={{ gap: 0, opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}
        >
          {rows.map((u, i) => {
            const rank = u.rank ?? i + 1;
            const isMe = u.id === currentUserId;
            const medal = MEDALS[rank];
            const displayedXp = active === "all" ? u.xp : (u.periodXp ?? u.xp);
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
                  {displayedXp.toLocaleString("es-MX")}
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
    </>
  );
}
