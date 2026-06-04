import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/leads/quote
 *
 * Captura de prospectos del micrositio Fast Fix (formulario "Cotiza tu
 * proyecto"). Guarda en `leads` (upsert por email) con toda la info en
 * `metadata`, y manda un correo de aviso con el detalle.
 *
 * El prospecto aparece en /admin/prospectos (source = "fast-fix",
 * tag = tipo de proyecto). Nombre/teléfono/notas/presupuesto viven en
 * metadata para no perder nada.
 */
const Body = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().max(40).optional().nullable(),
  projectType: z.string().min(1).max(120),
  budget: z.string().max(120).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
});

export async function POST(req: Request) {
  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const metadata = {
    via: "fast-fix-quote",
    name: data.name,
    phone: data.phone ?? null,
    projectType: data.projectType,
    budget: data.budget ?? null,
    notes: data.notes ?? null,
    submittedAt: new Date().toISOString(),
  } as Record<string, unknown>;

  // Upsert por email: si ya existe el prospecto, refrescamos tag + metadata.
  try {
    await db
      .insert(schema.leads)
      .values({
        email: data.email,
        source: "fast-fix",
        tag: data.projectType.slice(0, 60),
        metadata,
      })
      .onConflictDoUpdate({
        target: schema.leads.email,
        set: {
          source: "fast-fix",
          tag: data.projectType.slice(0, 60),
          metadata,
        },
      });
  } catch (e) {
    console.error("[leads/quote] db error:", (e as Error).message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Aviso por correo (best-effort, no rompe el alta si falla el SMTP).
  const subject = `🚀 Nuevo prospecto Fast Fix — ${data.projectType}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 12px">Nuevo prospecto desde Fast Fix</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:130px">Nombre</td><td style="padding:6px 0;font-weight:600">${esc(data.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Correo</td><td style="padding:6px 0"><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Teléfono</td><td style="padding:6px 0">${esc(data.phone || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Proyecto</td><td style="padding:6px 0;font-weight:600">${esc(data.projectType)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Presupuesto</td><td style="padding:6px 0">${esc(data.budget || "—")}</td></tr>
      </table>
      ${data.notes ? `<div style="margin-top:14px"><div style="color:#64748b;font-size:13px;margin-bottom:4px">Notas</div><div style="background:#f1f5f9;border-radius:10px;padding:12px;white-space:pre-wrap">${esc(data.notes)}</div></div>` : ""}
      <p style="color:#94a3b8;font-size:12px;margin-top:18px">Capturado en cristianhdz.com/empresas/fast-fix</p>
    </div>`;
  sendEmail({
    to: process.env.FASTFIX_LEADS_TO || process.env.MAIL_TO || "info@cristianhdz.com",
    subject,
    html,
    replyTo: data.email,
  }).catch((err) => console.error("[leads/quote] email error:", err));

  return NextResponse.json({ ok: true });
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
