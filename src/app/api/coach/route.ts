import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, desc, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/coach { message?: string }
 *
 * The "Copiloto CH" assistant. Two backends:
 *   1. Anthropic Claude (if ANTHROPIC_API_KEY is set) — full conversational AI.
 *   2. Template fallback — interpolates the user's progress into a fixed set
 *      of contextual suggestions. Works without any external API key.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  let body: { message?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — we just produce a context-aware greeting.
  }
  const message = (body.message ?? "").trim();

  // Gather context: progress, current module, recent activity.
  const ctx = await buildCoachContext(user.id);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const reply = await callClaude(apiKey, user, ctx, message);
      return NextResponse.json({ reply, source: "claude" });
    } catch (err) {
      console.error("[coach] Claude error, falling back to template:", err);
      // fall through to template
    }
  }

  const reply = templateReply(user, ctx, message);
  return NextResponse.json({ reply, source: "template" });
}

interface CoachContext {
  totalModules: number;
  doneModules: number;
  currentModule: { title: string; weekLabel: string | null } | null;
  recentLessonTitle: string | null;
  streakDays: number;
  xp: number;
  firstName: string;
}

async function buildCoachContext(userId: string): Promise<CoachContext> {
  const [u] = await db
    .select({
      name: schema.users.name,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  // Default to the "programacion-con-ia" program; same convention as /plataforma.
  const [prog] = await db
    .select({ id: schema.programs.id })
    .from(schema.programs)
    .where(eq(schema.programs.slug, "programacion-con-ia"))
    .limit(1);

  let totalModules = 0;
  let doneModules = 0;
  let currentModule: CoachContext["currentModule"] = null;

  if (prog) {
    const mods = await db
      .select({
        id: schema.modules.id,
        title: schema.modules.title,
        weekLabel: schema.modules.weekLabel,
        sortOrder: schema.modules.sortOrder,
      })
      .from(schema.modules)
      .where(eq(schema.modules.programId, prog.id))
      .orderBy(schema.modules.sortOrder);
    totalModules = mods.length;

    const progress = await db
      .select()
      .from(schema.moduleProgress)
      .where(eq(schema.moduleProgress.userId, userId));
    const stateById = new Map(progress.map((p) => [p.moduleId, p.state] as const));
    doneModules = progress.filter((p) => p.state === "done").length;

    const currentMod =
      mods.find((m) => stateById.get(m.id) === "in_progress") ??
      mods.find((m) => stateById.get(m.id) === "current") ??
      mods.find((m) => !stateById.get(m.id) || stateById.get(m.id) !== "done") ??
      null;
    if (currentMod) {
      currentModule = { title: currentMod.title, weekLabel: currentMod.weekLabel ?? null };
    }
  }

  // Most recent lesson attempt
  const recent = await db
    .select({
      title: schema.lessons.title,
    })
    .from(schema.lessonAttempts)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonAttempts.lessonId))
    .where(eq(schema.lessonAttempts.userId, userId))
    .orderBy(desc(schema.lessonAttempts.createdAt))
    .limit(1);
  const recentLessonTitle = recent[0]?.title ?? null;

  const firstName = u?.name?.split(" ")[0] ?? "amig@";

  return {
    totalModules,
    doneModules,
    currentModule,
    recentLessonTitle,
    streakDays: u?.streakDays ?? 0,
    xp: u?.xp ?? 0,
    firstName,
  };
}

function templateReply(_user: any, ctx: CoachContext, message: string): string {
  // If the user typed something, try to match intent crudely.
  const m = message.toLowerCase();
  if (m) {
    if (/(repas|recap|repaso)/.test(m)) {
      return `Vamos con un repaso de 8 minutos sobre **${ctx.currentModule?.title ?? "tu último módulo"}**. Te tiro 5 preguntas rápidas y vemos qué te queda flojo. ¿Listo?`;
    }
    if (/(stuck|atorad|atasc|no entiendo)/.test(m)) {
      return `Tranqui ${ctx.firstName}, eso le pasa a todo el mundo. ¿En qué te trabaste exactamente? Si me dices el concepto o me pegas el código, te lo explico paso a paso.`;
    }
    if (/(motivac|cansad|no quiero|abandono)/.test(m)) {
      return `Llevas ${ctx.streakDays} días de racha y ${ctx.xp.toLocaleString()} XP. Eso no se construye en un día. Hoy 15 minutos. Solo eso. Mañana hablamos.`;
    }
    if (/(qu[eé] sigue|pr[oó]ximo|next)/.test(m)) {
      const next = ctx.currentModule?.title;
      return next
        ? `Sigue **${next}**${ctx.currentModule?.weekLabel ? ` (${ctx.currentModule.weekLabel})` : ""}. Es el siguiente módulo en tu sendero.`
        : `Vas al día con todo lo programado. Aprovecha y pásate al taller en vivo más cercano.`;
    }
    return `Buena pregunta, ${ctx.firstName}. Recibí tu mensaje: "${message.slice(0, 80)}". Cuando active el modo Claude voy a contestarte con detalle real. Por ahora dime qué tema te interesa y te oriento.`;
  }

  // No message → contextual greeting based on progress.
  if (ctx.totalModules === 0) {
    return `Hola ${ctx.firstName} — todavía no has empezado ningún programa. Cuando elijas uno desde el catálogo arrancamos juntos.`;
  }

  if (ctx.doneModules === ctx.totalModules) {
    return `Hola ${ctx.firstName} — completaste los ${ctx.totalModules} módulos. Eres oficialmente alumni. Aprovecha la comunidad y los talleres en vivo para seguir creciendo.`;
  }

  if (ctx.doneModules === 0) {
    return `Hola ${ctx.firstName} — todavía no terminas ningún módulo. ¿Empezamos con **${ctx.currentModule?.title ?? "el primero"}**? Son 15 min máximo.`;
  }

  // The classic mid-progress nudge.
  const remaining = ctx.totalModules - ctx.doneModules;
  return `Hola ${ctx.firstName} — noté que llevas **${ctx.doneModules} módulo${ctx.doneModules === 1 ? "" : "s"} completo${ctx.doneModules === 1 ? "" : "s"}** y te quedan ${remaining}. Si quieres, te armo un repaso de 8 minutos antes del próximo (${ctx.currentModule?.title ?? "siguiente módulo"}).`;
}

async function callClaude(apiKey: string, user: any, ctx: CoachContext, userMessage: string) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const systemPrompt = `Eres el "Copiloto CH", asistente personal de aprendizaje en la plataforma de Cristian Hernández (cristianhdz.com), una academia online de programación con IA y emprendimiento.

Tu trabajo es motivar al alumno, responder dudas técnicas cortas, y sugerir el próximo paso de aprendizaje.

Tono:
- Cercano, en tú/voseo según contexto (acepta ambos)
- Mexicano-LATAM, casual pero profesional
- Frases cortas, directas, accionables
- Nunca más de 3 párrafos cortos
- Usa **negrita** para los módulos / cursos mencionados
- Si el alumno pregunta algo técnico complejo, da una respuesta clara con ejemplo de código si aplica

Datos del alumno (úsalos solo cuando sea relevante, no los repitas todos):
- Nombre: ${user.name}
- Nivel: ${user.level}
- XP total: ${user.xp.toLocaleString()}
- Racha: ${ctx.streakDays} días
- Módulos completados: ${ctx.doneModules}/${ctx.totalModules}
- Módulo actual: ${ctx.currentModule?.title ?? "(ninguno)"}
- Última lección vista: ${ctx.recentLessonTitle ?? "(sin actividad reciente)"}`;

  const conversationMessage = userMessage || "Salúdame y dime qué tal voy con el curso. Sugiere mi siguiente paso.";

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: "user", content: conversationMessage }],
  });

  const block = response.content.find((b: any) => b.type === "text") as any;
  return block?.text ?? "Disculpa, no pude generar una respuesta. Intenta de nuevo.";
}
