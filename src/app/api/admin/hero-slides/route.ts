import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { slideBody } from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

/**
 * Slides del hero del tenant (heroType='slider'). Tenant-scoped vía requireAdmin
 * + getTenantCtx. GET lista; POST crea al final del orden.
 */

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const slides = await db
    .select()
    .from(schema.heroSlides)
    .where(eq(schema.heroSlides.tenantId, ctx.tenant.id))
    .orderBy(asc(schema.heroSlides.sortOrder));
  return NextResponse.json({ slides });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let data;
  try {
    data = slideBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${schema.heroSlides.sortOrder}), -1) + 1` })
    .from(schema.heroSlides)
    .where(eq(schema.heroSlides.tenantId, ctx.tenant.id));

  const [row] = await db
    .insert(schema.heroSlides)
    .values({ tenantId: ctx.tenant.id, sortOrder: next, ...data })
    .returning();
  return NextResponse.json({ slide: row });
}
