import Link from "next/link";
import { ModuleSvgIcon } from "./ModuleIcon";

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
 * Composes 5 cards: Próxima misión (CTA), Racha (ring), Ranking semanal,
 * Meta de hoy (progress bar), Recompensa desbloqueable.
 *
 * All data is real — passed in from the server component. No mocks.
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
  weeklyTrend: number[]; // 6-8 values for mini chart
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
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: "var(--navy)",
          color: "white",
        }}
      >
        <div
          className="mono"
          style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.1em", fontWeight: 700 }}
        >
          ◎ PRÓXIMA MISIÓN
        </div>
        <p style={{ fontSize: 14, marginTop: 12, color: "rgba(255,255,255,0.75)" }}>
          Has completado todo lo disponible. Espera al próximo módulo o repasa lo aprendido.
        </p>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        background: "linear-gradient(165deg, #0B2548 0%, #061B36 100%)",
        color: "white",
        boxShadow: "0 14px 30px rgba(10,30,58,0.18)",
        border: "1px solid rgba(216,168,63,0.18)",
      }}
    >
      <div
        className="mono row"
        style={{
          fontSize: 10,
          color: "var(--gold)",
          letterSpacing: "0.1em",
          fontWeight: 700,
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13 }}>◎</span> PRÓXIMA MISIÓN
      </div>
      <div
        className="mono"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 12 }}
      >
        {mission.moduleCode} · LECCIÓN {mission.lessonCode}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "white",
          marginTop: 6,
          lineHeight: 1.3,
        }}
      >
        {mission.title}
      </div>
      {mission.description && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {mission.description}
        </p>
      )}
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: "4px 8px",
            background: "rgba(216,168,63,0.18)",
            color: "var(--gold)",
            borderRadius: 6,
            fontWeight: 700,
          }}
        >
          ★ +{mission.xpReward} XP
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: "4px 8px",
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
          boxShadow: "0 4px 0 #B88523",
        }}
      >
        Continuar misión →
      </Link>
    </div>
  );
}

/* ───────────────── RACHA DIARIA (RING) ───────────────── */
function StreakRingCard({ streakDays }: { streakDays: number }) {
  // Ring fills toward 7-day mark, then wraps continuously.
  const goal = 7;
  const pct = Math.min(1, (streakDays % goal === 0 && streakDays > 0 ? goal : streakDays % goal) / goal);
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div style={cardStyle}>
      <div className="row" style={{ gap: 14, alignItems: "center" }}>
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx={36} cy={36} r={radius} stroke="rgba(216,168,63,0.16)" strokeWidth={6} fill="none" />
            <circle
              cx={36}
              cy={36}
              r={radius}
              stroke="#D8A83F"
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
            aria-hidden
          >
            🔥
          </div>
        </div>
        <div>
          <div className="mono" style={titleStyle}>🔥 RACHA DIARIA</div>
          <div
            className="serif"
            style={{ fontSize: 28, color: "var(--navy)", fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}
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
  const w = 90;
  const h = 36;
  const step = trend.length > 1 ? w / (trend.length - 1) : w;
  const pts = trend
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");

  return (
    <div style={cardStyle}>
      <div className="between">
        <div>
          <div className="mono" style={titleStyle}>🏆 RANKING SEMANAL</div>
          <div
            className="serif"
            style={{ fontSize: 28, color: "var(--navy)", fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}
          >
            #{rank}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Entre {total.toLocaleString("es-MX")} estudiantes
          </div>
        </div>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 4 }}>
          <polyline fill="none" stroke="#2BB8A7" strokeWidth={2} points={pts} strokeLinejoin="round" strokeLinecap="round" />
          {trend.length > 0 && (
            <circle
              cx={(trend.length - 1) * step}
              cy={h - (trend[trend.length - 1]! / max) * (h - 4) - 2}
              r={3}
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
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={titleStyle}>◎ META DE HOY</div>
          <div
            className="serif"
            style={{ fontSize: 24, color: "var(--navy)", fontWeight: 700, lineHeight: 1.1, marginTop: 4 }}
          >
            {done}{" "}
            <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
              / {target} lecciones
            </span>
          </div>
        </div>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: reached ? "#35B779" : "var(--bg-2)",
            color: reached ? "white" : "var(--gold-deep)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🎁
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
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
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
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
  return (
    <div
      style={{
        ...cardStyle,
        background:
          "linear-gradient(180deg, #FFFDF8 0%, color-mix(in srgb, #E89B3D 8%, white) 100%)",
        borderColor: "rgba(232,155,61,0.30)",
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: unlocked
              ? "linear-gradient(160deg, #F2C65A, #E89B3D)"
              : "linear-gradient(160deg, rgba(232,155,61,0.18), rgba(216,168,63,0.10))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ModuleSvgIcon kind="chest" size={28} color={unlocked ? "white" : "#B88523"} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ ...titleStyle, color: "#B88523" }}>
            ★ RECOMPENSA DESBLOQUEABLE
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
            Completa {target} lecciones hoy
          </div>
          <div
            style={{
              marginTop: 8,
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
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {progress} / {target}
            {unlocked ? " · DESBLOQUEADA" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#FFFDF8",
  border: "1px solid rgba(10,30,58,0.06)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 6px 16px rgba(10,30,58,0.04)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--muted)",
  letterSpacing: "0.1em",
  fontWeight: 700,
};
