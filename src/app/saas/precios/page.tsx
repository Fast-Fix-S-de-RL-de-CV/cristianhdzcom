import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { PlanCards, SaasFooter, SaasNav } from "../chrome";

/**
 * Precios de la SaaS (realm plataforma). Los 2 planes salen de PLANS
 * (@/lib/plans) — fuente de verdad de precios, límites y features.
 */

const FAQS: Array<[string, string]> = [
  [
    "¿De verdad 0% de comisión?",
    "Sí. Conectas tus propias llaves de Stripe, PayPal o MercadoPago y el dinero de tus ventas llega directo a tus cuentas. Solo pagas tu mensualidad.",
  ],
  [
    `¿Cómo funciona la prueba de ${TRIAL_DAYS} días?`,
    `Creas tu plataforma sin tarjeta y tienes ${TRIAL_DAYS} días con todo habilitado. Si te quedas, activas tu plan; si no, no pagas nada.`,
  ],
  [
    "¿Puedo cambiar de plan después?",
    "Sí, puedes subir de Básico a Pro (o bajar) en cualquier momento. Tu contenido, miembros y ventas se conservan intactos.",
  ],
  [
    "¿Qué pasa con mi dominio propio?",
    `Con el plan ${PLANS.pro.name} conectas tumarca.com con SSL incluido. Mientras tanto tu plataforma vive en mimarca.app/tu-marca.`,
  ],
];

export default function PreciosPage() {
  return (
    <div>
      <SaasNav active="precios" />

      <section className="sec" style={{ paddingTop: 72 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>Precios</Eyebrow>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 16 }}>
            Simple, en pesos y <span className="gold-text">sin comisiones</span>.
          </h1>
          <p
            style={{
              color: "var(--muted)",
              marginTop: 16,
              fontSize: 17,
              maxWidth: 560,
              margin: "16px auto 0",
              lineHeight: 1.55,
            }}
          >
            Skool cuesta $99 USD/mes (≈ $1,800 MXN). Aquí tienes tu plataforma completa desde{" "}
            {PLANS.basico.priceLabel}, cobrando con tus propias llaves y quedándote con el 100% de
            tus ventas.
          </p>
          <div className="mono" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.1em", color: "var(--muted)" }}>
            {TRIAL_DAYS} DÍAS GRATIS EN AMBOS PLANES · SIN TARJETA
          </div>
        </div>

        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <PlanCards />
        </div>
      </section>

      <div className="rule" />

      {/* FAQ */}
      <section className="sec" style={{ background: "var(--bg-2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Eyebrow>Preguntas frecuentes</Eyebrow>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", marginTop: 16 }}>Lo que todos preguntan.</h2>
        </div>
        <div className="grid-2" style={{ maxWidth: 920, margin: "0 auto" }}>
          {FAQS.map(([q, a]) => (
            <Card key={q} style={{ padding: 26 }}>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>{q}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{a}</p>
            </Card>
          ))}
        </div>
        <div className="center" style={{ marginTop: 44 }}>
          <Link href="/crear">
            <Button size="lg" shine>
              Crear mi plataforma gratis →
            </Button>
          </Link>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
}
