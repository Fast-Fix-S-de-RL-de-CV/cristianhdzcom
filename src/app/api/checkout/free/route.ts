import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/free
 * Body: { slug: string }
 *
 * Inscribe al usuario logueado en un curso gratuito (priceUsd === 0) sin
 * pasar por la pasarela de pago. Para que un curso pueda inscribirse
 * gratis necesita:
 *   1. priceUsd === 0 (la guardia principal — no se puede inscribir gratis
 *      a un curso de paga)
 *   2. isActive === true
 *
 * Side effects:
 *   - Crea una enrollment (idempotente vía unique constraint user+program)
 *   - Marca el primer módulo como "current" para que el sendero arranque
 *   - NO crea una order $0 — los cursos gratis deben mantener al usuario
 *     como PROSPECTO (definición acordada: prospecto = sin orders
 *     succeeded). El admin verá en /admin/prospectos a estos leads con
 *     engagement alto (= candidatos calientes para venderles consultoría
 *     u otros productos).
 */
const body = z.object({ slug: z.string().min(2).max(80) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized", message: "Necesitas iniciar sesión" }, { status: 401 });
  }
  let data;
  try {
    data = body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.slug, data.slug))
    .limit(1);
  if (!program) {
    return NextResponse.json({ error: "program_not_found" }, { status: 404 });
  }
  if (!program.isActive) {
    return NextResponse.json({ error: "program_inactive", message: "Este curso no está disponible." }, { status: 409 });
  }
  if (program.priceUsd > 0) {
    return NextResponse.json(
      {
        error: "not_free",
        message: "Este curso no es gratuito. Procede al checkout normal.",
      },
      { status: 409 },
    );
  }

  // Idempotent enrollment
  const [existing] = await db
    .select()
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.userId, user.id),
        eq(schema.enrollments.programId, program.id),
      ),
    )
    .limit(1);
  if (!existing) {
    await db.insert(schema.enrollments).values({
      userId: user.id,
      programId: program.id,
      status: "active",
    });
  }

  // Set the first module as "current" so the sendero shows progress.
  const [firstMod] = await db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.programId, program.id))
    .orderBy(schema.modules.sortOrder)
    .limit(1);
  if (firstMod) {
    const [exists] = await db
      .select()
      .from(schema.moduleProgress)
      .where(
        and(
          eq(schema.moduleProgress.userId, user.id),
          eq(schema.moduleProgress.moduleId, firstMod.id),
        ),
      )
      .limit(1);
    if (!exists) {
      await db.insert(schema.moduleProgress).values({
        userId: user.id,
        moduleId: firstMod.id,
        state: "current",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    programId: program.id,
    slug: program.slug,
    alreadyEnrolled: !!existing,
  });
}
