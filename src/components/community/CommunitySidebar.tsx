"use client";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { initials } from "@/lib/utils";
import Link from "next/link";

export function CommunitySidebar({
  leaderboard,
  currentUserId,
  events,
}: {
  leaderboard: { id: string; name: string; level: number; xp: number }[];
  currentUserId?: string;
  events: { id: string; title: string; host: string | null; startsAt: string; hot?: boolean | null }[];
}) {
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
                2.8k
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                MIEMBROS
              </div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 22, color: "var(--green)" }}>
                184
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                EN LÍNEA
              </div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 22 }}>
                14
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>
                PAÍSES
              </div>
            </div>
          </div>
          <div className="rule" style={{ margin: "16px 0" }} />
          <div className="col" style={{ gap: 8, fontSize: 13 }}>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Acceso a 4 talleres gratis al mes
            </div>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Discord privado · 7 canales
            </div>
            <div className="row">
              <span style={{ color: "var(--muted)" }}>✦</span> Demo days mensuales
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
          <span className="mono" style={{ fontSize: 10, color: "var(--accent)" }}>
            VER TODO →
          </span>
        </div>
        <div className="row" style={{ gap: 4, marginBottom: 14, padding: 3, background: "var(--bg-2)", borderRadius: 999 }}>
          {["7 días", "30 días", "Histórico"].map((l, i) => (
            <div
              key={l}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 10px",
                background: i === 0 ? "white" : "transparent",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: i === 0 ? 600 : 500,
                color: i === 0 ? "var(--ink)" : "var(--muted)",
                cursor: "pointer",
                boxShadow: i === 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="col" style={{ gap: 4 }}>
          {leaderboard.map((u, i) => {
            const isMe = u.id === currentUserId;
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
                  #{i + 1}
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
                  {u.xp.toLocaleString("es-MX")}
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
          {[
            [1, "Curioso", "0 pts", "✓"],
            [3, "Constructor", "500 pts", "✓"],
            [5, "Operador", "2k pts", "←"],
            [7, "Senior", "5k pts", ""],
            [9, "Maestro", "20k pts", ""],
          ].map(([lvl, name, pts, mark]) => {
            const m = String(mark);
            return (
              <div key={String(lvl)} className="row" style={{ padding: "6px 0" }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, width: 36, color: m === "←" ? "var(--accent)" : "var(--muted)" }}
                >
                  Lv.{String(lvl)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: m === "←" ? 600 : 500,
                    flex: 1,
                    color: m === "←" ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {String(name)}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                  {String(pts)}
                </span>
                {m === "←" && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--accent)", marginLeft: 8 }}>
                    TÚ
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <ProgressBar value={64} className="!mt-3" />
        <div className="row" style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
          <span>1.840 pts</span>
          <span style={{ marginLeft: "auto" }}>→ Lv.5 en 160 pts</span>
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
