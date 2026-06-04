import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/programs/[id]/reorder
 *
 * Bulk reorden + reasignación de la estructura del curso. Recibe el árbol
 * completo deseado y lo aplica con UPDATEs in-place. Más eficiente que
 * mandar 30 PATCHes individuales cuando el admin arrastra un módulo.
 *
 * Body:
 *   {
 *     "modules": [
 *       { "id": "uuid", "sortOrder": 0, "lessonIds": ["uuid", "uuid", ...] },
 *       { "id": "uuid", "sortOrder": 1, "lessonIds": [...] },
 *       ...
 *     ]
 *   }
 *
 * Para cada módulo:
 *   - Actualiza su sort_order
 *   - Para cada lessonId en lessonIds: actualiza lesson.moduleId al módulo
 *     correspondiente y lesson.sort_order al índice dentro del array.
 *
 * Esto permite cross-module moves (la lección ya estaba en otro módulo y
 * se arrastró aquí) en una sola operación.
 */
const body = z.object({
  modules: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int(),
        lessonIds: z.array(z.string().uuid()),
      }),
    )
    .max(60),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: programId } = await ctx.params;
  let data;
  try {
    data = body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Verify all module ids belong to this program (security).
  const moduleIds = data.modules.map((m) => m.id);
  if (moduleIds.length === 0) return NextResponse.json({ ok: true });
  const ownedModules = await db
    .select({ id: schema.modules.id })
    .from(schema.modules)
    .where(and(eq(schema.modules.programId, programId), inArray(schema.modules.id, moduleIds)));
  const ownedSet = new Set(ownedModules.map((m) => m.id));
  for (const m of data.modules) {
    if (!ownedSet.has(m.id)) {
      return NextResponse.json(
        { error: "module_not_in_program", moduleId: m.id },
        { status: 403 },
      );
    }
  }

  // Verify all lesson ids belong to modules that belong to this program.
  const allLessonIds = data.modules.flatMap((m) => m.lessonIds);
  if (allLessonIds.length > 0) {
    const ownedLessons = await db
      .select({ id: schema.lessons.id, moduleId: schema.lessons.moduleId })
      .from(schema.lessons)
      .where(inArray(schema.lessons.id, allLessonIds));
    const ownedLessonModules = new Set(ownedLessons.map((l) => l.moduleId));
    // Every lesson's current module must be one of THIS program's modules.
    // We pull program ids of those module ids in one go.
    if (ownedLessonModules.size > 0) {
      const lessonsProgram = await db
        .select({ id: schema.modules.id })
        .from(schema.modules)
        .where(
          and(
            eq(schema.modules.programId, programId),
            inArray(schema.modules.id, Array.from(ownedLessonModules)),
          ),
        );
      const allowedModules = new Set(lessonsProgram.map((m) => m.id));
      for (const l of ownedLessons) {
        if (!allowedModules.has(l.moduleId)) {
          return NextResponse.json(
            { error: "lesson_not_in_program", lessonId: l.id },
            { status: 403 },
          );
        }
      }
    }
  }

  // Apply updates.
  for (const m of data.modules) {
    await db
      .update(schema.modules)
      .set({ sortOrder: m.sortOrder })
      .where(eq(schema.modules.id, m.id));
    for (let i = 0; i < m.lessonIds.length; i++) {
      const lid = m.lessonIds[i]!;
      await db
        .update(schema.lessons)
        .set({ moduleId: m.id, sortOrder: i })
        .where(eq(schema.lessons.id, lid));
    }
  }

  return NextResponse.json({ ok: true, modulesUpdated: data.modules.length });
}
