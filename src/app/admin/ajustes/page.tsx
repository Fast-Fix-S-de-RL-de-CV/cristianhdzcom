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

/**
 * Resuelve el modo efectivo de Stripe combinando dos fuentes:
 *   1. Tabla `payment_settings` (gestionada desde la UI más abajo).
 *   2. Variables de entorno `STRIPE_SECRET_KEY` (cableo de servidor).
 *
 * Se considera "LIVE" sólo si una de las dos tiene una secret_key real con
 * prefijo `sk_live_` Y el toggle enableStripe está activo (o existe en .env).
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

export default async function AjustesPage() {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const tp = ctx.tp;
  const user = (await getCurrentUser())!;

  // Single source of truth para el indicador: combinar .env + DB (del tenant).
  const [pay] = await db
    .select()
    .from(schema.paymentSettings)
    .where(eq(schema.paymentSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const env = {
    smtpHost: process.env.SMTP_HOST || "",
    smtpUser: process.env.SMTP_USER || "",
    smtpPort: process.env.SMTP_PORT || "",
    mailFrom: process.env.MAIL_FROM || "",
    appUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "",
    stripeMode: detectStripeMode({
      dbKey: pay?.stripeSecretKey ?? null,
      dbMode: pay?.stripeMode ?? null,
      dbEnabled: !!pay?.enableStripe,
      // El fallback a la llave env (plataforma) solo aplica al tenant de la casa.
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
      <div className="settings-layout" style={{ display: "grid", gap: 24, gridTemplateColumns: "260px minmax(0, 1fr)", maxWidth: 1180 }}>
        <aside className="settings-aside" style={{ alignSelf: "start", position: "sticky", top: 20 }}>
          <Card style={{ padding: 18 }}>
            <Eyebrow>Tenant</Eyebrow>
            <h2 className="serif" style={{ fontSize: 22, marginTop: 8, marginBottom: 4 }}>
              {ctx.branding.siteName}
            </h2>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
              /{ctx.tenant.slug} · {ctx.tenant.plan.toUpperCase()}
            </div>
            <div className="col" style={{ gap: 6 }}>
              <SettingsAnchor href="#sitio">Sitio, marca y SEO</SettingsAnchor>
              <SettingsAnchor href="#operacion">Reservas y correo</SettingsAnchor>
              <SettingsAnchor href="#pagos">Pagos</SettingsAnchor>
              <SettingsAnchor href="#comunidad">Comunidad</SettingsAnchor>
              <SettingsAnchor href="#datos">Datos y exportación</SettingsAnchor>
              {ctx.tenant.slug === "cristianhdz" && <SettingsAnchor href="#infra">Infraestructura</SettingsAnchor>}
            </div>
          </Card>
        </aside>

        <main className="col" style={{ gap: 22, minWidth: 0 }}>
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <QuickLink
                eyebrow="Sitio web"
                title="Editar páginas"
                body="Portada, secciones, slider, Acerca de y dominio."
                href={tp("/admin/ajustes/slider")}
              />
              <QuickLink
                eyebrow="Reservas"
                title="Servicios y citas"
                body="Horarios, servicios, reservas recibidas y vista pública."
                href={tp("/admin/reservas")}
              />
              <QuickLink
                eyebrow="Vista pública"
                title="Abrir sitio"
                body="Revisa cómo se ve el tenant para visitantes."
                href={tp("/")}
                external
              />
            </div>
          </section>

          <SectionHeader
            id="sitio"
            eyebrow="Sitio y marca"
            title="Identidad pública"
            body="Todo lo que afecta la presentación del tenant: nombre, logo, colores, SEO, menú, footer y redes."
          />
          <Card style={{ padding: 24 }}>
            <MiSitioCard />
          </Card>

          <SectionHeader
            id="operacion"
            eyebrow="Operación"
            title="Reservas y comunicación"
            body="Configura cómo llegan las citas y desde qué correo se envían confirmaciones, avisos y recordatorios."
          />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, .8fr) minmax(0, 1.2fr)", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <Eyebrow>Reservas</Eyebrow>
              <h3 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
                Servicios y citas
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
                Administra servicios de consultoría, horarios disponibles y reservas entrantes.
              </p>
              <a
                href={tp("/admin/reservas")}
                className="btn btn-primary"
                style={{ padding: "10px 18px", fontSize: 13, textDecoration: "none", display: "inline-block" }}
              >
                Configurar reservas →
              </a>
            </Card>
            <Card style={{ padding: 24 }}>
              <Eyebrow>Email</Eyebrow>
              <h3 className="serif" style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>
                SMTP y recordatorios
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
                Remitente propio del tenant y recordatorios automáticos una hora antes de cada reserva.
              </p>
              <EmailSettingsCard />
            </Card>
          </div>

          <SectionHeader
            id="pagos"
            eyebrow="Cobros"
            title="Métodos de pago"
            body="Proveedores y métodos que el tenant puede ofrecer a sus alumnos o compradores."
          />
          <Card style={{ padding: 24 }}>
            <PaymentMethodsCard />
          </Card>

          <SectionHeader
            id="comunidad"
            eyebrow="Comunidad"
            title="Experiencia de miembros"
            body="Configuración base de la comunidad del tenant. Algunas opciones avanzadas quedarán disponibles en próximas iteraciones."
          />
          <Card style={{ padding: 24 }}>
            <div className="col" style={{ gap: 14 }}>
              <Field label="Nombre">
                <input disabled value={ctx.branding.siteName} style={inputStyle()} />
              </Field>
              <Field label="Descripción">
                <textarea
                  disabled
                  value={`Comunidad de ${ctx.branding.siteName}.`}
                  style={{ ...inputStyle(), minHeight: 64 }}
                />
              </Field>
              <Field label="Privacidad">
                <input disabled value="Pública (requiere registro)" style={inputStyle()} />
              </Field>
            </div>
          </Card>

          <SectionHeader
            id="datos"
            eyebrow="Datos"
            title="Exportación y respaldo"
            body="Descargas operativas para respaldo, análisis externo o conciliación."
          />
          <Card style={{ padding: 24 }}>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a href={tp("/api/admin/export?type=orders")} className="btn btn-primary" style={exportBtnStyle()}>
                Exportar pedidos
              </a>
              <a href={tp("/api/admin/export?type=users")} className="btn btn-ghost" style={exportBtnStyle()}>
                Exportar usuarios
              </a>
              <a href={tp("/api/admin/export?type=leaderboard")} className="btn btn-ghost" style={exportBtnStyle()}>
                Exportar ranking
              </a>
            </div>
          </Card>

          {ctx.tenant.slug === "cristianhdz" && (
            <>
              <SectionHeader
                id="infra"
                eyebrow="Infraestructura"
                title="Valores globales de plataforma"
                body="Solo lectura para el tenant principal. Los demás tenants ven únicamente su configuración propia."
              />
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
            </>
          )}
        </main>
      </div>
    </AdminPageShell>
  );
}

function SettingsAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "9px 10px",
        borderRadius: 8,
        color: "var(--ink-2)",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </a>
  );
}

function SectionHeader({
  id,
  eyebrow,
  title,
  body,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div id={id} style={{ scrollMarginTop: 24, paddingTop: 4 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="serif" style={{ fontSize: 30, marginTop: 8, marginBottom: 6 }}>
        {title}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 720, lineHeight: 1.55 }}>
        {body}
      </p>
    </div>
  );
}

function QuickLink({
  eyebrow,
  title,
  body,
  href,
  external,
}: {
  eyebrow: string;
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
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {eyebrow}
      </div>
      <strong style={{ display: "block", fontSize: 15, marginTop: 8 }}>{title}</strong>
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

function exportBtnStyle(): React.CSSProperties {
  return {
    padding: "10px 16px",
    fontSize: 13,
    textDecoration: "none",
  };
}
