import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/site-settings
 *
 * Update parcial de la fila singleton (id=1) con los campos del hero.
 * Si la fila no existe la crea (UPSERT atómico vía INSERT … ON CONFLICT).
 */
const Body = z.object({
  heroChip1Label: z.string().max(80).nullable().optional(),
  heroChip1Pulse: z.boolean().optional(),
  heroChip2Label: z.string().max(80).nullable().optional(),
  heroEyebrow: z.string().max(40).optional(),
  heroTitle: z.string().min(1).max(120).optional(),
  heroSubtitleAccent: z.string().max(80).nullable().optional(),
  heroSubtitleRest: z.string().max(80).nullable().optional(),
  heroBio1: z.string().nullable().optional(),
  heroBio2: z.string().nullable().optional(),
  heroCtaPrimaryLabel: z.string().max(40).optional(),
  heroCtaSecondaryLabel: z.string().max(40).optional(),
  heroPortraitUrl: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || v === "" || /^https?:\/\//.test(v) || v.startsWith("/"), "URL inválida"),
  heroPortraitFooterLine: z.string().max(80).optional(),
  heroPortraitChip: z.string().max(40).optional(),
  heroStats: z
    .array(
      z.object({
        value: z.string().min(1).max(20),
        label: z.string().min(1).max(40),
      }),
    )
    .max(8)
    .optional(),
  heroQuoteText: z.string().nullable().optional(),
  heroQuoteAttrib: z.string().max(80).nullable().optional(),
});

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let data;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // ¿Existe la fila?
  const [existing] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).limit(1);
  if (existing) {
    const [row] = await db
      .update(schema.siteSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.siteSettings.id, 1))
      .returning();
    return NextResponse.json({ settings: row });
  }

  // Crear singleton con id=1
  const [row] = await db
    .insert(schema.siteSettings)
    .values({ id: 1, ...data })
    .returning();
  return NextResponse.json({ settings: row });
}
