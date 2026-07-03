import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/payment-settings — devuelve la fila DEL TENANT (con secretos)
 * PUT  /api/admin/payment-settings — upsert de la fila del tenant
 *                                    (UNIQUE(tenant_id) — una por tenant)
 *
 * Son las llaves de pago DEL TENANT (Stripe/PayPal/MP con las que cobra a sus
 * miembros). Endpoint restringido a admins del tenant. NUNCA exponer a
 * usuarios anónimos: los secretos viajan en el JSON (el admin edita el objeto
 * completo y lo re-envía en el PUT). El frontend público de checkout sólo
 * recibe las publishable/public keys vía un endpoint separado y filtrado.
 */
const bankAccountShape = z.object({
  bankName: z.string().min(1).max(80),
  accountHolder: z.string().min(1).max(120),
  accountNumber: z.string().max(40).optional().nullable(),
  clabe: z.string().max(40).optional().nullable(),
  swift: z.string().max(40).optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

const body = z.object({
  stripePublishableKey: z.string().max(200).optional().nullable(),
  stripeSecretKey: z.string().max(200).optional().nullable(),
  stripeWebhookSecret: z.string().max(200).optional().nullable(),
  stripeMode: z.enum(["test", "live"]).optional(),
  paypalClientId: z.string().max(200).optional().nullable(),
  paypalClientSecret: z.string().max(200).optional().nullable(),
  paypalMode: z.enum(["sandbox", "live"]).optional(),
  mpAccessToken: z.string().max(200).optional().nullable(),
  mpPublicKey: z.string().max(200).optional().nullable(),
  bankAccounts: z.array(bankAccountShape).max(10).optional(),
  enableStripe: z.boolean().optional(),
  enablePaypal: z.boolean().optional(),
  enableMercadopago: z.boolean().optional(),
  enableTransfer: z.boolean().optional(),
});

async function loadOrCreate(tenantId: string) {
  const [row] = await db
    .select()
    .from(schema.paymentSettings)
    .where(eq(schema.paymentSettings.tenantId, tenantId))
    .limit(1);
  if (row) return row;
  const [created] = await db.insert(schema.paymentSettings).values({ tenantId }).returning();
  return created;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const row = await loadOrCreate(ctx.tenant.id);
  return NextResponse.json({ settings: row });
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
    data = body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const existing = await loadOrCreate(ctx.tenant.id);
  // Sanitize bank accounts: drop empty rows + coerce nullable optional fields
  // to undefined so they match the jsonb $type schema (which doesn't allow null).
  const bankAccounts = (data.bankAccounts ?? existing.bankAccounts ?? [])
    .filter((b) => b.bankName?.trim() && b.accountHolder?.trim())
    .map((b) => ({
      bankName: b.bankName,
      accountHolder: b.accountHolder,
      accountNumber: b.accountNumber ?? undefined,
      clabe: b.clabe ?? undefined,
      swift: b.swift ?? undefined,
      currency: b.currency ?? undefined,
      instructions: b.instructions ?? undefined,
    }));
  const [updated] = await db
    .update(schema.paymentSettings)
    .set({
      ...data,
      bankAccounts,
      updatedAt: new Date(),
    })
    .where(eq(schema.paymentSettings.tenantId, ctx.tenant.id))
    .returning();
  return NextResponse.json({ settings: updated });
}
