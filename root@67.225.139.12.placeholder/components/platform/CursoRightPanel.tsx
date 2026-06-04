import Link from "next/link";

export type NextMission = {
  lessonId: string;
  moduleCode: string;
  lessonCode: string;
  title: string;
  description: string | null;
  xpReward: number;
  estMinutes: number;
};

/**
 * Right-hand motivation panel for /plataforma/curso/[slug].
 * Five cards in sequence, all using assets from /sendero-pack/:
 *   1. Próxima misión (navy + gold CTA)
 *   2. Racha diaria (ring-streak-bg.svg with animated fill)
 *   3. Ranking semanal (mini trend chart)
 *   4. Meta de hoy (progress bar + badge-goal)
 *   5. Recompensa desbloqueable (chest-locked/unlocking/open)
 *
 * Numbers are real, passed from the server component — no mocks.
 */
export function CursoRightPanel({
  nextMission,
  streakDays,
  weeklyRank,
  weeklyTotal,
  weeklyTrend,
  dailyGoalTarget,
  dailyGoalDone,
  rewardTarget,
  rewardProgress,
}: {
  nextMission: NextMission | null;
  streakDays: number;
  weeklyRank: number;
  weeklyTotal: number;
  weeklyTrend: number[];
  dailyGoalTarget: number;
  dailyGoalDone: number;
  rewardTarget: number;
  rewardProgress: number;
}) {
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      <NextMissionCard mission={nextMission} />
      <StreakRingCard streakDays={streakDays} />
      <WeeklyRankCard rank={weeklyRank} total={weeklyTotal} trend={weeklyTrend} />
      <DailyGoalCard done={dailyGoalDone} target={dailyGoalTarget} />
      <RewardCard target={rewardTarget} progress={rewardProgress} />
    </aside>
  );
}

/* ───────────────── PRÓXIMA MISIÓN ───────────────── */
function NextMissionCard({ mission }: { mission: NextMission | null }) {
  if (!mission) {
    return (
      <div style={navyCardStyle}>
        <div className="mono" style={titleAccentStyle}>
          <img src="/sendero-pack/chests/chest-locked.svg" alt="" width={16} height={16} style={{ verticalAlign: "middle" }} />{" "}
          PRÓXIMA MISIÓN
        </div>
        <p style={{ fontSize: 14, marginTop: 12, color: "rgba(255,255,255,0.75)" }}>
          Has completado todo lo disponible. Espera al próximo módulo o repasa lo aprendido.
        </p>
      </div>
    );
  }
  return (
    <div style={navyCardStyle}>
      <div
        className="mono row"
        style={{
          ...titleAccentStyle,
          alignItems: "center",
          gap: 8,
        }}
      >
        <img
          src="/sendero-pack/chests/chest-unlocking.svg"
          alt=""
          width={22}
          height={22}
          style={{ filter: "drop-shadow(0 2px 6px rgba(216,168,63,0.5))" }}
        />
        PRÓXIMA MISIÓN
      </div>
      <div
        className="mono"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 14, letterSpacing: "0.06em" }}
      >
        {mission.moduleCode} · LECCIÓN {mission.lessonCode}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "white",
          marginTop: 6,
          lineHeight: 1.3,
          fontFamily: "var(--font-serif)",
        }}
      >
        {mission.title}
      </div>
      {mission.description && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {mission.description}
        </p>
      )}
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: "5px 9px",
            background: "rgba(216,168,63,0.18)",
            color: "var(--gold)",
            borderRadius: 6,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <img src="/sendero-pack/badges/badge-xp.svg" alt="" width={14} height={14} /> +{mission.xpReward} XP
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: "5px 9px",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          ⌚ {mission.estMinutes} min
        </span>
      </div>
      <Link
        href={`/plataforma/leccion/${mission.lessonId}`}
        style={{
          display: "block",
          marginTop: 14,
          padding: "12px 14px",
          textAlign: "center",
          background: "linear-gradient(180deg, #F2C65A 0%, #D8A83F 100%)",
          color: "var(--navy)",
          fontWeight: 800,
          fontSize: 14,
          borderRadius: 10,
          textDecoration: "none",
          boxShadow: "0 4px 0 #B88523, 0 8px 18px rgba(216,168,63,0.25)",
          letterSpacing: "0.01em",
        }}
      >
        Continuar misión →
      </Link>
    </div>
  );
}

/* ───────────────── RACHA DIARIA (RING) ───────────────── */
function StreakRingCard({ streakDays }: { streakDays: number }) {
  const goal = 7;
  const pct = Math.min(
    1,
    (streakDays % goal === 0 && streakDays > 0 ? goal : streakDays % goal) / goal,
  );
  // Match the dasharray length used inside the SVG asset (264).
  const total = 264;
  const dashoffset = total - total * pct;

  return (
    <div style={cardStyle}>
      <div className="row" style={{ gap: 14, alignItems: "center" }}>
        <div style={{ position: "relative", width: 78, height: 78, flexShrink: 0 }}>
          {/* Background ring track from the asset */}
          <img
            src="/sendero-pack/ui/ring-streak-bg.svg"
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: 0, width: 78, height: 78 }}
          />
          {/* Foreground animated fill drawn over it */}
          <svg width={78} height={78} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
            <circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              stroke="#D8A83F"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={total}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }}
            />
          </svg>
          <img
            src="/sendero-pack/badges/badge-streak.svg"
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 40,
              height: 40,
              filter: "drop-shadow(0 2px 4px rgba(216,168,63,0.4))",
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={titleStyle}>
            🔥 RACHA DIARIA
          </div>
          <div
            className="serif"
            style={{
              fontSize: 28,
              color: "var(--navy)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {streakDays}{" "}
            <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>días</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--gold-deep)", marginTop: 2, fontWeight: 600 }}>
            ¡Sigue así! 🔥
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── RANKING SEMANAL ───────────────── */
function WeeklyRankCard({
  rank,
  total,
  trend,
}: {
  rank: number;
  total: number;
  trend: number[];
}) {
  const max = Math.max(1, ...trend);
  const w = 96;
  const h = 40;
  const step = trend.length > 1 ? w / (trend.length - 1) : w;
  const pts = trend
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`)
    .join(" ");

  return (
    <div style={cardStyle}>
      <div className="between">
        <div>
          <div className="mono" style={{ ...titleStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <img src="/sendero-pack/badges/badge-rank.svg" alt="" width={14} height={14} />
            RANKING SEMANAL
          </div>
          <div
            className="serif"
            style={{
              fontSize: 28,
              color: "var(--navy)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            #{rank}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Entre {total.toLocaleString("es-MX")} estudiantes
          </div>
        </div>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 4 }}>
          <defs>
            <linearGradient id="rankLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2BB8A7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#2BB8A7" stopOpacity={1} />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#rankLine)"
            strokeWidth={2.5}
            points={pts}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {trend.length > 0 && (
            <circle
              cx={(trend.length - 1) * step}
              cy={h - (trend[trend.length - 1]! / max) * (h - 6) - 3}
              r={3.5}
              fill="#2BB8A7"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

/* ───────────────── META DE HOY ───────────────── */
function DailyGoalCard({ done, target }: { done: number; target: number }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  const reached = done >= target;
  return (
    <div style={cardStyle}>
      <div className="between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ ...titleStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <img src="/sendero-pack/badges/badge-goal.svg" alt="" width={14} height={14} />
            META DE HOY
          </div>
          <div
            className="serif"
            style={{
              fontSize: 24,
              color: "var(--navy)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {done}{" "}
            <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
              / {target} lecciones
            </span>
          </div>
        </div>
        <img
          src={reached ? "/sendero-pack/chests/chest-open.svg" : "/sendero-pack/chests/chest-locked.svg"}
          alt=""
          aria-hidden
          width={44}
          height={44}
          style={{ filter: reached ? "drop-shadow(0 2px 6px rgba(216,168,63,0.5))" : undefined }}
        />
      </div>
      <div
        style={{
          marginTop: 12,
          height: 8,
          borderRadius: 999,
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: reached
              ? "linear-gradient(90deg, #2da064, #35B779)"
              : "linear-gradient(90deg, #D8A83F, #F2C65A)",
            transition: "width 0.4s",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        {reached
          ? "¡Meta lograda! 🎉"
          : `Falta ${Math.max(1, target - done)} ${target - done === 1 ? "lección" : "lecciones"} para tu meta`}
      </div>
    </div>
  );
}

/* ───────────────── RECOMPENSA DESBLOQUEABLE ───────────────── */
function RewardCard({ target, progress }: { target: number; progress: number }) {
  const pct = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));
  const unlocked = progress >= target;
  const chestSrc = unlocked
    ? "/sendero-pack/chests/chest-open.svg"
    : progress > 0
      ? "/sendero-pack/chests/chest-unlocking.svg"
      : "/sendero-pack/chests/chest-locked.svg";
  return (
    <div
      style={{
        ...cardStyle,
        background:
          "linear-gradient(180deg, #FFFDF8 0%, color-mix(in srgb, #E89B3D 10%, white) 100%)",
        borderColor: "rgba(232,155,61,0.34)",
      }}
    >
      <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
        <img
          src={chestSrc}
          alt=""
          aria-hidden
          width={64}
          height={64}
          style={{
            filter: unlocked
              ? "drop-shadow(0 6px 16px rgba(216,168,63,0.55))"
              : progress > 0
                ? "drop-shadow(0 4px 10px rgba(216,168,63,0.4))"
                : "drop-shadow(0 3px 8px rgba(10,30,58,0.18))",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ ...titleStyle, color: "#B88523" }}>
            ★ RECOMPENSA DESBLOQUEABLE
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
            Completa {target} lecciones hoy
          </div>
          <div
            style={{
              marginTop: 10,
              height: 6,
              borderRadius: 999,
              background: "rgba(232,155,61,0.16)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #E89B3D, #F2C65A)",
                transition: "width 0.4s",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 5,
              fontFamily: "var(--font-mono)",
            }}
          >
            {progress} / {target}
            {unlocked ? " · DESBLOQUEADA" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Styles ───────────────── */
const cardStyle: React.CSSProperties = {
  background: "#FFFDF8",
  border: "1px solid rgba(10,30,58,0.06)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 6px 16px rgba(10,30,58,0.04)",
};

const navyCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "linear-gradient(165deg, #0B2548 0%, #061B36 100%)",
  color: "white",
  boxShadow: "0 14px 30px rgba(6,27,54,0.22)",
  border: "1px solid rgba(216,168,63,0.20)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--muted)",
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const titleAccentStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--gold)",
  letterSpacing: "0.1em",
  fontWeight: 700,
};
