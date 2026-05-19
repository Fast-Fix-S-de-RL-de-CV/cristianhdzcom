import { redirect } from "next/navigation";
import { asc, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CalendarToolbar } from "./CalendarToolbar";
import { RsvpButton } from "./RsvpButton";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function CalendarioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidad/calendario");

  const events = await db
    .select()
    .from(schema.events)
    .where(gte(schema.events.startsAt, new Date()))
    .orderBy(asc(schema.events.startsAt))
    .limit(50);

  // Group events by year-month
  const groups = new Map<
    string,
    { label: string; year: number; month: number; items: (typeof events)[number][] }
  >();
  for (const ev of events) {
    const d = new Date(ev.startsAt as Date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        items: [],
      });
    }
    groups.get(key)!.items.push(ev);
  }

  const groupArr = Array.from(groups.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );

  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  return (
    <div className="plat">
      <PlatformSidebar activeHref="/comunidad/calendario" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            className="between"
            style={{ marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}
          >
            <div>
              <Eyebrow>Comunidad</Eyebrow>
              <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
                Calendario
              </h1>
              <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
                Talleres en vivo, demo days, mentorías y eventos especiales.
              </p>
            </div>
            <CalendarToolbar />
          </div>

          {groupArr.length === 0 && (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                NO HAY EVENTOS PRÓXIMOS
              </div>
              <p style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
                Pronto anunciaremos nuevos talleres y demo days.
              </p>
            </Card>
          )}

          <div className="col" style={{ gap: 36 }}>
            {groupArr.map((g) => (
              <section key={`${g.year}-${g.month}`}>
                <div
                  className="between"
                  style={{ marginBottom: 14, alignItems: "baseline" }}
                >
                  <h2 className="serif" style={{ fontSize: 24 }}>
                    {g.label}
                  </h2>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {g.items.length} {g.items.length === 1 ? "EVENTO" : "EVENTOS"}
                  </span>
                </div>
                <div className="col" style={{ gap: 12 }}>
                  {g.items.map((e) => {
                    const d = new Date(e.startsAt as Date);
                    const day = d.toLocaleString("es-MX", { day: "2-digit" });
                    const monthShort = d
                      .toLocaleString("es-MX", { month: "short" })
                      .replace(".", "")
                      .toUpperCase();
                    const time = d.toLocaleString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const startsSoon = e.isLive && d.getTime() - now < ONE_HOUR_MS;
                    return (
                      <Card key={e.id} hover style={{ padding: 18 }}>
                        <div
                          className="row"
                          style={{
                            gap: 18,
                            alignItems: "stretch",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              background: e.hot ? "var(--accent)" : "var(--ink)",
                              color: "var(--bg)",
                              borderRadius: 12,
                              padding: "10px 14px",
                              textAlign: "center",
                              minWidth: 72,
                            }}
                          >
                            <div
                              className="serif"
                              style={{ fontSize: 32, lineHeight: 1, fontWeight: 600 }}
                            >
                              {day}
                            </div>
                            <div
                              className="mono"
                              style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}
                            >
                              {monthShort}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div
                              className="row"
                              style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}
                            >
                              {e.isLive && (
                                <Chip variant="accent" dot pulse>
                                  EN VIVO
                                </Chip>
                              )}
                              {e.hot && <Chip variant="warm">★ POPULAR</Chip>}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>{e.title}</div>
                            {e.description && (
                              <p
                                style={{
                                  fontSize: 13,
                                  color: "var(--muted)",
                                  marginTop: 6,
                                  lineHeight: 1.5,
                                }}
                              >
                                {e.description}
                              </p>
                            )}
                            <div
                              className="row"
                              style={{
                                gap: 12,
                                marginTop: 10,
                                flexWrap: "wrap",
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              <span className="mono">⏱ {time}</span>
                              <span className="mono">· {e.durationMinutes} min</span>
                              {e.host && <span className="mono">· {e.host}</span>}
                              {e.attending > 0 && (
                                <span className="mono">· {e.attending} asisten</span>
                              )}
                            </div>
                          </div>
                          <div
                            className="col"
                            style={{
                              justifyContent: "center",
                              gap: 8,
                              alignItems: "flex-end",
                            }}
                          >
                            {startsSoon && e.link ? (
                              <a
                                href={e.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-warm"
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                Unirme ahora →
                              </a>
                            ) : (
                              <RsvpButton eventId={e.id} />
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
