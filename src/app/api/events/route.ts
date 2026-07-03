import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { gte, asc, and, eq } from "drizzle-orm";
import { getTenantCtx } from "@/lib/tenant";

// GET /api/events?limit=10 — upcoming events ordered by startsAt
export async function GET(req: Request) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
  const events = await db
    .select()
    .from(schema.events)
    .where(and(gte(schema.events.startsAt, new Date()), eq(schema.events.tenantId, ctx.tenant.id)))
    .orderBy(asc(schema.events.startsAt))
    .limit(limit);
  return NextResponse.json(events);
}
