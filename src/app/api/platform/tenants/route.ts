import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Lista de tenants para el panel /superadmin (solo superadmin de la SaaS).
 * Incluye counts de users y orders por tenant vía subqueries.
 */

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const rows = await db
      .select({
        id: schema.tenants.id,
        slug: schema.tenants.slug,
        name: schema.tenants.name,
        customDomain: schema.tenants.customDomain,
        domainVerified: schema.tenants.domainVerified,
        plan: schema.tenants.plan,
        planStatus: schema.tenants.planStatus,
        trialEndsAt: schema.tenants.trialEndsAt,
        status: schema.tenants.status,
        createdAt: schema.tenants.createdAt,
        userCount: sql<number>`(select count(*) from users u where u.tenant_id = tenants.id)`.mapWith(Number),
        orderCount: sql<number>`(select count(*) from orders o where o.tenant_id = tenants.id)`.mapWith(Number),
      })
      .from(schema.tenants)
      .orderBy(desc(schema.tenants.createdAt));

    return NextResponse.json({ tenants: rows });
  } catch (e) {
    console.error("[platform/tenants]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
