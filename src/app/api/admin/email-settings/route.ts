import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { sendTenantEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const Body = z.object({
  fromName: z.string().trim().max(120).nullable().optional(),
  fromEmail: z.string().trim().email().max(320).nullable().optional().or(z.literal("").transform(() => null)),
  replyToEmail: z.string().trim().email().max(320).nullable().optional().or(z.literal("").transform(() => null)),
  smtpHost: z.string().trim().max(200).nullable().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpSecure: z.boolean().default(true),
  smtpUser: z.string().trim().max(320).nullable().optional(),
  smtpPass: z.string().max(2000).nullable().optional(),
  enableSmtp: z.boolean().default(false),
  enableBookingReminders: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const [settings] = await db
    .select()
    .from(schema.emailSettings)
    .where(eq(schema.emailSettings.tenantId, ctx.tenant.id))
    .limit(1);

  return NextResponse.json({
    settings: settings
      ? { ...settings, smtpPass: settings.smtpPass ? "********" : "" }
      : {
          fromName: ctx.branding.siteName,
          fromEmail: "",
          replyToEmail: "",
          smtpHost: "",
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: "",
          smtpPass: "",
          enableSmtp: false,
          enableBookingReminders: true,
        },
    globalConfigured: !!(process.env.SMTP_HOST || process.env.RESEND_API_KEY),
  });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.emailSettings)
    .where(eq(schema.emailSettings.tenantId, ctx.tenant.id))
    .limit(1);

  const values = {
    tenantId: ctx.tenant.id,
    fromName: data.fromName || null,
    fromEmail: data.fromEmail || null,
    replyToEmail: data.replyToEmail || null,
    smtpHost: data.smtpHost || null,
    smtpPort: data.smtpPort,
    smtpSecure: data.smtpSecure,
    smtpUser: data.smtpUser || null,
    smtpPass: data.smtpPass === "********" ? existing?.smtpPass ?? null : data.smtpPass || null,
    enableSmtp: data.enableSmtp,
    enableBookingReminders: data.enableBookingReminders,
    updatedAt: new Date(),
  };

  const [settings] = existing
    ? await db.update(schema.emailSettings).set(values).where(eq(schema.emailSettings.id, existing.id)).returning()
    : await db.insert(schema.emailSettings).values(values).returning();

  return NextResponse.json({ ok: true, settings: { ...settings, smtpPass: settings.smtpPass ? "********" : "" } });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" && body.to.includes("@") ? body.to : null;
  if (!to) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const result = await sendTenantEmail({
    tenantId: ctx.tenant.id,
    to,
    subject: `Prueba de correo de ${ctx.branding.siteName}`,
    html: `<p>Este es un correo de prueba de <strong>${ctx.branding.siteName}</strong>.</p>`,
    text: `Este es un correo de prueba de ${ctx.branding.siteName}.`,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
