import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { incompleteVideoLessons } from "@/lib/courseReadiness";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const body = z
  .object({
    title: z.string().min(2).max(200).optional(),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(SLUG_RE, { message: "slug debe ser kebab-case (a-z, 0-9 y guiones simples)" })
      .optional(),
    subtitle: z.string().max(2000).optional().nullable(),
    type: z.string().min(2).max(40).optional(),
    durationLabel: z.string().max(80).optional().nullable(),
    currency: z.enum(["USD", "MXN", "EUR"]).optional(),
    priceUsd: z.number().int().min(0).optional(),
    priceCompareUsd: z.number().int().positive().nullable().optional(),
    installmentPriceUsd: z.number().int().positive().nullable().optional(),
    installmentCount: z.number().int().positive().nullable().optional(),
    pricePerMonth: z.number().int().positive().nullable().optional(),
    pricePerYear: z.number().int().positive().nullable().optional(),
    accent: z.enum(["accent", "warm", "green", "navy", "gold"]).optional(),
    description: z.string().max(5000).optional().nullable(),
    bullets: z.array(z.string().min(1).max(140)).max(20).optional(),
    whoFor: z.array(z.object({ t: z.string().max(160), d: z.string().max(600) })).max(8).optional(),
    faqs: z.array(z.object({ q: z.string().max(240), a: z.string().max(1500) })).max(15).optional(),
    coverUrl: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .refine(
        (v) => v == null || v === "" || /^https?:\/\//.test(v) || v.startsWith("/"),
        { message: "coverUrl debe ser URL absoluta o path /uploads/..." },
      ),
    coverKind: z.enum(["image", "video"]).nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    includedInMembership: z.enum(["silver", "gold", "black"]).nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.priceCompareUsd != null &&
      data.priceUsd != null &&
      data.priceUsd > 0 &&
      data.priceCompareUsd <= data.priceUsd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceCompareUsd"],
        message: "El precio comparativo debe ser MAYOR al precio único.",
      });
    }
    if ((data.installmentPriceUsd != null) !== (data.installmentCount != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentCount"],
        message: "Plan de pagos requiere precio mensual Y número de mensualidades.",
      });
    }
    if (
      data.installmentPriceUsd != null &&
      data.installmentCount != null &&
      data.priceUsd != null &&
      data.priceUsd > 0 &&
      data.installmentPriceUsd * data.installmentCount < data.priceUsd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentPriceUsd"],
        message: "El plan de pagos suma menos que el precio único.",
      });
    }
  });

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  try {
    const data = body.parse(await req.json());

    // Gate de activación: un curso solo puede ponerse ACTIVO si todas sus
    // lecciones de video tienen un link válido. Como borrador no se exige.
    if (data.isActive === true) {
      // incompleteVideoLessons no filtra por tenant: verificar primero que el
      // programa pertenezca al tenant del request.
      const [owned] = await db
        .select({ id: schema.programs.id })
        .from(schema.programs)
        .where(and(eq(schema.programs.id, id), eq(schema.programs.tenantId, tctx.tenant.id)))
        .limit(1);
      if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const pending = await incompleteVideoLessons(id, tctx.tenant.id);
      if (pending.length > 0) {
        return NextResponse.json(
          {
            error: "incomplete_videos",
            message: `No puedes activar el curso: ${pending.length} ${
              pending.length === 1 ? "lección de video no tiene" : "lecciones de video no tienen"
            } su link completo.`,
            count: pending.length,
            lessons: pending,
          },
          { status: 409 },
        );
      }
    }

    const [row] = await db
      .update(schema.programs)
      .set(data)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.tenantId, tctx.tenant.id)))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ program: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    const code =
      (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "slug_in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  // orders.programId no tiene onDelete: cualquier orden (pagada o pendiente)
  // bloquea el DELETE a nivel FK. Pre-check para responder algo legible.
  const [order] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.programId, id), eq(schema.orders.tenantId, tctx.tenant.id)))
    .limit(1);
  if (order) {
    return NextResponse.json({ error: "has_paid_orders" }, { status: 409 });
  }
  try {
    await db
      .delete(schema.programs)
      .where(and(eq(schema.programs.id, id), eq(schema.programs.tenantId, tctx.tenant.id)));
  } catch (e) {
    const code =
      (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (e as { code?: string })?.code;
    if (code === "23503") {
      return NextResponse.json({ error: "in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
