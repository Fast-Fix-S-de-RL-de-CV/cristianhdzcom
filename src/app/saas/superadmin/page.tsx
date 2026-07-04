import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSuperAdmin } from "@/lib/auth";
import { SuperadminClient, type TenantAdminRow } from "./SuperadminClient";

export const dynamic = "force-dynamic";

/**
 * Panel superadmin de la SaaS (mimarca.app/superadmin — realm plataforma).
 * Protegido con requireSuperAdmin(); si no hay sesión de plataforma se
 * muestra el login inline (postea a /api/platform/superadmin/login).
 */

export default async function SuperadminPage() {
  let authed = true;
  try {
    await requireSuperAdmin();
  } catch {
    authed = false;
  }

  if (!authed) {
    return <SuperadminClient authed={false} tenants={[]} />;
  }

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
      userCount: sql<number>`(select count(*) from ${schema.users} where ${schema.users.tenantId} = ${schema.tenants.id})`.mapWith(Number),
      orderCount: sql<number>`(select count(*) from ${schema.orders} where ${schema.orders.tenantId} = ${schema.tenants.id})`.mapWith(Number),
      // Admin a impersonar: owner del tenant o, si no hay, el admin más antiguo.
      adminUserId: sql<string | null>`coalesce(${schema.tenants.ownerUserId}, (select u.id from ${schema.users} u where u.tenant_id = ${schema.tenants.id} and u.role in ('admin','superadmin') order by u.created_at asc limit 1))`,
    })
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt));

  const tenants: TenantAdminRow[] = rows.map((r) => ({
    ...r,
    trialEndsAt: r.trialEndsAt ? r.trialEndsAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <SuperadminClient authed tenants={tenants} />;
}
