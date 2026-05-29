"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { initials } from "@/lib/utils";
import Link from "next/link";

type SidebarStats = {
  members: number;
  online: number;
  countries: number;
  founder: { id: string; name: string } | null;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  level: number;
  xp: number;
  periodXp?: number;
  rank?: number;
  streakDays?: number;
};

type Range = "7d" | "30d" | "all";

const NIVELES: { min: number; title: string }[] = [
  { min: 0, title: "Curioso" },
  { min: 1000, title: "Constructor" },
  { min: 5000, title: "Operador" },
  { min: 15000, title: "Senior" },
  { min: 50000, title: "Maestro" },
];

function formatPts(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k pts`;
  return `${n} pts`;
}

export function CommunitySidebar({
  leaderboard,
  currentUserId,
  currentUser,
  events,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  currentUser?: { xp: number; level: number } | null;
  events: { id: string; title: string; host: string | null; startsAt: string; hot?: boolean | null }[];
}) {
  const [stats, setStats] = useState<SidebarStats | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [board, setBoard] = useState<LeaderboardEntry[]>(leaderboard);
  const [boardLoading, setBoardLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SidebarStats | null) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBoardLoading(true);
    fetch(`/api/leaderboard?range=${range}&limit=7`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LeaderboardEntry[] | null) => {
        if (!cancelled && Array.isArray(data)) setBoard(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBoardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const membersK =
    stats?.members != null
      ? stats.members >= 1000
        ? `${(stats.members / 1000).toFixed(1)}k`
        : String(stats.members)
      : "—";
  const onlineLabel = stats?.online != null ? String(stats.online) : "—";
  const countriesLabel = stats?.countries != null ? String(stats.countries) : "—";

  // Levels progress
  const userXp = currentUser?.xp ?? 0;
  const currentIdx = (() => {
    let idx = 0;
    for (let i = 0; i < NIVELES.length; i++) {
      if (userXp >= NIVELES[i].min) idx = i;
    }
    return idx;
  })();
  const currentRange = NIVELES[currentIdx];
  const nextRange = NIVELES[currentIdx + 1];
  const pointsToNext = nextRange ? Math.max(0, nextRange.min - userXp) : 0;
  const progressPct = nextRange
    ? Math.max(
        0,
        Math.min(100, ((userXp - currentRange.min) / (nextRange.min - currentRange.min)) * 100),
      )
    : 100;

  return (
    <aside className="col" style={{ gap: 16, alignSelf: "flex-start", position: "sticky", top: 20 }}>
      {/* Cover */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            height: 100,
            background: "linear-gradient(135deg, oklch(45% 0.15 252), oklch(28% 0.08 245))",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15), transparent 60%)",
            }}
          />
          <span
            className="serif"
            style={{ position: "absolute", right: 14, bottom: 8, fontSize: 56, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}
          >
            CH
          </span>
        </div>
        <div style={{ padding: 20 }}>
          <h3 className="serif" style={{ fontSize: 22 }}>
            CH · Negocios con IA
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
            Profesionales y empresarios aprendiendo a operar negocios con IA. Talleres semanales, mentorías y demo days.
          </p>
          <div className="grid-3" style={{ marginTop: 16, gap: 8 }}>
            <div>
              <div className="serif" style={{ fontSize: 22 }}>
                {membersK}
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                MIEMBROS
              </div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 22, color: "var(--green)" }}>
                {onlineLabel}
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                EN LÍNEA
              </div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 22 }}>
                {countriesLabel}
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                PAÍSES
              </div>
            </div>
          </div>
          <div className="rule" style={{ margin: "16px 0" }} />
          <div className="col" style={{ gap: 8, fontSize: 13 }}>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Talleres en vivo y on-demand
            </div>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Comunidad privada de fundadores
            </div>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Feed, ranking y mensajería directa
            </div>
          </div>
          {!currentUserId && (
            <Link href="/registro">
              <Button style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>Entrar gratis →</Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card style={{ padding: 20 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <h4 className="serif" style={{ fontSize: 18 }}>
            Ranking
          </h4>
          <Link
            href="/comunidad/ranking"
            className="mono"
            style={{ fontSize: 10, color: "var(--accent)", textDecoration: "none" }}
          >
            VER TODO →
          </Link>
        </div>
        <div className="row" style={{ gap: 4, marginBottom: 14, padding: 3, background: "var(--bg-2)", borderRadius: 999 }}>
          {(
            [
              ["7d", "7 días"],
              ["30d", "30 días"],
              ["all", "Histórico"],
            ] as const
          ).map(([key, label]) => {
            const active = range === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "6px 10px",
                  background: active ? "white" : "transparent",
                  border: "none",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--ink)" : "var(--muted)",
                  cursor: "pointer",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="col" style={{ gap: 4, opacity: boardLoading ? 0.6 : 1, transition: "opacity 0.15s" }}>
          {board.map((u, i) => {
            const isMe = u.id === currentUserId;
            const displayedXp =
              range === "all" ? u.xp : (u.periodXp ?? u.xp);
            return (
              <div
                key={u.id}
                className="row"
                style={{ padding: "8px 8px", borderRadius: 8, background: isMe ? "var(--bg-2)" : "transparent" }}
              >
                <span
                  style={{
                    width: 24,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: i < 3 ? "var(--accent)" : "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  #{u.rank ?? i + 1}
                </span>
                <div className="av" style={{ width: 28, height: 28, fontSize: 10 }}>
                  {initials(u.name)}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {u.name.split(" ")[0]} {u.name.split(" ")[1]?.[0]}.
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 9, padding: "2px 6px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4 }}
                >
                  Lv.{u.level}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", minWidth: 40, textAlign: "right" }}
                >
                  {displayedXp.toLocaleString("es-MX")}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Levels */}
      <Card style={{ padding: 20 }}>
        <h4 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>
          Niveles
        </h4>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
          Ganas puntos por aportar valor. Sube de nivel para desbloquear material y oportunidades.
        </p>
        <div className="col" style={{ gap: 6 }}>
          {NIVELES.map((lvl, idx) => {
            const isCurrent = idx === currentIdx;
            const isPast = idx < currentIdx;
            return (
              <div key={lvl.title} className="row" style={{ padding: "6px 0" }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, width: 36, color: isCurrent ? "var(--accent)" : "var(--muted)" }}
                >
                  Lv.{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isCurrent ? 600 : 500,
                    flex: 1,
                    color: isCurrent ? "var(--accent)" : isPast ? "var(--muted)" : "var(--ink)",
                  }}
                >
                  {lvl.title}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                  {formatPts(lvl.min)}
                </span>
                {isCurrent && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--accent)", marginLeft: 8 }}>
                    TÚ
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <ProgressBar value={progressPct} className="!mt-3" />
        <div className="row" style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
          <span>{userXp.toLocaleString("es-MX")} pts</span>
          <span style={{ marginLeft: "auto" }}>
            {nextRange
              ? `→ ${nextRange.title} en ${pointsToNext.toLocaleString("es-MX")} pts`
              : "Nivel máximo alcanzado"}
          </span>
        </div>
      </Card>

      {/* Events */}
      <Card style={{ padding: 20 }}>
        <h4 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>
          Próximos eventos
        </h4>
        <div className="col" style={{ gap: 10 }}>
          {events.map((e) => {
            const d = new Date(e.startsAt);
            const month = d.toLocaleString("es-MX", { month: "short" }).toUpperCase().replace(".", "");
            const day = d.toLocaleString("es-MX", { day: "2-digit" });
            const time = d.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" });
            return (
              <div
                key={e.id}
                className="row"
                style={{ padding: 10, background: "var(--bg-2)", borderRadius: 10, gap: 12 }}
              >
                <div
                  style={{
                    background: "var(--ink)",
                    color: "var(--bg)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    textAlign: "center",
                    minWidth: 44,
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, opacity: 0.7 }}>
                    {month}
                  </div>
                  <div className="serif" style={{ fontSize: 16, lineHeight: 1 }}>
                    {day}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {e.title}{" "}
                    {e.hot && <span style={{ color: "var(--red)", fontSize: 11 }}>● POPULAR</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {time} · {e.host}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upgrade */}
      <Card style={{ padding: 20, borderTop: "3px solid var(--accent)" }}>
        <Chip variant="accent">SUBE DE PLAN</Chip>
        <h4 className="serif" style={{ fontSize: 20, marginTop: 12, color: "var(--ink)", lineHeight: 1.2 }}>
          Acceso completo a la academia + mentorías.
        </h4>
        <Link href="/programas">
          <Button style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>Ver programas →</Button>
        </Link>
      </Card>
    </aside>
  );
}
