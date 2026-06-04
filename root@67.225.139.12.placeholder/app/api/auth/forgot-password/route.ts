import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

const TOKEN_TTL_MIN = 60;

export async function POST(req: Request) {
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

  // Look up user. We intentionally DO NOT leak whether the email exists —
  // always return success so attackers can't enumerate accounts.
  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (user) {
    const token = nanoid(48);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
    await db.insert(schema.passwordResets).values({
      token,
      userId: user.id,
      expiresAt,
    });

    const baseUrl = process.env.PUBLIC_SITE_URL || "https://cristianhdz.com";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const firstName = user.name?.split(" ")[0] ?? "";
    await sendEmail({
      to: user.email,
      subject: "Restablece tu contraseña — Cristian Hernández",
      html: passwordResetEmailHtml(firstName, resetUrl),
      text: `Restablece tu contraseña visitando: ${resetUrl}\n\nEl link es válido por ${TOKEN_TTL_MIN} minutos. Si no fuiste tú, ignora este correo.`,
    });
  }

  return NextResponse.json({ ok: true });
}
