import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const optionShape = z
  .object({
    k: z.string().min(1).max(10).optional(),
    t: z.string().min(1).max(500).optional(),
    key: z.string().min(1).max(10).optional(),
    text: z.string().min(1).max(500).optional(),
  })
  .refine((o) => (o.k ?? o.key) && (o.t ?? o.text), { message: "option needs key + text" });

const body = z
  .object({
    code: z.string().min(1).max(20).optional(),
    title: z.string().min(1).max(200).optional(),
    kind: z.string().min(1).max(30).optional(),
    question: z.string().min(1).max(5000).optional(),
    body: z.string().max(10000).optional().nullable(),
    options: z.array(optionShape).min(2).max(6).optional(),
    correctKey: z.string().min(1).max(10).optional(),
    hint: z.string().max(1000).optional().nullable(),
    explanation: z.string().max(5000).optional().nullable(),
    xpReward: z.number().int().min(0).max(10000).optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.options && data.correctKey) {
      const keys = data.options.map((o) => (o.k ?? o.key)!);
      if (!keys.includes(data.correctKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "correctKey must match one of the options keys",
          path: ["correctKey"],
        });
      }
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "option keys must be unique",
          path: ["options"],
        });
      }
    }
  });

function normalizeOptions(
  opts: NonNullable<z.infer<typeof body>["options"]>,
  correctKey: string,
): { k: string; t: string; correct?: boolean }[] {
  return opts.map((o) => {
    const k = (o.k ?? o.key)!;
    const t = (o.t ?? o.text)!;
    const out: { k: string; t: string; correct?: boolean } = { k, t };
    if (k === correctKey) out.correct = true;
    return out;
  });
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
    const update: Record<string, unknown> = { ...data };
    if (data.options && data.correctKey) {
      update.options = normalizeOptions(data.options, data.correctKey);
    } else if (data.options) {
      // need correctKey to mark correct; fall back to looking up current
      const [current] = await db
        .select({ correctKey: schema.lessons.correctKey })
        .from(schema.lessons)
        .where(eq(schema.lessons.id, id))
        .limit(1);
      const ck = current?.correctKey ?? "";
      update.options = normalizeOptions(data.options, ck);
    }
    const [row] = await db
      .update(schema.lessons)
      .set(update)
      .where(eq(schema.lessons.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ lesson: row });
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
  await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
  return NextResponse.json({ ok: true });
}
