import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import { MiSitioCard } from "./MiSitioCard";
import { EmailSettingsCard } from "./EmailSettingsCard";

export const dynamic = "force-dynamic";

type SettingsTab = "sitio" | "operacion" | "pagos" | "comunidad" | "datos" | "infra";

const BASE_TABS: Array<{ key: SettingsTab; label: string; title: string; subtitle: string }> = [
  {
    key: "sitio",
    label: "Sitio y marca",
    title: "Identidad pública",
    subtitle: "Nombre, logo, colores, SEO, menú, footer y redes.",
  },
  {
    key: "operacion",
    label: "Reservas y correo",
    title: "Reservas y comunicación",
    subtitle: "Servicios de cita, SMTP propio y recordatorios automáticos.",
  },
  {
    key: "pagos",
    label: "Pagos",
    title: "Métodos de pago",
    subtitle: "Proveedores y métodos que el tenant puede ofrecer a alumnos o compradores.",
  },
  {
    key: "comunidad",
    label: "Comunidad",
    title: "Experiencia de miembros",
    subtitle: "Configuración base de la comunidad del tenant.",
  },
  {
    key: "datos",
    label: "Datos",
    title: "Exportación y respaldo",
    subtitle: "Descargas operativas para respaldo, análisis externo o conciliación.",
  },
];

/**
 * Resuelve el modo efectivo de Stripe combinando tabla payment_settings + env.
 */
function detectStripeMode(opts: {
  dbKey: string | null;
  dbMode: string | null;
  dbEnabled: boolean;
  envKey: string | undefined;
}): "LIVE" | "TEST" | "—" {
  const sources = [opts.envKey, opts.dbKey].filter(Boolean) as string[];
  if (sources.some((k) => k.startsWith("sk_live_"))) return "LIVE";
  if (sources.some((k) => k.startsWith("sk_test_"))) return "TEST";
  if (opts.dbEnabled && opts.dbMode === "live") return "LIVE";
  if (opts.dbEnabled && opts.dbMode === "test") return "TEST";
  return "—";
}

export default async function AjustesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const tp = ctx.tp;
  const user = (await getCurrentUser())!;

  const [pay] = await db
    .select()
    .from(schema.paymentSettings)
    .where(eq(schema.paymentSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const tabs = ctx.tenant.slug === "cristianhdz"
    ? [
        ...BASE_TABS,
        {
          key: "infra" as SettingsTab,
          label: "Infraestructura",
          title: "Valores globales de plataforma",
          subtitle: "Solo lectura para el tenant principal.",
        },
      ]
    : BASE_TABS;
  const sp = await searchParams;
  const requestedTab = sp?.tab as SettingsTab | undefined;
  const current = tabs.some((tab) => tab.key === requestedTab) ? requestedTab! : "sitio";
  const currentMeta = tabs.find((tab) => tab.key === current) ?? tabs[0];

  const env = {
    smtpHost: process.env.SMTP_HOST || "",
    smtpUser: process.env.SMTP_USER || "",
    smtpPort: process.env.SMTP_PORT || "",
    mailFrom: process.env.MAIL_FROM || "",
    stripeMode: detectStripeMode({
      dbKey: pay?.stripeSecretKey ?? null,
      dbMode: pay?.stripeMode ?? null,
      dbEnabled: !!pay?.enableStripe,
      envKey: ctx.tenant.slug === "cristianhdz" ? process.env.STRIPE_SECRET_KEY : undefined,
    }),
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
      subtitle="Centro de configuración del tenant"
    >
      <div style={{ maxWidth: 1040 }}>
        <SettingsTabs tabs={tabs} current={current} tp={tp} />

        <div style={{ marginBottom: 20 }}>
          <Eyebrow>{currentMeta.label}</Eyebrow>
          <h2 className="serif" style={{ fontSize: 32, marginTop: 8, marginBottom: 6 }}>
            {currentMeta.title}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}>
            {currentMeta.subtitle}
          </p>
        </div>

        {current === "sitio" && (
          <div className="col" style={{ gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <QuickLink title="Editar páginas" body="Portada, secciones, Acerca de y dominio." href={tp("/admin/ajustes/slider")} />
              <QuickLink title="Vista pública" body="Revisa cómo se ve el tenant para visitantes." href={tp("/")} external />
              <QuickLink title="Reservas públicas" body="Abre la página pública de citas." href={tp("/reservas")} external />
            </div>
            <Card style={{ padding: 24 }}>
              <MiSitioCard />
            </Card>
          </div>
        )}

        {current === "operacion" && (
          <div className="settings-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0, .82fr) minmax(0, 1.18fr)", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <Eyebrow>Reservas</Eyebrow>
              <h3 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
                Servicios y citas
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
                Administra servicios de consultoría, horarios disponibles y reservas entrantes.
              </p>
              <a href={tp("/admin/reservas")} className="btn btn-primary" style={buttonLinkStyle()}>
                Configurar reservas →
              </a>
            </Card>
            <Card style={{ padding: 24 }}>
              <Eyebrow>Email</Eyebrow>
              <h3 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
                SMTP y recordatorios
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
                Remitente propio del tenant y recordatorios una hora antes de cada reserva.
              </p>
              <EmailSettingsCard />
            </Card>
          </div>
        )}

        {current === "pagos" && (
          <Card style={{ padding: 24 }}>
            <PaymentMethodsCard />
          </Card>
        )}

        {current === "comunidad" && (
          <Card style={{ padding: 24 }}>
            <div className="col" style={{ gap: 14 }}>
              <Field label="Nombre">
                <input disabled value={ctx.branding.siteName} style={inputStyle()} />
              </Field>
              <Field label="Descripción">
                <textarea disabled value={`Comunidad de ${ctx.branding.siteName}.`} style={{ ...inputStyle(), minHeight: 64 }} />
              </Field>
              <Field label="Privacidad">
                <input disabled value="Pública (requiere registro)" style={inputStyle()} />
              </Field>
            </div>
          </Card>
        )}

        {current === "datos" && (
          <Card style={{ padding: 24 }}>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a href={tp("/api/admin/export?type=orders")} className="btn btn-primary" style={buttonLinkStyle()}>
                Exportar pedidos
              </a>
              <a href={tp("/api/admin/export?type=users")} className="btn btn-ghost" style={buttonLinkStyle()}>
                Exportar usuarios
              </a>
              <a href={tp("/api/admin/export?type=leaderboard")} className="btn btn-ghost" style={buttonLinkStyle()}>
                Exportar ranking
              </a>
            </div>
          </Card>
        )}

        {current === "infra" && ctx.tenant.slug === "cristianhdz" && (
          <Card style={{ padding: 24 }}>
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
        )}
      </div>
    </AdminPageShell>
  );
}

function SettingsTabs({
  tabs,
  current,
  tp,
}: {
  tabs: Array<{ key: SettingsTab; label: string }>;
  current: SettingsTab;
  tp: (path: string) => string;
}) {
  return (
    <div className="row" style={{ gap: 4, marginBottom: 22, flexWrap: "wrap", borderBottom: "1px solid var(--line)" }}>
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <a
            key={tab.key}
            href={tp(`/admin/ajustes?tab=${tab.key}`)}
            style={{
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--ink)" : "var(--muted)",
              borderBottom: `2px solid ${active ? "var(--gold-deep)" : "transparent"}`,
              textDecoration: "none",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}

function QuickLink({
  title,
  body,
  href,
  external,
}: {
  title: string;
  body: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      style={{
        display: "block",
        padding: 18,
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "white",
        textDecoration: "none",
        color: "var(--ink)",
      }}
    >
      <strong style={{ display: "block", fontSize: 15 }}>{title}</strong>
      <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, marginTop: 6 }}>{body}</p>
    </a>
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

function buttonLinkStyle(): React.CSSProperties {
  return {
    padding: "10px 16px",
    fontSize: 13,
    textDecoration: "none",
  };
}
