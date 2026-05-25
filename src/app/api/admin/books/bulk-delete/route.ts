import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/books/bulk-delete
 * Body: { ids: string[] }   (UUIDs)
 *
 * Books no tienen FK desde otras tablas (la compra se trackea en `orders` que
 * solo guarda metadata, no FK al libro). Borrar es safe.
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
  const result = await db
    .delete(schema.books)
    .where(inArray(schema.books.id, parsed.data.ids))
    .returning({ id: schema.books.id });
  return NextResponse.json({ ok: true, deleted: result.length });
}
