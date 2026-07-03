import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLANS, TRIAL_DAYS, type PlanId } from "@/lib/plans";

/**
 * Chrome compartido del realm PLATAFORMA (mimarca.app raíz).
 * OJO: aquí NO hay tenant (getTenantCtx()=null) y los links van SIN tp():
 * el middleware mapea "/" → /saas, "/crear" → /saas/crear, etc., así que los
 * href visibles son rutas raíz ("/crear", "/precios").
 */

export function SaasNav({ active }: { active?: "precios" | "crear" }) {
  return (
    <header
      className="between"
      style={{
        padding: "18px 56px",
        borderBottom: "1px solid var(--line)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <Link href="/" className="row" style={{ gap: 10 }}>
        <span className="serif" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>
          mimarca<span className="gold-text">.app</span>
        </span>
      </Link>
      <nav className="row" style={{ gap: 18 }}>
        <Link
          href="/precios"
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: active === "precios" ? "var(--ink)" : "var(--muted)",
            fontWeight: 600,
          }}
        >
          Precios
        </Link>
        <Link
          href="/login"
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          Iniciar sesión
        </Link>
        <Link href="/crear">
          <Button size="sm" shine>
            Crear mi plataforma →
          </Button>
        </Link>
      </nav>
    </header>
  );
}

export function SaasFooter() {
  return (
    <footer className="ch-foot" style={{ padding: "40px 56px" }}>
      <div className="between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="serif" style={{ fontSize: 17, fontWeight: 700 }}>
            mimarca<span className="gold-text">.app</span>
          </span>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 12 }}>
            Tu plataforma de cursos y comunidad, con tu marca.
          </div>
        </div>
        <div className="row" style={{ gap: 20 }}>
          <Link href="/precios" style={{ color: "var(--muted)", fontSize: 13 }}>
            Precios
          </Link>
          <Link href="/login" style={{ color: "var(--muted)", fontSize: 13 }}>
            Iniciar sesión
          </Link>
          <Link href="/crear" style={{ color: "var(--muted)", fontSize: 13 }}>
            Crear mi plataforma
          </Link>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          © {new Date().getFullYear()} MIMARCA.APP
        </div>
      </div>
    </footer>
  );
}

/** Cards de los 2 planes (fuente de verdad: PLANS de @/lib/plans). */
export function PlanCards() {
  const order: PlanId[] = ["basico", "pro"];
  return (
    <div className="grid-2" style={{ alignItems: "stretch" }}>
      {order.map((id) => {
        const plan = PLANS[id];
        const isPro = id === "pro";
        return (
          <Card
            key={plan.id}
            className={isPro ? "card-gold" : undefined}
            style={{ padding: 36, display: "flex", flexDirection: "column", gap: 20, height: "100%" }}
          >
            <div className="between">
              <span className={isPro ? "chip chip-gold" : "chip"}>{plan.name.toUpperCase()}</span>
              {isPro && <span className="chip chip-gold-filled">MÁS POPULAR</span>}
            </div>
            <div>
              <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>
                ${plan.priceMxnMonthly.toLocaleString("es-MX")}
                <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500 }}> MXN/mes</span>
              </div>
              <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>{plan.tagline}</p>
            </div>
            <div className="rule" />
            <ul className="col" style={{ gap: 12, listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <Check size={16} style={{ color: "var(--gold-deep)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45 }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link href={`/crear?plan=${plan.id}`} style={{ display: "block" }}>
              <Button
                size="lg"
                variant={isPro ? "primary" : "ghost"}
                shine={isPro}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Empezar {TRIAL_DAYS} días gratis →
              </Button>
            </Link>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", letterSpacing: "0.08em" }}>
              SIN TARJETA · CANCELA CUANDO QUIERAS
            </div>
          </Card>
        );
      })}
    </div>
  );
}
