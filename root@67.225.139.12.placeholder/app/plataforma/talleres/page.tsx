import { redirect } from "next/navigation";
import { asc, gte, and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RsvpButton } from "@/app/comunidad/calendario/RsvpButton";

export const dynamic = "force-dynamic";

const WORKSHOP_KEYWORDS = ["taller", "live", "workshop", "demo", "mentoria", "mentoría"];

function isWorkshopLike(title: string, host: string | null, isLive: boolean, hot: boolean): boolean {
  if (isLive || hot) return true;
  const haystack = `${title} ${host ?? ""}`.toLowerCase();
  return WORKSHOP_KEYWORDS.some((k) => haystack.includes(k));
}

function formatCountdown(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "ahora";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `en ${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "mañana";
  if (days < 7) return `en ${days} días`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `en ${weeks} sem`;
  return target.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

export default async function TalleresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/talleres");

  const allUpcoming = await db
    .select()
    .from(schema.events)
    .where(gte(schema.events.startsAt, new Date()))
    .orderBy(asc(schema.events.startsAt))
    .limit(50);

  const filtered = allUpcoming.filter((e) => isWorkshopLike(e.title, e.host, e.isLive, e.hot));
  const events = filtered.length > 0 ? filtered : allUpcoming;

  const featured = events[0];
  const rest = events.slice(1);
  const now = new Date();

  // Which of these events the current user has already RSVP'd to.
  const eventIds = events.map((e) => e.id);
  const rsvps = eventIds.length
    ? await db
        .select({ eventId: schema.eventRsvps.eventId })
        .from(schema.eventRsvps)
        .where(
          and(
            eq(schema.eventRsvps.userId, user.id),
            inArray(schema.eventRsvps.eventId, eventIds),
          ),
        )
    : [];
  const rsvpSet = new Set(rsvps.map((r) => r.eventId));

  return (
    <AlumnoShell user={user} active="talleres">
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <Eyebrow>Plataforma</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Talleres en vivo
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              Sesiones prácticas semanales con Cristian y mentores. Construye, pregunta y publica el mismo día.
            </p>
          </div>

          {!featured && (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                SIN TALLERES PROGRAMADOS
              </div>
              <p style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
                Pronto anunciaremos las próximas sesiones. Activa tu newsletter para enterarte primero.
              </p>
            </Card>
          )}

          {featured && (
            <Card
              style={{
                padding: 0,
                overflow: "hidden",
                marginBottom: 32,
                borderColor: "var(--ink)",
                borderWidth: 2,
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, oklch(45% 0.15 252) 0%, oklch(28% 0.08 245) 100%)",
                  color: "white",
                  padding: "28px 32px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15), transparent 50%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    gap: 20,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                      <Chip
                        style={{ background: "rgba(255,255,255,0.18)", color: "white", borderColor: "transparent" }}
                      >
                        PRÓXIMO TALLER
                      </Chip>
                      {featured.isLive && (
                        <Chip variant="accent" pulse dot>
                          EN VIVO PRONTO
                        </Chip>
                      )}
                    </div>
                    <h2 className="serif" style={{ fontSize: 32, lineHeight: 1.1, color: "white" }}>
                      {featured.title}
                    </h2>
                    {featured.description && (
                      <p
                        style={{
                          marginTop: 10,
                          fontSize: 14,
                          color: "rgba(255,255,255,0.85)",
                          lineHeight: 1.5,
                          maxWidth: 540,
                        }}
                      >
                        {featured.description}
                      </p>
                    )}
                    <div
                      className="row"
                      style={{
                        gap: 14,
                        marginTop: 18,
                        flexWrap: "wrap",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {featured.host && (
                        <span className="mono">con {featured.host}</span>
                      )}
                      <span className="mono">·</span>
                      <span className="mono">
                        {new Date(featured.startsAt as Date).toLocaleString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="mono">· {featured.durationMinutes} min</span>
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: 180,
                    }}
                  >
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}
                    >
                      COMIENZA
                    </div>
                    <div className="serif" style={{ fontSize: 36, lineHeight: 1, marginTop: 6 }}>
                      {formatCountdown(new Date(featured.startsAt as Date), now)}
                    </div>
                    <div style={{ marginTop: 18 }}>
                      {featured.link ? (
                        <a
                          href={featured.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-warm btn-lg"
                          style={{ padding: "12px 22px" }}
                        >
                          Apuntarme →
                        </a>
                      ) : (
                        <RsvpButton eventId={featured.id} initialAttending={rsvpSet.has(featured.id)} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {rest.length > 0 && (
            <>
              <div className="between" style={{ marginBottom: 14, alignItems: "baseline" }}>
                <h3 className="serif" style={{ fontSize: 22 }}>
                  Próximos talleres
                </h3>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {rest.length} {rest.length === 1 ? "EVENTO" : "EVENTOS"}
                </span>
              </div>
              <div className="col" style={{ gap: 12 }}>
                {rest.map((e) => {
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
                  return (
                    <Card key={e.id} hover style={{ padding: 18 }}>
                      <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
                        <div
                          style={{
                            background: "var(--ink)",
                            color: "var(--bg)",
                            borderRadius: 12,
                            padding: "10px 14px",
                            textAlign: "center",
                            minWidth: 72,
                          }}
                        >
                          <div className="serif" style={{ fontSize: 28, lineHeight: 1 }}>
                            {day}
                          </div>
                          <div className="mono" style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                            {monthShort}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                            {e.isLive && (
                              <Chip variant="accent" dot pulse>
                                EN VIVO
                              </Chip>
                            )}
                            {e.hot && <Chip variant="warm">★ POPULAR</Chip>}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{e.title}</div>
                          <div
                            className="row"
                            style={{
                              gap: 10,
                              marginTop: 6,
                              flexWrap: "wrap",
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            <span className="mono">⏱ {time}</span>
                            <span className="mono">· {e.durationMinutes} min</span>
                            {e.host && <span className="mono">· {e.host}</span>}
                          </div>
                        </div>
                        <RsvpButton eventId={e.id} initialAttending={rsvpSet.has(e.id)} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
      </div>
    </AlumnoShell>
  );
}
