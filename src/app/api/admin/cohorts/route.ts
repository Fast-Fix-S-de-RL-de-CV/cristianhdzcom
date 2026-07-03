import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const body = z
  .object({
    programId: z.string().uuid(),
    code: z.string().max(40).optional().nullable(),
    startsOn: dateStr,
    endsOn: dateStr,
    seatsTotal: z.number().int().positive().max(100000).optional(),
    isOpen: z.boolean().optional(),
  })
  .refine((d) => d.startsOn < d.endsOn, {
    message: "startsOn must be before endsOn",
    path: ["startsOn"],
  });

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  try {
    const data = body.parse(await req.json());
    // El programa destino debe pertenecer al tenant del request.
    const [program] = await db
      .select({ id: schema.programs.id })
      .from(schema.programs)
      .where(and(eq(schema.programs.id, data.programId), eq(schema.programs.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!program) return NextResponse.json({ error: "program_not_found" }, { status: 404 });
    const [row] = await db
      .insert(schema.cohorts)
      .values({
        tenantId: ctx.tenant.id,
        programId: data.programId,
        code: data.code ?? null,
        startsOn: data.startsOn,
        endsOn: data.endsOn,
        seatsTotal: data.seatsTotal ?? 30,
        isOpen: data.isOpen ?? true,
      })
      .returning();
    return NextResponse.json({ cohort: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
