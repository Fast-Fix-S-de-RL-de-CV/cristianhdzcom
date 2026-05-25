import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/membership";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MembershipCheckout } from "./MembershipCheckout";

export const dynamic = "force-dynamic";

/**
 * /membresia — Página pública con los 3 planes (Plata / Oro / Black).
 *
 * Estrategia visual:
 *   - Eyebrow contextual: "Acceso recurrente"
 *   - 3 cards en grid con Black destacado (RECOMENDADO)
 *   - Si el visitante YA tiene membresía → ve un banner "Ya eres X" con
 *     botón "Gestionar mi membresía".
 *   - Toggle Monthly / Yearly (yearly = 2 meses gratis).
 *   - Sección "Cómo funciona el crédito" con ejemplo numérico real.
 *   - FAQ al final.
 */
export default async function MembresiaPage() {
  const user = await getCurrentUser();
  const plans = await db
    .select()
    .from(schema.membershipPlans)
    .where(eq(schema.membershipPlans.isActive, true))
    .orderBy(asc(schema.membershipPlans.sortOrder));

  const currentMembership = user ? await getActiveMembership(user.id) : null;

  return (
    <div>
      <Nav />

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 32 }}>
        <Eyebrow>Acceso recurrente · Inner Circle</Eyebrow>
        <h1 style={{ fontSize: "clamp(48px, 7vw, 80px)", marginTop: 16, maxWidth: 1000, lineHeight: 1.05 }}>
          Únete a la comunidad activa
          <br />
          <span style={{ color: "var(--accent)" }}>donde se mueve el negocio.</span>
        </h1>
        <p style={{ fontSize: 19, color: "var(--ink-2)", maxWidth: 720, marginTop: 22, lineHeight: 1.55 }}>
          Tres niveles. Cada uno te da acceso a contenido, mastermind y descuentos. El 50% de lo que pagas
          se acumula como crédito que aplicas en cualquier curso o consultoría — la membresía nunca se siente
          como gasto, se siente como inversión.
        </p>

        {currentMembership && (
          <div
            style={{
              marginTop: 28,
              padding: 18,
              borderRadius: 14,
              background: "color-mix(in srgb, var(--accent) 8%, white)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 32 }}>
              {plans.find((p) => p.slug === currentMembership.planSlug)?.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>
                YA ERES PARTE
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
                Suscripción {plans.find((p) => p.slug === currentMembership.planSlug)?.label} activa hasta el{" "}
                {currentMembership.currentPeriodEnd.toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <Link
              href="/cuenta/membresia"
              style={{
                padding: "10px 18px",
                background: "var(--ink)",
                color: "white",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Gestionar membresía →
            </Link>
          </div>
        )}
      </section>

      {/* 3 cards de planes */}
      <MembershipCheckout
        plans={plans.map((p) => ({
          slug: p.slug,
          label: p.label,
          emoji: p.emoji,
          priceMonthly: p.priceUsdMonthly,
          priceYearly: p.priceUsdYearly,
          discount: p.discountPercent,
          credit: p.creditAccrualPercent,
          tagline: p.tagline,
          bullets: p.bullets,
          maxSeats: p.maxSeats,
          activeMembers: p.activeMembers,
          isRecommended: p.slug === "gold",
        }))}
        userPrefilled={user ? { name: user.name, email: user.email } : null}
        alreadySubscribed={!!currentMembership}
      />

      {/* Cómo funciona el crédito */}
      <section
        className="sec"
        style={{ background: "var(--bg-2)", borderRadius: 32, margin: "0 56px 96px", padding: "56px 48px" }}
      >
        <Eyebrow>Cómo funciona el crédito</Eyebrow>
        <h2 style={{ fontSize: 48, marginTop: 16, maxWidth: 720, lineHeight: 1.1 }}>
          La membresía no se siente como gasto — es un{" "}
          <span style={{ color: "var(--accent)" }}>fondo de inversión</span> en ti.
        </h2>
        <div className="grid-3" style={{ gap: 28, marginTop: 36 }}>
          <Step
            n="01"
            title="Pagas tu membresía"
            body="Cada mes pagas $19 / $49 / $99 según tu plan. El cargo es automático y se renueva."
          />
          <Step
            n="02"
            title="50% se vuelve crédito"
            body="La mitad de cada pago se acumula como saldo aplicable. Si pagas Black 6 meses ($594), tienes $297 de crédito."
          />
          <Step
            n="03"
            title="Aplicalo cuando quieras"
            body="Al comprar cualquier curso, libro o consultoría, descuenta el crédito disponible. Acumulable, sin caducidad mientras seas miembro."
          />
        </div>
        <div
          style={{
            marginTop: 36,
            padding: 24,
            background: "white",
            borderRadius: 14,
            border: "1px solid var(--line)",
          }}
        >
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 12 }}>
            EJEMPLO CONCRETO · MEMBRESÍA BLACK ANUAL → CURSO MASTER
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, fontSize: 14, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--ink-2)" }}>Black anual (12 meses)</span>
            <span>$990</span>
            <span style={{ color: "var(--ink-2)" }}>Crédito acumulado (50%)</span>
            <span style={{ color: "var(--green-strong)" }}>+$495</span>
            <span style={{ color: "var(--ink-2)" }}>Compras Master Curso CH</span>
            <span>$997</span>
            <span style={{ color: "var(--ink-2)" }}>Descuento Black 30%</span>
            <span style={{ color: "var(--green-strong)" }}>−$299</span>
            <span style={{ color: "var(--ink-2)" }}>Aplicas crédito $495</span>
            <span style={{ color: "var(--green-strong)" }}>−$495</span>
            <span style={{ fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              Total final del curso
            </span>
            <span style={{ fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              $203
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
            Total invertido: $990 membresía + $203 curso = $1,193. Recibes: comunidad por 1 año + un curso
            que normalmente cuesta $997.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 56, color: "var(--accent)", opacity: 0.4, lineHeight: 1 }}>
        {n}
      </div>
      <h3 className="serif" style={{ fontSize: 22, marginTop: 12 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>{body}</p>
    </div>
  );
}
