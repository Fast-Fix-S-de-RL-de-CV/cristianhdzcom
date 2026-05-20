import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Strict slug regex matching the client-side `isValidSlug`:
//   lowercase a-z0-9, single dashes between segments, no leading/trailing dash.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const body = z
  .object({
    title: z.string().min(2).max(200),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(SLUG_RE, { message: "slug debe ser kebab-case (a-z, 0-9 y guiones simples)" }),
    subtitle: z.string().max(2000).optional().nullable(),
    type: z.string().min(2).max(40),
    durationLabel: z.string().max(80).optional().nullable(),
    currency: z.enum(["USD", "MXN", "EUR"]).optional(),
    priceUsd: z.number().int().min(0).default(0),
    priceCompareUsd: z.number().int().positive().nullable().optional(),
    installmentPriceUsd: z.number().int().positive().nullable().optional(),
    installmentCount: z.number().int().positive().nullable().optional(),
    pricePerMonth: z.number().int().positive().nullable().optional(),
    pricePerYear: z.number().int().positive().nullable().optional(),
    accent: z.enum(["accent", "warm", "green", "navy", "gold"]).optional(),
    description: z.string().max(5000).optional().nullable(),
    bullets: z.array(z.string().min(1).max(140)).max(20).optional(),
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
  })
  .superRefine((data, ctx) => {
    // Precio comparativo (tachado) debe ser MAYOR que el precio único.
    if (data.priceCompareUsd != null && data.priceUsd > 0 && data.priceCompareUsd <= data.priceUsd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceCompareUsd"],
        message: "El precio comparativo debe ser MAYOR al precio único (es el precio 'tachado').",
      });
    }
    // Plan de pagos: si se define uno, deben venir AMBOS campos.
    if ((data.installmentPriceUsd != null) !== (data.installmentCount != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentCount"],
        message: "Si activas plan de pagos, debes definir precio por mensualidad Y número de mensualidades.",
      });
    }
    // Plan de pagos: el total debe ser ≥ al precio único (no es lógico vender más barato a plazos).
    if (
      data.installmentPriceUsd != null &&
      data.installmentCount != null &&
      data.priceUsd > 0 &&
      data.installmentPriceUsd * data.installmentCount < data.priceUsd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentPriceUsd"],
        message: `El plan de pagos (${data.installmentCount} × ${data.installmentPriceUsd}) suma menos que el precio único. Sube el precio mensual o reduce el número de mensualidades.`,
      });
    }
  });

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.programs)
      .values({
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle || null,
        type: data.type,
        durationLabel: data.durationLabel || null,
        currency: data.currency ?? "USD",
        priceUsd: data.priceUsd,
        priceCompareUsd: data.priceCompareUsd ?? null,
        installmentPriceUsd: data.installmentPriceUsd ?? null,
        installmentCount: data.installmentCount ?? null,
        pricePerMonth: data.pricePerMonth ?? null,
        pricePerYear: data.pricePerYear ?? null,
        accent: data.accent ?? "accent",
        description: data.description ?? null,
        bullets: data.bullets ?? [],
        coverUrl: data.coverUrl ?? null,
        coverKind: data.coverKind ?? null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      })
      .returning();
    return NextResponse.json({ program: row });
  } catch (e: unknown) {
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
