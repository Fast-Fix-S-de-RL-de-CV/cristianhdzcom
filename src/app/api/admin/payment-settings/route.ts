import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/payment-settings — devuelve la fila completa (con secretos)
 * PUT  /api/admin/payment-settings — upsert por id=1 (single-row config)
 *
 * Endpoint restringido a admins. NUNCA exponer a usuarios anónimos: los
 * secretos viajan en el JSON. El frontend público de checkout sólo recibe
 * las publishable/public keys vía un endpoint separado y filtrado.
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

async function loadOrCreate() {
  const [row] = await db.select().from(schema.paymentSettings).limit(1);
  if (row) return row;
  const [created] = await db.insert(schema.paymentSettings).values({}).returning();
  return created;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const row = await loadOrCreate();
  return NextResponse.json({ settings: row });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let data;
  try {
    data = body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const existing = await loadOrCreate();
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
    .where(eq(schema.paymentSettings.id, existing.id))
    .returning();
  return NextResponse.json({ settings: updated });
}
