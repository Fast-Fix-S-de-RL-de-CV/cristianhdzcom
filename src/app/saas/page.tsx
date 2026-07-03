import Link from "next/link";
import {
  Check,
  CreditCard,
  Globe,
  GraduationCap,
  Link2,
  Palette,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { PlanCards, SaasFooter, SaasNav } from "./chrome";

/**
 * Landing de la SaaS mimarca.app (realm plataforma — sin tenant).
 * Links SIN tp(): el middleware mapea "/crear" y "/precios" a /saas/**.
 */

const FEATURES = [
  {
    icon: Globe,
    title: "Tu sitio web propio",
    desc: "Landing profesional editable desde tu admin: hero, catálogo, blog, libros y captura de leads. Todo listo desde el día uno.",
  },
  {
    icon: GraduationCap,
    title: "Cursos estilo Duolingo",
    desc: "Módulos, lecciones, quizzes, XP, rachas, niveles y certificados. Tus alumnos vuelven todos los días porque aprender se siente como un juego.",
  },
  {
    icon: Users,
    title: "Comunidad integrada",
    desc: "Feed con categorías, posts, likes, comentarios, eventos en vivo, ranking y mensajes directos. Tu audiencia vive dentro de TU plataforma.",
  },
  {
    icon: CreditCard,
    title: "Cobra con TUS llaves",
    desc: "Conecta tu Stripe, PayPal, MercadoPago o transferencia. El dinero llega directo a tus cuentas y nos quedamos con 0% de comisión.",
  },
  {
    icon: Palette,
    title: "Tu marca, tus colores",
    desc: "Logo, paleta de colores, textos, footer y redes. Tus miembros ven tu marca en cada pantalla — no la nuestra.",
  },
  {
    icon: Link2,
    title: "Tu propio dominio",
    desc: "Empieza en mimarca.app/tu-marca y cuando quieras conecta tumarca.com con SSL incluido (plan Pro).",
  },
];

const SKOOL_USD_MXN = "≈ $1,800 MXN";

const COMPARISON: Array<{ label: string; skool: string | boolean; mimarca: string | boolean }> = [
  { label: "Precio mensual", skool: `$99 USD (${SKOOL_USD_MXN})`, mimarca: "Desde $499 MXN" },
  { label: "Plataforma 100% en español", skool: false, mimarca: true },
  { label: "Cobras con tus propias llaves (Stripe, PayPal, MercadoPago)", skool: false, mimarca: true },
  { label: "Cobra en pesos, sin conversión de divisas", skool: false, mimarca: true },
  { label: "Cursos gamificados estilo Duolingo (XP, rachas, certificados)", skool: false, mimarca: true },
  { label: "Comunidad, eventos y mensajes directos", skool: true, mimarca: true },
  { label: "Dominio propio con SSL", skool: false, mimarca: true },
  { label: "Comisión sobre tus ventas", skool: "Depende del procesador", mimarca: "0% siempre" },
];

function CompareCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={18} style={{ color: "var(--green-strong)" }} />
    ) : (
      <X size={18} style={{ color: "var(--muted)", opacity: 0.6 }} />
    );
  }
  return (
    <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? "var(--ink)" : "var(--ink-2)" }}>
      {value}
    </span>
  );
}

export default function SaasLandingPage() {
  return (
    <div>
      <SaasNav />

      {/* HERO */}
      <section className="sec" style={{ paddingTop: 88, paddingBottom: 72, textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Chip className="chip-gold" dot>
            LA ALTERNATIVA A SKOOL · EN ESPAÑOL
          </Chip>
          <h1 style={{ fontSize: "clamp(44px, 7vw, 84px)", marginTop: 24 }}>
            Tu plataforma de cursos y comunidad, <span className="gold-text">con tu marca</span>.
          </h1>
          <p
            style={{
              fontSize: 19,
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: 640,
              margin: "24px auto 0",
            }}
          >
            Sitio web, cursos gamificados, comunidad y membresías — todo en un solo lugar, cobrando
            con tus propias llaves de pago y <strong>0% de comisión</strong> sobre tus ventas.
          </p>
          <div className="row" style={{ justifyContent: "center", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <Link href="/crear">
              <Button size="lg" shine>
                Crear mi plataforma gratis →
              </Button>
            </Link>
            <Link href="/precios">
              <Button size="lg" variant="ghost">
                Ver precios
              </Button>
            </Link>
          </div>
          <div className="mono" style={{ marginTop: 20, fontSize: 11, letterSpacing: "0.1em", color: "var(--muted)" }}>
            {TRIAL_DAYS} DÍAS GRATIS · SIN TARJETA · LISTA EN 2 MINUTOS
          </div>
        </div>

        {/* Stats de venta */}
        <div
          className="grid-4"
          style={{ maxWidth: 880, margin: "64px auto 0", gap: 16 }}
        >
          {[
            ["0%", "comisión sobre tus ventas"],
            ["$499", "MXN/mes — desde"],
            [`${TRIAL_DAYS} días`, "de prueba gratis"],
            ["100%", "tu marca, tus colores"],
          ].map(([v, l]) => (
            <Card key={l} style={{ padding: "22px 16px" }}>
              <div className="serif" style={{ fontSize: 34, color: "var(--gold-deep)" }}>{v}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>{l}</div>
            </Card>
          ))}
        </div>
      </section>

      <div className="rule" />

      {/* FEATURES */}
      <section className="sec">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>Todo incluido</Eyebrow>
          <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", marginTop: 16 }}>
            Todo lo que necesitas para <span style={{ color: "var(--accent)" }}>vender lo que sabes</span>.
          </h2>
          <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 16, maxWidth: 560, margin: "14px auto 0", lineHeight: 1.55 }}>
            Deja de pegar 5 herramientas con cinta adhesiva. Tu sitio, tus cursos, tu comunidad y
            tus cobros viven en una sola plataforma con tu nombre.
          </p>
        </div>
        <div className="grid-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} hover style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  className="center"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: "var(--gold-soft)",
                    border: "1px solid var(--gold-line)",
                    color: "var(--gold-deep)",
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: 22 }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="rule" />

      {/* COMPARATIVA VS SKOOL */}
      <section className="sec" id="comparativa" style={{ background: "var(--bg-2)" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>mimarca vs Skool</Eyebrow>
          <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", marginTop: 16 }}>
            Lo mismo que Skool. <span className="gold-text">En pesos y con 0% comisión</span>.
          </h2>
          <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 16, maxWidth: 560, margin: "14px auto 0", lineHeight: 1.55 }}>
            Skool cobra $99 USD al mes y está pensado para el mercado en inglés. Aquí pagas en
            pesos, cobras en pesos y todo está en tu idioma.
          </p>
        </div>

        <Card style={{ maxWidth: 880, margin: "0 auto", overflow: "hidden", padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 640 }}>
              {/* Encabezado */}
              <div
                className="row"
                style={{
                  padding: "16px 28px",
                  background: "var(--bg-2)",
                  borderBottom: "1px solid var(--line)",
                  gap: 12,
                }}
              >
                <span className="eyebrow" style={{ flex: 1 }}>Qué incluye</span>
                <span className="eyebrow" style={{ width: 180, textAlign: "center" }}>Skool</span>
                <span
                  className="eyebrow"
                  style={{ width: 180, textAlign: "center", color: "var(--gold-deep)", fontWeight: 700 }}
                >
                  mimarca.app
                </span>
              </div>
              {COMPARISON.map((r) => (
                <div
                  key={r.label}
                  className="row"
                  style={{ padding: "14px 28px", borderBottom: "1px solid var(--line)", gap: 12 }}
                >
                  <span style={{ flex: 1, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4 }}>{r.label}</span>
                  <span className="center" style={{ width: 180 }}>
                    <CompareCell value={r.skool} />
                  </span>
                  <span className="center" style={{ width: 180, background: "var(--gold-soft)", borderRadius: 8, padding: "6px 8px" }}>
                    <CompareCell value={r.mimarca} highlight />
                  </span>
                </div>
              ))}
              <div className="center" style={{ padding: "22px 28px" }}>
                <Link href="/crear">
                  <Button shine>Quiero mi plataforma →</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <div className="rule" />

      {/* PLANES */}
      <section className="sec">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>Planes</Eyebrow>
          <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", marginTop: 16 }}>
            Dos planes. <span style={{ color: "var(--accent)" }}>Sin letras chiquitas</span>.
          </h2>
          <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 16 }}>
            {PLANS.basico.priceLabel} o {PLANS.pro.priceLabel} — contra los $99 USD/mes de Skool.
          </p>
        </div>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <PlanCards />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Card style={{ padding: 64, position: "relative", overflow: "hidden", background: "var(--bg-2)" }}>
          <div className="mesh" />
          <div style={{ position: "relative", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <Chip variant="ink">EMPIEZA HOY</Chip>
            <h2 style={{ fontSize: "clamp(36px, 5.5vw, 64px)", marginTop: 24, marginBottom: 18 }}>
              Tu marca merece su <span className="gold-text">propia plataforma</span>.
            </h2>
            <p style={{ fontSize: 17, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Crea tu plataforma en 2 minutos, súbele tu logo y tus colores, publica tu primer
              curso y empieza a cobrar con tus propias llaves. {TRIAL_DAYS} días gratis.
            </p>
            <div className="row" style={{ justifyContent: "center", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/crear">
                <Button size="lg" shine>
                  Crear mi plataforma →
                </Button>
              </Link>
              <Link href="/precios">
                <Button size="lg" variant="ghost">
                  Comparar planes
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <SaasFooter />
    </div>
  );
}
