import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/comments/bulk-delete
 * Body: { ids: string[] }   (UUIDs)
 */
const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

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
    .delete(schema.comments)
    .where(inArray(schema.comments.id, ids))
    .returning({ id: schema.comments.id });
  return NextResponse.json({ ok: true, deleted: result.length });
}
