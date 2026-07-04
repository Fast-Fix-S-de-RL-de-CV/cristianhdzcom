import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { slideBody } from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

/** Update parcial / borrado de un slide (tenant-scoped). Soporta reordenar vía sortOrder. */
const patchBody = slideBody.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const { id } = await ctx.params;
  let data;
  try {
    data = patchBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [row] = await db
    .update(schema.heroSlides)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.heroSlides.id, id), eq(schema.heroSlides.tenantId, tctx.tenant.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ slide: row });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tctx = await getTenantCtx();
  if (!tctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const { id } = await ctx.params;
  const [row] = await db
    .delete(schema.heroSlides)
    .where(and(eq(schema.heroSlides.id, id), eq(schema.heroSlides.tenantId, tctx.tenant.id)))
    .returning({ id: schema.heroSlides.id });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
