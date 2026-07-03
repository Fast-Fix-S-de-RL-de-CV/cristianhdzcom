import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/categories/bulk-delete
 * Body: { ids: number[] }   (serial PKs)
 */
const Body = z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) });

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
  const { ids } = parsed.data;
  try {
    const result = await db
      .delete(schema.categories)
      .where(and(inArray(schema.categories.id, ids), eq(schema.categories.tenantId, ctx.tenant.id)))
      .returning({ id: schema.categories.id });
    return NextResponse.json({ ok: true, deleted: result.length });
  } catch (e: unknown) {
    // categories.id is referenced by posts.category_id with ON DELETE SET NULL,
    // so this should not actually fail with FK violation — but guard anyway in
    // case a future migration tightens it.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("violates foreign key constraint")) {
      return NextResponse.json({ error: "in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
