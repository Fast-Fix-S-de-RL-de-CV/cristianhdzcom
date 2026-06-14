import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { parseVideoUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

const optionShape = z
  .object({
    k: z.string().min(1).max(10).optional(),
    t: z.string().min(1).max(500).optional(),
    key: z.string().min(1).max(10).optional(),
    text: z.string().min(1).max(500).optional(),
  })
  .refine((o) => (o.k ?? o.key) && (o.t ?? o.text), { message: "option needs key + text" });

const QUIZ_KINDS = ["multiple_choice", "true_false", "fill_blank"] as const;
type QuizKind = (typeof QUIZ_KINDS)[number];

/**
 * Lesson body accepts either a "quiz-style" lesson (kind in QUIZ_KINDS) with
 * question + options + correctKey, OR a "video" lesson (kind="video") with a
 * `videoUrl` we parse into provider + id. Open / fill_blank can still come
 * without quiz fields.
 */
const body = z
  .object({
    moduleId: z.string().uuid(),
    code: z.string().min(1).max(20),
    title: z.string().min(1).max(200),
    kind: z.enum(["multiple_choice", "true_false", "fill_blank", "open", "video"]).default("multiple_choice"),
    question: z.string().max(5000).optional().nullable(),
    body: z.string().max(20000).optional().nullable(),
    options: z.array(optionShape).max(6).optional(),
    correctKey: z.string().min(1).max(10).optional().nullable(),
    hint: z.string().max(1000).optional().nullable(),
    explanation: z.string().max(5000).optional().nullable(),
    xpReward: z.number().int().min(0).max(10000).optional(),
    sortOrder: z.number().int().optional(),
    // Video — la URL NO es obligatoria ni se valida el formato al crear: se
    // guarda cruda y se resuelve provider/id si parsea (curso como borrador).
    videoUrl: z.string().max(500).optional().nullable(),
    videoDurationSeconds: z.number().int().min(1).max(60 * 60 * 12).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if ((QUIZ_KINDS as readonly string[]).includes(data.kind)) {
      if (!data.question || data.question.trim().length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "question is required for quiz lessons", path: ["question"] });
      }
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "at least 2 options required", path: ["options"] });
      }
      if (!data.correctKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctKey is required for quiz lessons", path: ["correctKey"] });
      }
      if (data.options && data.correctKey) {
        const keys = data.options.map((o) => (o.k ?? o.key)!);
        if (!keys.includes(data.correctKey)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctKey must match one of the option keys", path: ["correctKey"] });
        }
        if (new Set(keys).size !== keys.length) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "option keys must be unique", path: ["options"] });
        }
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

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());

    let videoProvider: string | null = null;
    let videoId: string | null = null;
    const rawVideoUrl = data.kind === "video" && data.videoUrl ? data.videoUrl.trim() : null;
    if (rawVideoUrl) {
      const parsed = parseVideoUrl(rawVideoUrl);
      if (parsed) {
        videoProvider = parsed.provider;
        videoId = parsed.id;
      }
    }

    const [row] = await db
      .insert(schema.lessons)
      .values({
        moduleId: data.moduleId,
        code: data.code,
        title: data.title,
        kind: data.kind,
        question: data.question ?? null,
        body: data.body ?? null,
        options:
          data.kind === "video"
            ? []
            : data.options && data.correctKey
              ? normalizeOptions(data.options, data.correctKey)
              : [],
        correctKey: data.kind === "video" ? null : (data.correctKey ?? null),
        hint: data.hint ?? null,
        explanation: data.explanation ?? null,
        videoProvider,
        videoId,
        videoUrl: rawVideoUrl,
        videoDurationSeconds: data.videoDurationSeconds ?? null,
        xpReward: data.xpReward ?? (data.kind === "video" ? 20 : 15),
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
