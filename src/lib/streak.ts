import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/** Zona horaria de referencia para el corte de día de la racha. */
const TZ = "America/Mazatlan";

/** "YYYY-MM-DD" del instante dado en la zona horaria de la plataforma. */
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** ¿b es exactamente el día siguiente a a? (claves YYYY-MM-DD) */
function isNextDay(a: string, b: string): boolean {
  const d = new Date(`${a}T12:00:00Z`); // mediodía UTC evita líos de DST
  d.setUTCDate(d.getUTCDate() + 1);
  return dayKey(d) === b;
}

/**
 * Avanza la racha del usuario por actividad de aprendizaje (lección
 * completada o intento de quiz). Reglas tipo Duolingo:
 *  - Misma fecha que la última actividad → no cambia.
 *  - Última actividad fue ayer → racha + 1.
 *  - Más de un día sin actividad (o primera vez) → racha = 1.
 * Nunca lanza: la racha jamás debe tirar el flujo de la lección.
 */
export async function bumpStreak(userId: string): Promise<void> {
  try {
    const [u] = await db
      .select({ streakDays: schema.users.streakDays, streakLastAt: schema.users.streakLastAt })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!u) return;

    const now = new Date();
    const today = dayKey(now);
    const last = u.streakLastAt ? dayKey(u.streakLastAt) : null;

    if (last === today) return; // ya contó hoy

    const next = last && isNextDay(last, today) ? u.streakDays + 1 : 1;
    await db
      .update(schema.users)
      .set({ streakDays: next, streakLastAt: now })
      .where(eq(schema.users.id, userId));
  } catch (e) {
    console.error("[streak] bump:", e);
  }
}
