import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  emoji: z.string().max(8).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.categories)
      .values({
        name: data.name,
        slug: data.slug,
        emoji: data.emoji || null,
        color: data.color || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return NextResponse.json({ category: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
