import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSuperAdmin, startImpersonation } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Impersonar al admin/owner de un tenant desde /superadmin (solo sesión).
 * Solo superadmin de la SaaS. El target debe ser un usuario de tenant
 * (tenantId != null) y admin/owner. Responde { redirectUrl: "/{slug}/admin" }.
 */

export async function POST(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await ctx.params;

  const [target] = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      tenantId: schema.users.tenantId,
      slug: schema.tenants.slug,
      ownerUserId: schema.tenants.ownerUserId,
      tenantStatus: schema.tenants.status,
    })
    .from(schema.users)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.users.tenantId))
    .where(and(eq(schema.users.id, userId)))
    .limit(1);

  if (!target || !target.tenantId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Solo admin/owner del tenant (decisión de producto).
  const isAdminOrOwner =
    target.role === "admin" || target.role === "superadmin" || target.id === target.ownerUserId;
  if (!isAdminOrOwner) {
    return NextResponse.json({ error: "not_impersonable" }, { status: 400 });
  }

  await startImpersonation(target.id);

  return NextResponse.json({ ok: true, redirectUrl: `/${target.slug}/admin` });
}
