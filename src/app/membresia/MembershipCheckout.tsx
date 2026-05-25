"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ConfirmProvider";

type PlanCard = {
  slug: string;
  label: string;
  emoji: string;
  priceMonthly: number;
  priceYearly: number | null;
  discount: number;
  credit: number;
  tagline: string | null;
  bullets: string[];
  maxSeats: number | null;
  activeMembers: number;
  isRecommended: boolean;
};

export function MembershipCheckout({
  plans,
  userPrefilled,
  alreadySubscribed,
}: {
  plans: PlanCard[];
  userPrefilled: { name: string; email: string } | null;
  alreadySubscribed: boolean;
}) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [name, setName] = useState(userPrefilled?.name ?? "");
  const [email, setEmail] = useState(userPrefilled?.email ?? "");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function subscribe(planSlug: string) {
    if (alreadySubscribed) {
      router.push("/cuenta/membresia");
      return;
    }
    setSelectedPlan(planSlug);
  }

  async function confirm() {
    if (!selectedPlan) return;
    if (!name || !email) {
      toast.error("Necesitamos tu nombre y email.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/checkout/membership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planSlug: selectedPlan,
            billingCycle: billing,
            buyer: { name, email },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          const msg =
            json?.error === "seats_full"
              ? json.message ?? "Cupo agotado."
              : json?.error === "already_subscribed"
                ? json.message ?? "Ya tienes una suscripción activa."
                : "No se pudo procesar la suscripción.";
          toast.error(msg);
          return;
        }
        router.push(json.redirectTo);
      } catch {
        toast.error("Error de red. Intenta de nuevo.");
      }
    });
  }

  return (
    <section className="sec" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Toggle Monthly/Yearly */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: "var(--bg-2)",
            borderRadius: 999,
            border: "1px solid var(--line)",
            gap: 4,
          }}
        >
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="mono"
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: billing === b ? "var(--ink)" : "transparent",
                color: billing === b ? "white" : "var(--ink-2)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {b === "monthly" ? "MENSUAL" : "ANUAL · 2 MESES GRATIS"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de planes */}
      <div className="grid-3" style={{ gap: 24 }}>
        {plans.map((p) => {
          const price = billing === "yearly" && p.priceYearly ? p.priceYearly : p.priceMonthly;
          const periodLabel = billing === "yearly" ? "año" : "mes";
          const seatsLeft = p.maxSeats != null ? p.maxSeats - p.activeMembers : null;
          const isFull = seatsLeft != null && seatsLeft <= 0;
          return (
            <div
              key={p.slug}
              style={{
                position: "relative",
                padding: 32,
                borderRadius: 18,
                background: "white",
                border: p.isRecommended ? "2px solid var(--accent)" : "1px solid var(--line)",
                boxShadow: p.isRecommended ? "0 20px 50px rgba(15,17,21,0.08)" : undefined,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {p.isRecommended && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 32,
                    background: "var(--accent)",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  Recomendado
                </div>
              )}
              {p.maxSeats != null && (
                <div
                  className="mono"
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    fontSize: 10,
                    color: isFull ? "var(--red)" : "var(--muted)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {isFull ? "CUPO AGOTADO" : `${seatsLeft}/${p.maxSeats} CUPOS`}
                </div>
              )}

              <div style={{ fontSize: 36, marginBottom: 4 }}>{p.emoji}</div>
              <div className="serif" style={{ fontSize: 32, lineHeight: 1.1 }}>
                {p.label}
              </div>
              {p.tagline && (
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5, minHeight: 56 }}>
                  {p.tagline}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 16 }}>
                <span className="serif" style={{ fontSize: 52 }}>
                  ${price}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>USD / {periodLabel}</span>
              </div>
              {billing === "yearly" && (
                <div className="mono" style={{ fontSize: 11, color: "var(--green-strong)", marginTop: 4 }}>
                  AHORRAS ${p.priceMonthly * 12 - (p.priceYearly ?? 0)} VS MENSUAL
                </div>
              )}

              {/* Bullets */}
              <div className="col" style={{ gap: 10, margin: "20px 0", flex: 1 }}>
                {p.bullets.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                    <span style={{ color: "var(--ink-2)" }}>{b}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => subscribe(p.slug)}
                disabled={isFull || pending}
                style={{
                  marginTop: 12,
                  padding: "14px 24px",
                  background: isFull ? "var(--bg-3)" : p.isRecommended ? "var(--accent)" : "var(--ink)",
                  color: isFull ? "var(--muted)" : "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isFull ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                {alreadySubscribed
                  ? "Gestionar mi plan →"
                  : isFull
                    ? "Lista de espera"
                    : `Empezar ${p.label} →`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de checkout cuando hay plan seleccionado */}
      {selectedPlan && (
        <div
          onClick={() => !pending && setSelectedPlan(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,30,58,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 460, width: "100%" }}
          >
            <h3 className="serif" style={{ fontSize: 26, marginBottom: 6 }}>
              Empezar {plans.find((p) => p.slug === selectedPlan)?.label}{" "}
              {plans.find((p) => p.slug === selectedPlan)?.emoji}
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 22 }}>
              {billing === "yearly" ? "Suscripción anual" : "Suscripción mensual"}. Cancelas cuando quieras.
            </p>
            <div className="col" style={{ gap: 12 }}>
              <input
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle()}
              />
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle()}
                disabled={!!userPrefilled}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setSelectedPlan(null)}
                disabled={pending}
                style={{ ...btnStyle("ghost"), flex: 1 }}
              >
                Cancelar
              </button>
              <button onClick={confirm} disabled={pending} style={{ ...btnStyle("primary"), flex: 2 }}>
                {pending ? "Procesando…" : `Pagar ${billing === "yearly" ? "anual" : "mensual"} →`}
              </button>
            </div>
            <div
              className="mono"
              style={{ marginTop: 14, fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textAlign: "center" }}
            >
              🔒 STRIPE · PAYPAL · OXXO · CANCELAS CUANDO QUIERAS
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "11px 14px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 14,
    background: "white",
  };
}

function btnStyle(kind: "primary" | "ghost"): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: kind === "primary" ? "var(--ink)" : "white",
    color: kind === "primary" ? "white" : "var(--ink)",
    border: kind === "ghost" ? "1px solid var(--line)" : "none",
  };
}
