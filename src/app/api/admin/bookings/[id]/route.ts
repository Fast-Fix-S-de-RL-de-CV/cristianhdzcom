import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { bookingServiceBaseSchema } from "../_schema";

export const dynamic = "force-dynamic";

const PartialBody = bookingServiceBaseSchema.partial().transform((data) => ({
  ...data,
  ...(data.slug ? { slug: data.slug.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() } : {}),
}));

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantCtx = await getTenantCtx();
  if (!tenantCtx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const { id } = await ctx.params;

  let data;
  try {
    data = PartialBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const [service] = await db
      .update(schema.bookingServices)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.bookingServices.id, id), eq(schema.bookingServices.tenantId, tenantCtx.tenant.id)))
      .returning();
    if (!service) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ service });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error("[admin/bookings/:id]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantCtx = await getTenantCtx();
  if (!tenantCtx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const { id } = await ctx.params;
  await db
    .delete(schema.bookingServices)
    .where(and(eq(schema.bookingServices.id, id), eq(schema.bookingServices.tenantId, tenantCtx.tenant.id)));
  return NextResponse.json({ ok: true });
}
