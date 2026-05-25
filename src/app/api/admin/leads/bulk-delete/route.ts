import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/leads/bulk-delete
 * Body: { ids: number[] }   (serial PKs — leads.id is integer)
 *
 * Leads are captured emails (newsletter / popups / lead magnets) without a
 * registered account. Deleting them has no side effects — no cascades needed.
 * If the same email later registers as a user, the leads row remains
 * historical; deleting it just drops the marketing-funnel record.
 */
const Body = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) });

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
  const result = await db
    .delete(schema.leads)
    .where(inArray(schema.leads.id, ids))
    .returning({ id: schema.leads.id });
  return NextResponse.json({ ok: true, deleted: result.length });
}
