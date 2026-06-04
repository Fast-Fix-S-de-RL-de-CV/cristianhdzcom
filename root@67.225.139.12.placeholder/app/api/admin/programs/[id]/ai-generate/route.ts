import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, asc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120; // Claude can take up to ~90s on big generations

/**
 * POST /api/admin/programs/[id]/ai-generate
 *
 * Genera módulos + lecciones de un curso usando Claude. Dos modos:
 *
 *   1. `mode: "doc"` — el admin pega/sube material (texto largo) y Claude lo
 *      estructura como curso. Útil cuando ya tienes un libro/PDF/MD y solo
 *      quieres convertirlo en un programa formal.
 *
 *   2. `mode: "scratch"` — el admin solo da un brief (descripción corta del
 *      curso, audiencia, objetivos) y Claude inventa todo desde cero.
 *
 * En ambos casos genera N módulos (default 6) con 3-5 lecciones cada uno,
 * mezclando lecciones de video (con cuerpo ~200 palabras = 5 min) y quizzes
 * de opción múltiple. Inserta directamente en `modules` y `lessons`, y
 * devuelve los IDs creados para que la UI pueda navegar y editar.
 *
 * Requiere ANTHROPIC_API_KEY. Devuelve 503 si no está configurado.
 */
const body = z.object({
  mode: z.enum(["doc", "scratch"]),
  sourceText: z.string().max(60_000).optional().nullable(),
  brief: z.string().min(10).max(2000),
  audience: z.string().max(500).optional().nullable(),
  moduleCount: z.number().int().min(2).max(12).default(6),
  language: z.string().max(20).default("es"),
  /** Si true, reemplaza módulos existentes; si false, agrega al final. */
  replaceExisting: z.boolean().default(false),
});

type GeneratedLesson = {
  code: string;
  title: string;
  kind: "video" | "multiple_choice";
  body?: string;
  question?: string;
  options?: Array<{ k: string; t: string; correct: boolean }>;
  explanation?: string;
  hint?: string;
  estimatedMinutes?: number;
};
type GeneratedModule = {
  code: string;
  title: string;
  description: string;
  weekLabel?: string;
  isBig?: boolean;
  lessons: GeneratedLesson[];
};
type Generated = { modules: GeneratedModule[] };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "anthropic_api_key_missing", message: "Configura ANTHROPIC_API_KEY en .env" },
      { status: 503 },
    );
  }

  // Load program
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1);
  if (!program) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

  // Parse + validate body
  let data;
  try {
    data = body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (data.mode === "doc" && (!data.sourceText || data.sourceText.trim().length < 50)) {
    return NextResponse.json(
      { error: "source_text_required", message: "Pega o sube texto del material fuente (>50 caracteres)." },
      { status: 400 },
    );
  }

  // Call Claude
  let generated: Generated;
  try {
    generated = await callClaude(apiKey, program, data);
  } catch (e) {
    console.error("[ai-generate] Claude error:", e);
    return NextResponse.json(
      { error: "claude_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
  if (!generated.modules || generated.modules.length === 0) {
    return NextResponse.json({ error: "empty_generation" }, { status: 502 });
  }

  // Replace existing if requested
  if (data.replaceExisting) {
    await db.delete(schema.modules).where(eq(schema.modules.programId, program.id));
  }

  // Determine starting sortOrder
  const startOrderRes = (await db.execute(sql`
    SELECT COALESCE(MAX(sort_order), -1)::int + 1 AS next
    FROM modules WHERE program_id = ${program.id}
  `)) as unknown as { rows?: Array<{ next: number }> } | Array<{ next: number }>;
  const startOrderRows = Array.isArray(startOrderRes) ? startOrderRes : (startOrderRes.rows ?? []);
  let nextOrder = startOrderRows[0]?.next ?? 0;

  // Insert modules + lessons
  const moduleIds: string[] = [];
  let totalLessons = 0;
  for (const m of generated.modules) {
    const [insertedMod] = await db
      .insert(schema.modules)
      .values({
        programId: program.id,
        code: m.code || `M${String(nextOrder + 1).padStart(2, "0")}`,
        title: m.title,
        description: m.description ?? null,
        weekLabel: m.weekLabel ?? null,
        isBig: !!m.isBig,
        sortOrder: nextOrder,
        xpReward: m.isBig ? 120 : 80,
      })
      .returning({ id: schema.modules.id });
    nextOrder += 1;
    if (!insertedMod) continue;
    moduleIds.push(insertedMod.id);

    let lessonOrder = 0;
    for (const l of m.lessons) {
      if (l.kind === "video") {
        await db.insert(schema.lessons).values({
          moduleId: insertedMod.id,
          code: l.code || `L${lessonOrder + 1}`,
          title: l.title,
          kind: "video",
          question: l.question ?? null,
          body: l.body ?? null,
          options: [],
          correctKey: null,
          hint: l.hint ?? null,
          explanation: l.explanation ?? null,
          xpReward: 20,
          sortOrder: lessonOrder,
          // No videoUrl yet — admin pegará Vimeo después.
          videoProvider: null,
          videoId: null,
        });
      } else {
        // multiple_choice — Claude returns options as {k,t,correct}
        const opts = (l.options ?? []).map((o) => ({ k: o.k, t: o.t, correct: !!o.correct }));
        const correctOpt = opts.find((o) => o.correct);
        if (!correctOpt || !l.question) continue; // skip malformed
        await db.insert(schema.lessons).values({
          moduleId: insertedMod.id,
          code: l.code || `L${lessonOrder + 1}`,
          title: l.title,
          kind: "multiple_choice",
          question: l.question,
          body: l.body ?? null,
          options: opts,
          correctKey: correctOpt.k,
          hint: l.hint ?? null,
          explanation: l.explanation ?? null,
          xpReward: 15,
          sortOrder: lessonOrder,
        });
      }
      lessonOrder += 1;
      totalLessons += 1;
    }
  }

  // Refresh modulesCount on program
  await db
    .update(schema.programs)
    .set({
      modulesCount: sql`(SELECT COUNT(*)::int FROM ${schema.modules} WHERE program_id = ${program.id})`,
    })
    .where(eq(schema.programs.id, program.id));

  return NextResponse.json({
    ok: true,
    modulesCreated: moduleIds.length,
    lessonsCreated: totalLessons,
    moduleIds,
  });
}

/* ────────── Claude prompt ────────── */
async function callClaude(apiKey: string, program: typeof schema.programs.$inferSelect, opts: z.infer<typeof body>): Promise<Generated> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const sourceBlock =
    opts.mode === "doc" && opts.sourceText
      ? `\n\n## MATERIAL FUENTE (úsalo como referencia principal)\n\n${opts.sourceText}\n`
      : "";

  const userPrompt = `Eres un diseñador instruccional senior. Tu tarea es estructurar un curso completo en formato JSON. Sigue las instrucciones AL PIE DE LA LETRA.

## CONTEXTO DEL PROGRAMA

- Título: ${program.title}
- Slug: ${program.slug}
- Tipo: ${program.type}
- Subtítulo: ${program.subtitle ?? "(no provisto)"}
- Descripción: ${program.description ?? "(no provista)"}

## BRIEF DEL ADMIN

${opts.brief}

${opts.audience ? `## AUDIENCIA OBJETIVO\n\n${opts.audience}\n` : ""}${sourceBlock}

## QUÉ NECESITAS GENERAR

Devuelve un JSON con esta estructura EXACTA (sin texto antes ni después, solo JSON puro):

\`\`\`json
{
  "modules": [
    {
      "code": "M01",
      "title": "Título del módulo (4-9 palabras)",
      "description": "Descripción del módulo (2-3 oraciones que expliquen qué aprenderá el alumno)",
      "weekLabel": "Semana 1",
      "isBig": false,
      "lessons": [
        {
          "code": "L1",
          "title": "Título de la lección (4-8 palabras)",
          "kind": "video",
          "body": "Contenido textual de la lección de video. Aprox 180-220 palabras (equivale a 5 min de video hablado). Estructura: hook, idea principal, ejemplo concreto, acción para el alumno. Tono claro, práctico y directo. NO uses listas con guiones; escribe párrafos fluidos.",
          "estimatedMinutes": 5
        },
        {
          "code": "L2",
          "title": "Título del quiz",
          "kind": "multiple_choice",
          "question": "Pregunta concreta y específica para evaluar comprensión",
          "options": [
            { "k": "A", "t": "Opción correcta detallada y específica", "correct": true },
            { "k": "B", "t": "Opción incorrecta plausible (no obvia)", "correct": false },
            { "k": "C", "t": "Opción incorrecta común (error frecuente)", "correct": false },
            { "k": "D", "t": "Opción incorrecta", "correct": false }
          ],
          "explanation": "Por qué la respuesta correcta lo es, en 1-2 oraciones."
        }
      ]
    }
  ]
}
\`\`\`

## REGLAS ESTRICTAS

1. Genera EXACTAMENTE ${opts.moduleCount} módulos.
2. Cada módulo tiene 3-5 lecciones. Mezcla video (mayoría) y quiz (1-2 por módulo, al final).
3. Cada lección de video tiene un \`body\` de 180-220 palabras, redactado como guion de video (primera o segunda persona, conversacional).
4. Los quizzes tienen 4 opciones, exactamente UNA correcta, las 3 incorrectas son plausibles (no obvias).
5. Los códigos siguen el patrón M01, M02 ... para módulos y L1, L2 ... para lecciones (reinician en cada módulo).
6. \`isBig: true\` SOLO en módulos que sean un "proyecto integrador" — máximo 1-2 por curso, generalmente al final de un bloque.
7. \`weekLabel\` es "Semana 1", "Semana 2", ... numerado secuencialmente.
8. Idioma: ${opts.language === "es" ? "español neutro de México" : opts.language}.
9. NO repitas títulos. NO uses clichés vacíos. NO uses bullets dentro del body.
10. Devuelve SOLO el JSON. Sin markdown, sin explicación, sin texto extra. La respuesta debe parsear con JSON.parse.
${opts.mode === "doc" ? "11. Basa los contenidos PRINCIPALMENTE en el material fuente provisto. Respeta su voz y ejemplos. Si el material es insuficiente para llenar todos los módulos, completa coherentemente.\n" : "11. Inventa todo desde cero con criterio experto. Inspírate en cursos premium de la categoría.\n"}

Ahora produce el JSON.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    temperature: 0.6,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const json = extractJson(raw);
  if (!json) throw new Error("Claude no devolvió JSON parseable");
  return json as Generated;
}

/** Extracts the first { ... } JSON object from a string, even if wrapped in code fences. */
function extractJson(s: string): unknown | null {
  const trimmed = s.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {}
  // Look inside ```json ... ``` fences
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }
  // Fallback: find first { and matching last }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {}
  }
  return null;
}
