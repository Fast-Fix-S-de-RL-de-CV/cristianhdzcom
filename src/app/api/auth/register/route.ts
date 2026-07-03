import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { fmtEmail, fmtName } from "@/lib/format";
import { getTenantCtx } from "@/lib/tenant";

/** Base absoluta del request (dominio del tenant o mimarca.app), para links en emails. */
async function requestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-tenant-host") ?? h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (!host) return process.env.PUBLIC_SITE_URL || "https://mimarca.app";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

const body = z.object({
  // Normalización server-side (defensa): minúsculas/sin espacios + Title Case
  // limpiando números/símbolos del nombre.
  email: z.string().trim().email().transform(fmtEmail),
  password: z.string().min(8).max(100),
  name: z
    .string()
    .max(120)
    .transform(fmtName)
    .refine((s) => s.length >= 2, { message: "name_invalid" }),
});

export async function POST(req: Request) {
  try {
    const ctx = await getTenantCtx();
    if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    const data = body.parse(await req.json());
    // Email único POR TENANT (el mismo email puede registrarse en otro tenant).
    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, data.email), eq(schema.users.tenantId, ctx.tenant.id)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "email_in_use" }, { status: 400 });
    }
    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(schema.users)
      .values({ tenantId: ctx.tenant.id, email: data.email, passwordHash, name: data.name, role: "member" })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role });
    await createSession(user.id);

    // Welcome email — fire and forget, never blocks the signup response.
    const firstName = user.name?.split(" ")[0] ?? "";
    const siteName = ctx.branding.siteName;
    const plataformaUrl = `${await requestBaseUrl()}${ctx.tp("/plataforma")}`;
    sendEmail({
      to: user.email,
      subject: `Bienvenido a ${siteName}`,
      html: welcomeEmailHtml(firstName),
      text: `Hola ${firstName},\n\nTu cuenta en ${siteName} está lista. Entra aquí: ${plataformaUrl}\n\n— ${siteName}`,
    }).catch((err) => console.error("[register] welcome email failed:", err));

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
