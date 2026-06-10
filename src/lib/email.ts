import "server-only";
import type { Transporter } from "nodemailer";

/**
 * Mail sender. Three backends, picked in order:
 *
 *   1. SMTP (nodemailer)    — if `SMTP_HOST` is set. Production default.
 *      Other vars: SMTP_PORT (default 465), SMTP_SECURE ("true"/"false",
 *      default true when port==465), SMTP_USER, SMTP_PASS.
 *
 *   2. Resend HTTPS API     — if `RESEND_API_KEY` is set. Fallback for
 *      teams that prefer Resend over their own SMTP.
 *
 *   3. Console stub         — when nothing is configured we just log the
 *      message. Lets dev/preview environments work without real mail.
 *
 * From address: `MAIL_FROM` env var. Defaults to
 * `Cristian Hernández <info@cristianhdz.com>`.
 *
 * Returns `{ ok, id?, reason? }`. Never throws.
 */

const FROM = process.env.MAIL_FROM || "Cristian Hernández <info@cristianhdz.com>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// Cache the nodemailer Transporter across invocations. Re-using the same TCP
// connection pool is meaningfully faster than handshaking on every email.
let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (!process.env.SMTP_HOST) return null;
  if (cachedTransporter) return cachedTransporter;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    // cPanel servers occasionally serve a self-signed cert on submission
    // ports. Allow the connection but log if it's not strictly verifiable.
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
  });
  return cachedTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id?: string; reason?: string }> {
  // 1) SMTP
  const transporter = await getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });
      return { ok: true, id: info.messageId };
    } catch (err: any) {
      console.error("[email] SMTP send error:", err?.message ?? err);
      // Drop the cached transporter so the next call rebuilds it after a
      // transient network glitch.
      cachedTransporter = null;
      return { ok: false, reason: "smtp_error" };
    }
  }

  // 2) Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: input.replyTo,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[email] Resend ${res.status}: ${body}`);
        return { ok: false, reason: `resend_${res.status}` };
      }
      const j = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, id: j.id };
    } catch (err: any) {
      console.error("[email] Resend send error:", err?.message ?? err);
      return { ok: false, reason: "send_error" };
    }
  }

  // 3) Stub
  console.log(
    `[email:stub] would send to ${input.to}\n  subject: ${input.subject}\n  preview: ${input.text?.slice(0, 200) ?? input.html.slice(0, 200).replace(/<[^>]+>/g, " ")}`,
  );
  return { ok: false, reason: "no_sender_configured" };
}

/* ─────────── Templates ─────────── */

const BRAND_COLOR = "#0A1E3A";
const GOLD = "#B8860B";

function shell(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FBFAF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0A1E3A;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://cristianhdz.com" style="text-decoration:none;">
      <img src="https://cristianhdz.com/logo.png" alt="Cristian Hernández" style="height:48px;width:auto;" />
    </a>
  </div>
  <div style="background:#fff;border:1px solid #E2DACA;border-radius:18px;padding:32px;">
    <h1 style="font-size:22px;color:${BRAND_COLOR};margin:0 0 16px;line-height:1.3;">${title}</h1>
    ${body}
  </div>
  <p style="text-align:center;color:#6E7A91;font-size:11px;margin-top:24px;letter-spacing:0.06em;text-transform:uppercase;">
    cristianhdz.com · <a href="mailto:info@cristianhdz.com" style="color:${GOLD};text-decoration:none;font-weight:600;">info@cristianhdz.com</a>
  </p>
</div>
</body></html>`;
}

export function welcomeEmailHtml(firstName: string): string {
  const body = `
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      ${escapeHtml(firstName) || "Hola"}, bienvenido a la comunidad.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      Tu cuenta quedó lista. Ya tienes acceso a:
    </p>
    <ul style="font-size:14px;line-height:1.8;color:#1A3458;padding-left:20px;margin:0 0 24px;">
      <li>El feed de la comunidad y el directorio de miembros</li>
      <li>El próximo taller en vivo del mes</li>
      <li>La biblioteca de recursos (PDFs, plantillas, notebooks)</li>
      <li>Tu sendero de aprendizaje en <strong>/plataforma</strong></li>
    </ul>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://cristianhdz.com/plataforma"
         style="display:inline-block;background:${BRAND_COLOR};color:#FAF3DC;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        Ir a mi plataforma →
      </a>
    </div>
    <p style="font-size:13px;color:#6E7A91;line-height:1.6;margin:16px 0 0;">
      Si tienes alguna duda, escríbeme a <a href="mailto:info@cristianhdz.com" style="color:${GOLD};font-weight:600;">info@cristianhdz.com</a> y te respondo personalmente.
    </p>
  `;
  return shell("Tu cuenta está lista", body);
}

export function passwordResetEmailHtml(firstName: string, resetUrl: string): string {
  const body = `
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      ${escapeHtml(firstName) || "Hola"},
    </p>
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz click en el botón. El link es válido por <strong>1 hora</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:${BRAND_COLOR};color:#FAF3DC;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        Restablecer mi contraseña
      </a>
    </div>
    <p style="font-size:12px;color:#6E7A91;line-height:1.6;margin:16px 0 0;word-break:break-all;">
      O copia este link en tu navegador:<br><a href="${resetUrl}" style="color:${GOLD};">${resetUrl}</a>
    </p>
    <p style="font-size:13px;color:#6E7A91;line-height:1.6;margin:24px 0 0;">
      Si no fuiste tú, ignora este correo — tu cuenta sigue segura.
    </p>
  `;
  return shell("Restablece tu contraseña", body);
}

export function bookPurchaseEmailHtml(opts: {
  firstName: string;
  bookTitle: string;
  format: "digital" | "physical" | "bundle";
  isPhysical: boolean;
  tempPassword: string | null;
  digitalFileUrl: string | null;
}): string {
  const { firstName, bookTitle, format, isPhysical, tempPassword, digitalFileUrl } = opts;
  const cta = digitalFileUrl
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${digitalFileUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#FAF3DC;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          Descargar mi libro →
        </a>
      </div>`
    : "";
  const accountBlock = tempPassword
    ? `<div style="margin:24px 0;padding:18px 20px;background:#F4EDD9;border-radius:10px;border:1px solid ${GOLD};">
        <p style="font-size:13px;color:#1A3458;margin:0 0 10px;font-weight:600;">
          🔑 Te creamos una cuenta para ti
        </p>
        <p style="font-size:13px;color:#1A3458;margin:0 0 6px;line-height:1.5;">
          Email: <strong>${escapeHtml(firstName)}…</strong> &nbsp;·&nbsp; Contraseña temporal:
        </p>
        <code style="display:inline-block;background:white;border:1px solid #D9D2BF;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:14px;color:#1A3458;letter-spacing:0.04em;">${escapeHtml(tempPassword)}</code>
        <p style="font-size:12px;color:#6E7A91;margin:10px 0 0;line-height:1.5;">
          Úsala para entrar en <a href="https://cristianhdz.com/login" style="color:${GOLD};font-weight:600;">cristianhdz.com/login</a> y cámbiala desde "Mi cuenta".
        </p>
      </div>`
    : "";
  const shippingNote = isPhysical
    ? `<p style="font-size:14px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
        📦 Tu ejemplar físico firmado sale del taller en 1-2 días hábiles. Te mandamos el tracking en cuanto sea despachado. Llega en 7-12 días a tu dirección.
      </p>`
    : "";

  const body = `
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      ${escapeHtml(firstName) || "Hola"}, ¡gracias por tu compra!
    </p>
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      Acabas de llevarte <strong>${escapeHtml(bookTitle)}</strong>${format === "digital" ? " en formato digital" : format === "physical" ? " en formato físico firmado" : ""}.
    </p>
    ${cta}
    ${shippingNote}
    ${accountBlock}
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:24px 0 12px;font-weight:600;">
      Y como eres parte oficial de la comunidad, ya tienes acceso a:
    </p>
    <ul style="font-size:14px;line-height:1.8;color:#1A3458;padding-left:20px;margin:0 0 24px;">
      <li>El feed de la <a href="https://cristianhdz.com/comunidad" style="color:${GOLD};font-weight:600;">comunidad privada</a></li>
      <li>Directorio de miembros + DMs</li>
      <li>Talleres en vivo del mes</li>
      <li>Biblioteca de recursos (plantillas, notebooks, PDFs)</li>
    </ul>
    <div style="text-align:center;margin:20px 0;">
      <a href="https://cristianhdz.com/comunidad"
         style="display:inline-block;background:white;color:${BRAND_COLOR};padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;border:1.5px solid ${BRAND_COLOR};">
        Entrar a la comunidad →
      </a>
    </div>
    <p style="font-size:13px;color:#6E7A91;line-height:1.6;margin:16px 0 0;">
      ¿Algún problema? Escríbeme a <a href="mailto:info@cristianhdz.com" style="color:${GOLD};font-weight:600;">info@cristianhdz.com</a> y te respondo personalmente.
    </p>
  `;
  return shell(`Tu copia de "${bookTitle}" está lista`, body);
}

/** Email de acceso tras comprar un PROGRAMA o MEMBRESÍA. Mismo patrón que
 *  bookPurchaseEmailHtml: incluye la contraseña temporal cuando la cuenta
 *  se creó durante el checkout. */
export function purchaseAccessEmailHtml(opts: {
  firstName: string;
  itemTitle: string;
  tempPassword: string | null;
}): string {
  const { firstName, itemTitle, tempPassword } = opts;
  const accountBlock = tempPassword
    ? `<div style="margin:24px 0;padding:18px 20px;background:#F4EDD9;border-radius:10px;border:1px solid ${GOLD};">
        <p style="font-size:13px;color:#1A3458;margin:0 0 10px;font-weight:600;">
          🔑 Te creamos una cuenta para ti
        </p>
        <p style="font-size:13px;color:#1A3458;margin:0 0 6px;line-height:1.5;">
          Tu contraseña temporal:
        </p>
        <code style="display:inline-block;background:white;border:1px solid #D9D2BF;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:14px;color:#1A3458;letter-spacing:0.04em;">${escapeHtml(tempPassword)}</code>
        <p style="font-size:12px;color:#6E7A91;margin:10px 0 0;line-height:1.5;">
          Úsala para entrar en <a href="https://cristianhdz.com/login" style="color:${GOLD};font-weight:600;">cristianhdz.com/login</a> y cámbiala desde "Mi cuenta".
        </p>
      </div>`
    : "";

  const body = `
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      ${escapeHtml(firstName) || "Hola"}, ¡gracias por tu compra!
    </p>
    <p style="font-size:15px;line-height:1.6;color:#1A3458;margin:0 0 16px;">
      Tu acceso a <strong>${escapeHtml(itemTitle)}</strong> ya está listo.
    </p>
    ${accountBlock}
    <div style="text-align:center;margin:24px 0;">
      <a href="https://cristianhdz.com/plataforma"
         style="display:inline-block;background:${BRAND_COLOR};color:#FAF3DC;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        Ir a mi plataforma →
      </a>
    </div>
    <p style="font-size:13px;color:#6E7A91;line-height:1.6;margin:16px 0 0;">
      ¿Algún problema? Escríbeme a <a href="mailto:info@cristianhdz.com" style="color:${GOLD};font-weight:600;">info@cristianhdz.com</a> y te respondo personalmente.
    </p>
  `;
  return shell(`Tu acceso a ${itemTitle} está listo`, body);
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
