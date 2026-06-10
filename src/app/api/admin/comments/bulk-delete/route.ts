import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, inArray, sql } from "drizzle-orm";
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
    .returning({ id: schema.comments.id, postId: schema.comments.postId });

  // Decrementar el contador desnormalizado de cada post afectado
  // (mismo patrón que el delete individual en comments/[id]/route.ts).
  const deletedByPost = new Map<string, number>();
  for (const r of result) {
    deletedByPost.set(r.postId, (deletedByPost.get(r.postId) ?? 0) + 1);
  }
  for (const [postId, n] of deletedByPost) {
    await db
      .update(schema.posts)
      .set({ commentsCount: sql`GREATEST(${schema.posts.commentsCount} - ${n}, 0)` })
      .where(eq(schema.posts.id, postId));
  }

  return NextResponse.json({ ok: true, deleted: result.length });
}
