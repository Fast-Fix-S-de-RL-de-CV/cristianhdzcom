import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const body = z
  .object({
    code: z.string().max(40).optional().nullable(),
    startsOn: dateStr.optional(),
    endsOn: dateStr.optional(),
    seatsTotal: z.number().int().positive().max(100000).optional(),
    isOpen: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startsOn && data.endsOn && !(data.startsOn < data.endsOn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startsOn must be before endsOn",
        path: ["startsOn"],
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
    // seatsTaken is intentionally excluded — derived from enrollments
    const [row] = await db
      .update(schema.cohorts)
      .set(data)
      .where(and(eq(schema.cohorts.id, id), eq(schema.cohorts.tenantId, tctx.tenant.id)))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ cohort: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
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
  await db
    .delete(schema.cohorts)
    .where(and(eq(schema.cohorts.id, id), eq(schema.cohorts.tenantId, tctx.tenant.id)));
  return NextResponse.json({ ok: true });
}
