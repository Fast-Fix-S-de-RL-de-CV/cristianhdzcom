import Link from "next/link";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { getActiveMembership, getCreditBalance } from "@/lib/membership";
import { MembershipManageClient } from "./MembershipManageClient";

export const dynamic = "force-dynamic";

export default async function MembresiaCuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cuenta/membresia");

  const active = await getActiveMembership(user.id);
  const credit = await getCreditBalance(user.id);

  // Si tiene membresía, cargar el plan para mostrar beneficios
  const plan = active
    ? (
        await db
          .select()
          .from(schema.membershipPlans)
          .where(eq(schema.membershipPlans.slug, active.planSlug))
          .limit(1)
      )[0] ?? null
    : null;

  // Historial de pagos relacionados a membresías
  const history = await db
    .select({
      id: schema.orders.id,
      total: schema.orders.totalCents,
      createdAt: schema.orders.createdAt,
      metadata: schema.orders.metadata,
    })
    .from(schema.orders)
    .where(eq(schema.orders.userId, user.id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(20);
  const membershipPayments = history.filter(
    (h) => (h.metadata as { kind?: string })?.kind === "membership",
  );

  return (
    <AlumnoShell user={user} active="cuenta">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link
          href="/cuenta"
          className="mono"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}
        >
          ← MI CUENTA
        </Link>

        <div style={{ marginTop: 16, marginBottom: 32 }}>
          <Eyebrow>Membresía recurrente</Eyebrow>
          <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
            Mi membresía
          </h1>
        </div>

        {/* Sin membresía → CTA */}
        {!active && (
          <Card style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
            <h2 className="serif" style={{ fontSize: 28, marginBottom: 12 }}>
              Aún no eres miembro recurrente
            </h2>
            <p style={{ color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.6 }}>
              Únete a la comunidad activa. El 50% de cada pago se acumula como crédito aplicable a
              cualquier curso o consultoría.
            </p>
            <Link href="/membresia">
              <Button size="lg">Ver planes →</Button>
            </Link>
          </Card>
        )}

        {/* Con membresía → gestión */}
        {active && plan && (
          <>
            <Card style={{ padding: 28, marginBottom: 20, position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  fontSize: 220,
                  opacity: 0.04,
                  lineHeight: 1,
                  transform: "translateY(-20px)",
                }}
              >
                {plan.emoji}
              </div>
              <div className="row" style={{ alignItems: "center", gap: 14, marginBottom: 18, position: "relative" }}>
                <span style={{ fontSize: 36 }}>{plan.emoji}</span>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
                    PLAN ACTIVO
                  </div>
                  <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 2 }}>
                    {plan.label}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                    {active.billingCycle === "yearly" ? "ANUAL" : "MENSUAL"}
                  </div>
                  <div className="serif" style={{ fontSize: 28 }}>
                    ${active.priceUsd}
                  </div>
                </div>
              </div>

              <div className="membresia-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative" }}>
                <div
                  style={{
                    padding: 14,
                    background: "var(--bg-2)",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>
                    PRÓXIMA RENOVACIÓN
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                    {active.currentPeriodEnd.toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  {active.cancelAtPeriodEnd && (
                    <div className="mono" style={{ fontSize: 10, color: "var(--red)", marginTop: 4, fontWeight: 700 }}>
                      CANCELADA · NO RENUEVA
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: 14,
                    background: "color-mix(in srgb, var(--green-soft) 50%, white)",
                    borderRadius: 10,
                    border: "1px solid var(--green-soft)",
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>
                    CRÉDITO ACUMULADO
                  </div>
                  <div className="serif" style={{ fontSize: 22, marginTop: 4, color: "var(--green-strong)" }}>
                    ${Math.round(credit.balanceCents / 100)}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                    APLICABLE A CUALQUIER COMPRA
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <MembershipManageClient
                  cancelAtPeriodEnd={active.cancelAtPeriodEnd}
                  accessUntil={active.currentPeriodEnd.toISOString()}
                />
              </div>
            </Card>

            {/* Lista de beneficios */}
            <Card style={{ padding: 28, marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 22, marginBottom: 4 }}>
                Tus beneficios activos
              </h2>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 18 }}>
                INCLUIDO EN TU PLAN {plan.label.toUpperCase()}
              </div>
              <div className="col" style={{ gap: 12 }}>
                {plan.bullets.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                    <span style={{ color: "var(--ink-2)" }}>{b}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Historial de pagos */}
            {membershipPayments.length > 0 && (
              <Card style={{ padding: 28 }}>
                <h2 className="serif" style={{ fontSize: 22, marginBottom: 18 }}>
                  Pagos recientes
                </h2>
                <div className="col" style={{ gap: 10 }}>
                  {membershipPayments.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="row"
                      style={{
                        padding: "12px 14px",
                        background: "var(--bg-2)",
                        borderRadius: 8,
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {(p.metadata as { planLabel?: string }).planLabel ?? "Membresía"}{" "}
                          {(p.metadata as { billingCycle?: string }).billingCycle === "yearly" ? "anual" : "mensual"}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          {p.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
                        ${Math.round(p.total / 100)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AlumnoShell>
  );
}
