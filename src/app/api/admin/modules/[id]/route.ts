import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  code: z.string().min(1).max(20).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  weekLabel: z.string().max(60).optional().nullable(),
  isBig: z.boolean().optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  sortOrder: z.number().int().optional(),
});

async function recalcModulesCount(programId: string) {
  await db.execute(sql`
    UPDATE ${schema.programs}
    SET modules_count = (SELECT COUNT(*)::int FROM ${schema.modules} WHERE program_id = ${programId})
    WHERE id = ${programId}
  `);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .update(schema.modules)
      .set(data)
      .where(eq(schema.modules.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ module: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  // capture programId before delete so we can recalc
  const [existing] = await db
    .select({ programId: schema.modules.programId })
    .from(schema.modules)
    .where(eq(schema.modules.id, id))
    .limit(1);
  await db.delete(schema.modules).where(eq(schema.modules.id, id));
  if (existing) await recalcModulesCount(existing.programId);
  return NextResponse.json({ ok: true });
}
