import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const [row] = await db
    .update(schema.posts)
    .set({ pinned: sql`NOT ${schema.posts.pinned}` })
    .where(eq(schema.posts.id, id))
    .returning({ id: schema.posts.id, pinned: schema.posts.pinned });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ pinned: row.pinned });
}
