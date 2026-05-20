import { redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { asc, eq, gte } from "drizzle-orm";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { getCurrentUser } from "@/lib/auth";
import { PlatformPath } from "@/components/platform/PlatformPath";
import { CopilotoPanel } from "@/components/platform/CopilotoPanel";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";

export const dynamic = "force-dynamic";

type ModuleState = "done" | "current" | "in_progress" | "locked";

const WEEKDAY_LABEL: Record<number, string> = {
  0: "DOM",
  1: "LUN",
  2: "MAR",
  3: "MIÉ",
  4: "JUE",
  5: "VIE",
  6: "SÁB",
};

export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma");

  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.slug, "programacion-con-ia"))
    .limit(1);
  if (!program) return <div>Programa no disponible</div>;

  const mods = await db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.programId, program.id))
    .orderBy(asc(schema.modules.sortOrder));

  const progress = await db
    .select()
    .from(schema.moduleProgress)
    .where(eq(schema.moduleProgress.userId, user.id));

  const progressMap = new Map(progress.map((p) => [p.moduleId, p.state as ModuleState]));

  // Current module = explicit "current"/"in_progress", or fallback to first non-done.
  const currentMod =
    mods.find((m) => {
      const s = progressMap.get(m.id);
      return s === "current" || s === "in_progress";
    }) ?? mods.find((m) => progressMap.get(m.id) !== "done");

  let firstLessonId: string | undefined;
  if (currentMod) {
    const [lesson] = await db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(eq(schema.lessons.moduleId, currentMod.id))
      .orderBy(asc(schema.lessons.sortOrder))
      .limit(1);
    firstLessonId = lesson?.id;
  }

  const doneCount = Array.from(progressMap.values()).filter((s) => s === "done").length;

  // Upcoming events from DB
  const upcoming = await db
    .select()
    .from(schema.events)
    .where(gte(schema.events.startsAt, new Date()))
    .orderBy(asc(schema.events.startsAt))
    .limit(3);

  const today = new Date();
  const eyebrow = `CARRIL · ${program.title.toUpperCase()}`;

  const rightAside = (
    <>
      <CopilotoPanel />

      <div>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="eyebrow">Próximos eventos</span>
          <Link
            href="/comunidad/calendario"
            className="mono"
            style={{ fontSize: 11, color: "var(--muted)" }}
          >
            VER TODO
          </Link>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {upcoming.length === 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                Sin eventos próximos
              </div>
            </div>
          )}
          {upcoming.map((e) => {
            const d = new Date(e.startsAt);
            const monthLabel = format(d, "LLL", { locale: es }).toUpperCase().slice(0, 3);
            const dayNumber = format(d, "dd");
            const time = format(d, "HH:mm");
            const dayLabel = isSameDay(d, today) ? "HOY" : WEEKDAY_LABEL[d.getDay()];
            const inner = (
              <div
                className="card"
                style={{
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: "var(--ink)",
                    color: "var(--bg)",
                    borderRadius: 8,
                    padding: 6,
                    textAlign: "center",
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, opacity: 0.7 }}>
                    {monthLabel}
                  </div>
                  <div className="serif" style={{ fontSize: 16, lineHeight: 1 }}>
                    {dayNumber}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {dayLabel} · {time}
                  </div>
                </div>
                <span style={{ color: "var(--accent)" }}>→</span>
              </div>
            );
            return e.link ? (
              <Link
                key={e.id}
                href={e.link}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {inner}
              </Link>
            ) : (
              <div key={e.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <AlumnoShell user={user} active="sendero" rightAside={rightAside}>
      <div className="between" style={{ marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
            {currentMod?.weekLabel || "Tu sendero"} — {currentMod?.title || "Empieza"}
          </h2>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="streak">{user.streakDays} días</span>
          <span className="chip chip-gold mono">XP · {user.xp.toLocaleString("es-MX")}</span>
          <div className="av">
            {user.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
        </div>
      </div>

        <div
          className="card"
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            PROGRESO
          </span>
          <div className="bar" style={{ flex: 1, minWidth: 200 }}>
            <i style={{ width: `${(doneCount / Math.max(mods.length, 1)) * 100}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12 }}>
            {doneCount} / {mods.length} módulos
          </span>
        </div>

        <PlatformPath
          modules={mods.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.title,
            isBig: m.isBig,
            xpReward: m.xpReward,
            state: (progressMap.get(m.id) as ModuleState) || "locked",
          }))}
          firstLessonId={firstLessonId}
        />
    </AlumnoShell>
  );
}
