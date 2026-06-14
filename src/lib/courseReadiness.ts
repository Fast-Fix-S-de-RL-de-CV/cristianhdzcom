import { db, schema } from "@/db";
import { and, eq, isNull, or } from "drizzle-orm";

export type IncompleteLesson = {
  id: string;
  code: string;
  title: string;
  moduleTitle: string;
};

/**
 * Lecciones de tipo "video" de un programa que aún NO tienen un video válido
 * resuelto (videoProvider + videoId). Un curso solo puede activarse cuando esta
 * lista está vacía: como borrador se permite cualquier estado.
 */
export async function incompleteVideoLessons(programId: string): Promise<IncompleteLesson[]> {
  const rows = await db
    .select({
      id: schema.lessons.id,
      code: schema.lessons.code,
      title: schema.lessons.title,
      moduleTitle: schema.modules.title,
    })
    .from(schema.lessons)
    .innerJoin(schema.modules, eq(schema.modules.id, schema.lessons.moduleId))
    .where(
      and(
        eq(schema.modules.programId, programId),
        eq(schema.lessons.kind, "video"),
        or(isNull(schema.lessons.videoProvider), isNull(schema.lessons.videoId)),
      ),
    )
    .orderBy(schema.modules.sortOrder, schema.lessons.sortOrder);
  return rows;
}
