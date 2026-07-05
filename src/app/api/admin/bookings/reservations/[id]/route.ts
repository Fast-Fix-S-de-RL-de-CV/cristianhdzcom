import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
});

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
    data = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [reservation] = await db
    .update(schema.bookingReservations)
    .set({ status: data.status, updatedAt: new Date() })
    .where(and(eq(schema.bookingReservations.id, id), eq(schema.bookingReservations.tenantId, tenantCtx.tenant.id)))
    .returning();
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ reservation });
}
