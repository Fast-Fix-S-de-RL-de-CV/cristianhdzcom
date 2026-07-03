import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantCtx = await getTenantCtx();
  if (!tenantCtx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  const { id } = await ctx.params;
  const existing = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tenantCtx.tenant.id)))
    .limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await db
    .delete(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.tenantId, tenantCtx.tenant.id)));
  return NextResponse.json({ ok: true });
}
