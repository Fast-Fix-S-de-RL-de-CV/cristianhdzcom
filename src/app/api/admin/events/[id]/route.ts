import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  host: z.string().max(200).optional().nullable(),
  startsAt: z
    .string()
    .datetime()
    .refine((s) => new Date(s).getTime() > Date.now() - 60000, "startsAt_must_be_future")
    .optional(),
  durationMinutes: z.number().int().min(5).max(1440).optional(),
  capacity: z.number().int().min(1).optional(),
  attending: z.number().int().min(0).optional(),
  isLive: z.boolean().optional(),
  hot: z.boolean().optional(),
  link: z.string().max(2000).optional().nullable(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const data = body.parse(await req.json());
    const { startsAt, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };
    if (startsAt) update.startsAt = new Date(startsAt);

    if (data.attending !== undefined) {
      let effectiveCapacity = data.capacity;
      if (effectiveCapacity === undefined) {
        const existing = await db
          .select({ capacity: schema.events.capacity })
          .from(schema.events)
          .where(eq(schema.events.id, id))
          .limit(1);
        if (!existing[0]) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }
        effectiveCapacity = existing[0].capacity ?? undefined;
      }
      if (effectiveCapacity !== undefined && data.attending > effectiveCapacity) {
        return NextResponse.json(
          { error: "attending_exceeds_capacity" },
          { status: 400 },
        );
      }
    }

    const [row] = await db
      .update(schema.events)
      .set(update)
      .where(eq(schema.events.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ event: row });
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
  await db.delete(schema.events).where(eq(schema.events.id, id));
  return NextResponse.json({ ok: true });
}
