import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  programId: z.string().uuid(),
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
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

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.modules)
      .values({
        programId: data.programId,
        code: data.code,
        title: data.title,
        description: data.description ?? null,
        weekLabel: data.weekLabel ?? null,
        isBig: data.isBig ?? false,
        xpReward: data.xpReward ?? 60,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    await recalcModulesCount(data.programId);
    return NextResponse.json({ module: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
