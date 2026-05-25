import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function MembresiasAdminPage() {
  const user = (await getCurrentUser())!;

  // 1. Stats por plan
  const plans = await db
    .select()
    .from(schema.membershipPlans)
    .orderBy(schema.membershipPlans.sortOrder);

  // 2. MRR calculation: suma de price_usd de membresías activas (monthly normalized)
  const [mrrRow] = await db
    .select({
      mrrCents: sql<number>`coalesce(sum(
        case
          when ${schema.memberships.billingCycle} = 'yearly' then ${schema.memberships.priceUsd} * 100 / 12
          else ${schema.memberships.priceUsd} * 100
        end
      ), 0)::int`,
      activeCount: sql<number>`count(*)::int`,
    })
    .from(schema.memberships)
    .where(eq(schema.memberships.status, "active"));

  const mrrUsd = Math.round(Number(mrrRow.mrrCents) / 100);
  const arrUsd = mrrUsd * 12;

  // 3. Subs recientes
  const recent = await db
    .select({
      id: schema.memberships.id,
      userId: schema.memberships.userId,
      userName: schema.users.name,
      userEmail: schema.users.email,
      planSlug: schema.memberships.planSlug,
      billingCycle: schema.memberships.billingCycle,
      priceUsd: schema.memberships.priceUsd,
      status: schema.memberships.status,
      cancelAtPeriodEnd: schema.memberships.cancelAtPeriodEnd,
      currentPeriodEnd: schema.memberships.currentPeriodEnd,
      startedAt: schema.memberships.startedAt,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .orderBy(desc(schema.memberships.startedAt))
    .limit(50);

  return (
    <AdminPageShell
      user={user}
      active="/admin/membresias"
      title="Membresías"
      subtitle={`MRR $${mrrUsd.toLocaleString("es-MX")} · ARR $${arrUsd.toLocaleString("es-MX")} · ${mrrRow.activeCount} miembros activos`}
    >
      {/* KPI cards */}
      <div className="grid-4 admin-kpi-grid" style={{ gap: 14, marginBottom: 20 }}>
        <KpiCard label="MRR" value={`$${mrrUsd.toLocaleString("es-MX")}`} sub="Recurrente mensual" />
        <KpiCard label="ARR" value={`$${arrUsd.toLocaleString("es-MX")}`} sub="Proyección anual" />
        <KpiCard label="ACTIVOS" value={String(mrrRow.activeCount)} sub="Suscripciones activas" />
        <KpiCard label="CHURN 30D" value="0%" sub="Pendiente conexión" />
      </div>

      {/* Planes */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em" }}>
            PLANES DEL CATÁLOGO
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          {plans.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: 22,
                borderRight: i < plans.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ fontSize: 26 }}>{p.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{p.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
                <span className="serif" style={{ fontSize: 28 }}>${p.priceUsdMonthly}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>/mes</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, letterSpacing: "0.04em" }}>
                {p.discountPercent}% DTO · {p.creditAccrualPercent}% CRÉDITO
              </div>
              <div className="mono" style={{ fontSize: 11, marginTop: 4, color: p.activeMembers === (p.maxSeats ?? Infinity) ? "var(--red)" : "var(--ink-2)" }}>
                {p.maxSeats != null
                  ? `${p.activeMembers}/${p.maxSeats} cupos`
                  : `${p.activeMembers} miembros`}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Lista de suscripciones */}
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
          <span style={{ flex: 1 }}>Miembro</span>
          <span style={{ width: 80 }}>Plan</span>
          <span style={{ width: 80 }}>Ciclo</span>
          <span style={{ width: 70, textAlign: "right" }}>$</span>
          <span style={{ width: 110, textAlign: "right" }}>Próximo cobro</span>
          <span style={{ width: 100 }}>Estado</span>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            Aún no hay suscripciones. Comparte <code>/membresia</code> en tu newsletter.
          </div>
        ) : (
          recent.map((m) => {
            const plan = plans.find((p) => p.slug === m.planSlug);
            return (
              <div
                key={m.id}
                className="row"
                style={{ padding: "12px 24px", borderBottom: "1px solid var(--line)", background: "white" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.userName}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    {m.userEmail}
                  </div>
                </div>
                <span style={{ width: 80, fontSize: 13 }}>
                  {plan?.emoji} {plan?.label}
                </span>
                <span className="mono" style={{ width: 80, fontSize: 11, color: "var(--ink-2)" }}>
                  {m.billingCycle === "yearly" ? "ANUAL" : "MENSUAL"}
                </span>
                <span className="mono" style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  ${m.priceUsd}
                </span>
                <span className="mono" style={{ width: 110, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                  {m.currentPeriodEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </span>
                <span style={{ width: 100 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: m.cancelAtPeriodEnd ? "var(--bg-3)" : "var(--green-soft)",
                      color: m.cancelAtPeriodEnd ? "var(--red)" : "var(--green-strong)",
                      fontWeight: 700,
                    }}
                  >
                    {m.cancelAtPeriodEnd ? "CANCELADA" : m.status.toUpperCase()}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </Card>
    </AdminPageShell>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={{ padding: 18 }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: 30, marginTop: 6 }}>
        {value}
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
        {sub}
      </div>
    </Card>
  );
}
