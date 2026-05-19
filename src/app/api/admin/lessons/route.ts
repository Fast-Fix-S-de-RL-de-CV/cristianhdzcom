import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// NOTE: schema stores options as { k, t, correct? }. We accept both {k,t} and
// {key,text} from the client and normalize to {k,t}. correct flag is derived
// from `correctKey` matching the key (`k`).
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
    moduleId: z.string().uuid(),
    code: z.string().min(1).max(20),
    title: z.string().min(1).max(200),
    kind: z.string().min(1).max(30).default("multiple_choice"),
    question: z.string().min(1).max(5000),
    body: z.string().max(10000).optional().nullable(),
    options: z.array(optionShape).min(2).max(6),
    correctKey: z.string().min(1).max(10),
    hint: z.string().max(1000).optional().nullable(),
    explanation: z.string().max(5000).optional().nullable(),
    xpReward: z.number().int().min(0).max(10000).optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

function normalizeOptions(
  opts: z.infer<typeof body>["options"],
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

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.lessons)
      .values({
        moduleId: data.moduleId,
        code: data.code,
        title: data.title,
        kind: data.kind,
        question: data.question,
        body: data.body ?? null,
        options: normalizeOptions(data.options, data.correctKey),
        correctKey: data.correctKey,
        hint: data.hint ?? null,
        explanation: data.explanation ?? null,
        xpReward: data.xpReward ?? 15,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return NextResponse.json({ lesson: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

