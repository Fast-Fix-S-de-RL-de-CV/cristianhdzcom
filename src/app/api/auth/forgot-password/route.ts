import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";
import { getTenantCtx } from "@/lib/tenant";

const TOKEN_TTL_MIN = 60;

/** Base absoluta del request (dominio del tenant o mimarca.app), para el link del email. */
async function requestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-tenant-host") ?? h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (!host) return process.env.PUBLIC_SITE_URL || "https://mimarca.app";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Look up user IN THIS TENANT. We intentionally DO NOT leak whether the
  // email exists — always return success so attackers can't enumerate accounts.
  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.email, email), eq(schema.users.tenantId, ctx.tenant.id)))
    .limit(1);

  if (user) {
    const token = nanoid(48);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
    await db.insert(schema.passwordResets).values({
      token,
      userId: user.id,
      expiresAt,
    });

    // URL absoluta del tenant: host del request + prefijo /{slug} si aplica.
    const baseUrl = await requestBaseUrl();
    const resetUrl = `${baseUrl}${ctx.tp(`/reset-password?token=${token}`)}`;
    const firstName = user.name?.split(" ")[0] ?? "";
    await sendEmail({
      to: user.email,
      subject: `Restablece tu contraseña — ${ctx.branding.siteName}`,
      html: passwordResetEmailHtml(firstName, resetUrl),
      text: `Restablece tu contraseña visitando: ${resetUrl}\n\nEl link es válido por ${TOKEN_TTL_MIN} minutos. Si no fuiste tú, ignora este correo.`,
    });
  }

  return NextResponse.json({ ok: true });
}
