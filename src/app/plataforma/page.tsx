import { redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { PlatformPath } from "@/components/platform/PlatformPath";

export const dynamic = "force-dynamic";

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

  const progressMap = new Map(progress.map((p) => [p.moduleId, p.state]));

  // Get first lesson of current module for "Continuar" link
  const currentMod = mods.find((m) => progressMap.get(m.id) === "current");
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

  return (
    <div className="plat">
      {/* SIDEBAR */}
      <aside className="plat-side">
        <Link href="/" className="ch-logo" style={{ fontSize: 20 }}>
          <span className="ch-logo-mark" style={{ width: 24, height: 24, fontSize: 14 }}>
            C
          </span>
          <span>CH · IA</span>
        </Link>
        <div className="col" style={{ gap: 4 }}>
          <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
            Aprender
          </div>
          <div className="nav-item active">
            <span>◎</span> Mi sendero
          </div>
          <div className="nav-item">
            <span>✦</span> Talleres en vivo
          </div>
          <div className="nav-item">
            <span>≡</span> Biblioteca
          </div>
          <div className="nav-item">
            <span>◇</span> Proyectos
          </div>
        </div>
        <div className="col" style={{ gap: 4 }}>
          <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
            Comunidad
          </div>
          <Link href="/comunidad" className="nav-item">
            <span>○</span> Feed
          </Link>
          <Link href="/comunidad/calendario" className="nav-item">
            <span>○</span> Eventos
          </Link>
          <Link href="/comunidad/ranking" className="nav-item">
            <span>○</span> Ranking
          </Link>
        </div>
        <div className="col" style={{ gap: 4, marginTop: "auto" }}>
          <Link href="/cuenta" className="nav-item">
            <span>⌂</span> Mi cuenta
          </Link>
          <div className="card" style={{ padding: 14, background: "var(--bg-2)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              SIGUIENTE COHORTE
            </div>
            <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>
              04 Mar
            </div>
            <Link href="/programas">
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "8px 12px", fontSize: 12 }}
              >
                Ver programas
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="plat-main">
        <div className="between" style={{ marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="eyebrow">CARRIL · A · PROGRAMACIÓN CON IA</div>
            <h2 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              {currentMod?.weekLabel || "Tu sendero"} — {currentMod?.title || "Empieza"}
            </h2>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <span className="streak">{user.streakDays} días</span>
            <span className="chip chip-accent mono">XP · {user.xp.toLocaleString("es-MX")}</span>
            <div className="av">
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, marginBottom: 40, flexWrap: "wrap" }}>
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
            state: (progressMap.get(m.id) as "done" | "current" | "locked") || "locked",
          }))}
          firstLessonId={firstLessonId}
        />
      </main>

      {/* ASIDE */}
      <aside className="plat-aside">
        <div className="card" style={{ padding: 16, background: "var(--bg-2)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="ia-tag">Copiloto CH</div>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              SIEMPRE ON
            </span>
          </div>
          <p style={{ fontSize: 14, marginTop: 14, lineHeight: 1.45 }}>
            <strong>Hola {user.name.split(" ")[0]} —</strong> noté que llevas {doneCount} módulos completos. Si querés, te
            armo un repaso de 8 minutos antes del próximo.
          </p>
          {firstLessonId && (
            <Link href={`/plataforma/leccion/${firstLessonId}`}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 12, padding: "8px 12px", fontSize: 12 }}
              >
                Continuar lección
              </button>
            </Link>
          )}
        </div>

        <div>
          <div className="between" style={{ marginBottom: 12 }}>
            <span className="eyebrow">Próximos eventos</span>
            <Link href="/comunidad/calendario" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              VER TODO
            </Link>
          </div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { d: "HOY", t: "Live · APIs con IA", tm: "19:00", dno: "04" },
              { d: "JUE", t: "Taller: SaaS sin código", tm: "20:00", dno: "06" },
              { d: "SÁB", t: "Demo Day · Cohorte 03", tm: "11:00", dno: "08" },
            ].map((e, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: 12, display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, alignItems: "center" }}
              >
                <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 8, padding: 6, textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 9, opacity: 0.7 }}>
                    MAR
                  </div>
                  <div className="serif" style={{ fontSize: 16, lineHeight: 1 }}>
                    {e.dno}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {e.d} · {e.tm}
                  </div>
                </div>
                <span style={{ color: "var(--accent)" }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
