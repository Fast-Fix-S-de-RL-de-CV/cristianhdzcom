import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { calculateAvailableSlots } from "@/lib/booking";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ slug: string }> }) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const { slug } = await routeCtx.params;
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date_required" }, { status: 400 });
  }

  const [service] = await db
    .select()
    .from(schema.bookingServices)
    .where(and(eq(schema.bookingServices.tenantId, ctx.tenant.id), eq(schema.bookingServices.slug, slug)))
    .limit(1);
  if (!service || !service.isActive) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await calculateAvailableSlots({
    service,
    date,
    clientTimezone: req.nextUrl.searchParams.get("tz"),
  });
  return NextResponse.json(result);
}
