import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const result = await db
    .delete(schema.services)
    .where(and(inArray(schema.services.id, parsed.data.ids), eq(schema.services.tenantId, ctx.tenant.id)))
    .returning({ id: schema.services.id });
  return NextResponse.json({ ok: true, deleted: result.length });
}
