import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PaymentMethodsCard } from "./PaymentMethodsCard";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const user = (await getCurrentUser())!;

  const env = {
    smtpHost: process.env.SMTP_HOST || "",
    smtpUser: process.env.SMTP_USER || "",
    smtpPort: process.env.SMTP_PORT || "",
    mailFrom: process.env.MAIL_FROM || "",
    appUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "",
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
      ? "LIVE"
      : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "TEST"
        : "—",
    databaseHost: (() => {
      try {
        return process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "";
      } catch {
        return "";
      }
    })(),
  };

  return (
    <AdminPageShell
      user={user}
      active="/admin/ajustes"
      title="Ajustes"
      subtitle="Configuración global del sitio"
    >
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr", maxWidth: 920 }}>
        {/* Métodos de pago */}
        <Card style={{ padding: 24 }}>
          <Eyebrow>Pagos</Eyebrow>
          <h2 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
            Métodos de pago
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
            Configura los proveedores que aceptarán pagos de tus alumnos. Cada uno se puede habilitar/deshabilitar sin perder credenciales.
          </p>
          <PaymentMethodsCard />
        </Card>

        {/* Comunidad */}
        <Card style={{ padding: 24 }}>
          <Eyebrow>Comunidad</Eyebrow>
          <h2 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
            Configuración de comunidad
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
            Próximamente — actualmente la configuración global vive en código.
          </p>
          <div className="col" style={{ gap: 14 }}>
            <Field label="Nombre">
              <input disabled value="CH · Negocios con IA" style={inputStyle()} />
            </Field>
            <Field label="Descripción">
              <textarea
                disabled
                value="Comunidad de fundadores construyendo negocios con IA junto a Cristian Hernández."
                style={{ ...inputStyle(), minHeight: 64 }}
              />
            </Field>
            <Field label="Privacidad">
              <input disabled value="Pública (requiere registro)" style={inputStyle()} />
            </Field>
          </div>
        </Card>

        {/* Email */}
        <Card style={{ padding: 24 }}>
          <Eyebrow>Email</Eyebrow>
          <h2 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
            Configuración SMTP
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
            Read-only · valores cargados desde .env.
          </p>
          <div className="col" style={{ gap: 14 }}>
            <Field label="SMTP Host">
              <input disabled value={env.smtpHost || "— no configurado"} style={inputStyle()} />
            </Field>
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="SMTP User">
                  <input disabled value={env.smtpUser || "—"} style={inputStyle()} />
                </Field>
              </div>
              <div style={{ width: 120 }}>
                <Field label="SMTP Port">
                  <input disabled value={env.smtpPort || "—"} style={inputStyle()} />
                </Field>
              </div>
            </div>
            <Field label="MAIL_FROM">
              <input disabled value={env.mailFrom || "—"} style={inputStyle()} />
            </Field>
            <Field label="Stripe">
              <input
                disabled
                value={env.stripeMode}
                style={{
                  ...inputStyle(),
                  color: env.stripeMode === "LIVE" ? "var(--green-strong)" : env.stripeMode === "TEST" ? "var(--warm)" : "var(--muted)",
                  fontWeight: 600,
                }}
              />
            </Field>
            <Field label="Database Host">
              <input disabled value={env.databaseHost || "—"} style={inputStyle()} />
            </Field>
          </div>
        </Card>

        {/* Datos */}
        <Card style={{ padding: 24 }}>
          <Eyebrow>Datos</Eyebrow>
          <h2 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
            Exportar información
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
            Descarga CSVs con todo el histórico para backup o análisis externo.
          </p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a
              href="/api/admin/export?type=orders"
              className="btn btn-primary"
              style={{ padding: "10px 16px", fontSize: 13, textDecoration: "none" }}
            >
              ⬇ Exportar pedidos (CSV)
            </a>
            <a
              href="/api/admin/export?type=users"
              className="btn btn-ghost"
              style={{ padding: "10px 16px", fontSize: 13, textDecoration: "none" }}
            >
              ⬇ Exportar usuarios
            </a>
            <a
              href="/api/admin/export?type=leaderboard"
              className="btn btn-ghost"
              style={{ padding: "10px 16px", fontSize: 13, textDecoration: "none" }}
            >
              ⬇ Exportar ranking
            </a>
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "var(--bg-2)",
    color: "var(--ink-2)",
  };
}
