import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/programs/bulk-delete
 * Body: { ids: string[] }   (UUIDs)
 *
 * Deletes programs (cursos / talleres / certificaciones / consultorías) and
 * their dependent rows (modules, lessons, cohorts, enrollments) via cascade.
 *
 * IMPORTANT: orders.programId is references-only (no cascade defined). If a
 * program has paid orders, we refuse to delete it to protect the sales
 * history — admin can deactivate it instead.
 */
const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { ids } = parsed.data;

  // Programs with any successful order: protect them.
  const withOrders = await db
    .select({ id: schema.orders.programId })
    .from(schema.orders)
    .where(and(inArray(schema.orders.programId, ids), eq(schema.orders.status, "succeeded")))
    .groupBy(schema.orders.programId);
  const lockedIds = new Set(withOrders.map((r) => r.id).filter(Boolean) as string[]);
  const eligible = ids.filter((id) => !lockedIds.has(id));

  if (eligible.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        deleted: 0,
        blocked: [...lockedIds].map((id) => ({ id, reason: "has_paid_orders" })),
      },
      { status: 409 },
    );
  }

  try {
    const result = await db
      .delete(schema.programs)
      .where(inArray(schema.programs.id, eligible))
      .returning({ id: schema.programs.id });
    return NextResponse.json({
      ok: true,
      deleted: result.length,
      blocked: [...lockedIds].map((id) => ({ id, reason: "has_paid_orders" })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("violates foreign key constraint")) {
      return NextResponse.json({ error: "in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
