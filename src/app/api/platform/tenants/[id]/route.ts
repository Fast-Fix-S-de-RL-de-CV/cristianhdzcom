import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH de un tenant desde /superadmin: cambiar plan, planStatus o
 * status (suspender/reactivar). Solo superadmin de la SaaS.
 */

const body = z
  .object({
    plan: z.enum(["basico", "pro"]).optional(),
    planStatus: z.enum(["trial", "active", "past_due", "suspended"]).optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((d) => d.plan || d.planStatus || d.status, { message: "empty_patch" });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { id } = await ctx.params;
    const data = body.parse(await req.json());

    const patch: Partial<typeof schema.tenants.$inferInsert> = {};
    if (data.plan) patch.plan = data.plan;
    if (data.planStatus) patch.planStatus = data.planStatus;
    if (data.status) patch.status = data.status;

    const [updated] = await db
      .update(schema.tenants)
      .set(patch)
      .where(eq(schema.tenants.id, id))
      .returning({
        id: schema.tenants.id,
        slug: schema.tenants.slug,
        name: schema.tenants.name,
        plan: schema.tenants.plan,
        planStatus: schema.tenants.planStatus,
        status: schema.tenants.status,
      });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true, tenant: updated });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    console.error("[platform/tenants/:id]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
