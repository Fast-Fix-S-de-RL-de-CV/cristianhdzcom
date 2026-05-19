import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import * as s from "./schema";
import { eq, sql } from "drizzle-orm";

const url = process.env.DATABASE_URL!;
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

async function main() {
  console.log("Seeding…");

  // ── USERS
  const adminEmail = "lic.cristianhdz@gmail.com";
  const adminPass = "x8D0FD8SZFuV80CqItAa1!";
  const adminHash = await bcrypt.hash(adminPass, 12);
  await db
    .insert(s.users)
    .values({
      email: adminEmail,
      passwordHash: adminHash,
      name: "Cristian Hernández",
      role: "superadmin",
      bio: "Programador profesional con IA, autor y fundador.",
      country: "México",
      level: 9,
      xp: 12480,
      streakDays: 47,
      hearts: 5,
    })
    .onConflictDoNothing({ target: s.users.email });

  const seedUsers = [
    { email: "maria@example.com", name: "María Reyes", role: "member", level: 7, xp: 4840 },
    { email: "diana@example.com", name: "Diana Pacheco", role: "member", level: 5, xp: 4310 },
    { email: "luis@example.com", name: "Luis Fernández", role: "member", level: 6, xp: 3940 },
    { email: "andres@example.com", name: "Andrés López", role: "member", level: 4, xp: 3620 },
    { email: "patricia@example.com", name: "Patricia Galvez", role: "member", level: 4, xp: 3180 },
    { email: "felipe@example.com", name: "Felipe Soto", role: "member", level: 3, xp: 2960 },
    { email: "rosa@example.com", name: "Rosa Mendoza", role: "member", level: 3, xp: 2740 },
  ];
  const pwHash = await bcrypt.hash("password123", 12);
  for (const u of seedUsers) {
    await db
      .insert(s.users)
      .values({ ...u, passwordHash: pwHash, streakDays: Math.floor(Math.random() * 30) })
      .onConflictDoNothing({ target: s.users.email });
  }

  // ── PROGRAMS
  const programs = [
    {
      slug: "taller-ia-escribir",
      title: "IA para escribir mejor que tu junior",
      subtitle: "Taller en vivo de 90 minutos para profesionales que escriben todo el día.",
      type: "taller",
      durationLabel: "90 min · en vivo",
      priceUsd: 0,
      accent: "warm",
      bullets: ["Sesión en vivo con Cristian", "Plantillas de prompt incluidas", "Grabación 7 días", "Comunidad gratuita"],
      modulesCount: 0,
      sortOrder: 1,
    },
    {
      slug: "programacion-con-ia",
      title: "Programación profesional con IA",
      subtitle:
        "Cuatro semanas para pasar de prompts a productos reales. Aprendes a diseñar, codificar y desplegar software profesional usando agentes y modelos de frontera.",
      type: "curso",
      durationLabel: "32h · cohorte",
      priceUsd: 689,
      priceCompareUsd: 989,
      installmentPriceUsd: 237,
      installmentCount: 3,
      accent: "accent",
      bullets: [
        "Acceso de por vida a la plataforma",
        "Comunidad privada + 4 talleres bonus",
        "Los 2 libros de Cristian en versión digital",
        "Garantía de 14 días — sin preguntas",
      ],
      modulesCount: 12,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      slug: "negocios-con-ia",
      title: "Negocios con IA: de cero a clientes",
      subtitle: "Seis semanas para validar tu oferta, lanzar y cerrar tus primeros clientes con IA como copiloto.",
      type: "curso",
      durationLabel: "48h · cohorte",
      priceUsd: 789,
      priceCompareUsd: 1089,
      installmentPriceUsd: 269,
      installmentCount: 3,
      accent: "accent",
      bullets: ["Validación de nicho", "Oferta y pricing", "Funnels y automatización", "Comunidad + Demo Day"],
      modulesCount: 12,
      sortOrder: 3,
    },
    {
      slug: "certificacion-operador",
      title: "Operador certificado CH · IA",
      subtitle: "Doce semanas + examen. Sello profesional que abre puertas en empresas que ya operan con IA.",
      type: "certificacion",
      durationLabel: "12 semanas · examen",
      priceUsd: 889,
      priceCompareUsd: 1289,
      installmentPriceUsd: 297,
      installmentCount: 3,
      accent: "ink",
      bullets: ["Mentorías 1:1", "4 proyectos entregables", "Examen final con jurado", "Sello CH · IA"],
      modulesCount: 18,
      sortOrder: 4,
    },
    {
      slug: "consultoria-1-1",
      title: "Estrategia IA con Cristian",
      subtitle: "Cuatro sesiones privadas para revisar tu negocio, nicho y stack con Cristian directamente.",
      type: "consultoria",
      durationLabel: "4 sesiones · 60 min",
      priceUsd: 889,
      accent: "ink",
      bullets: ["4 sesiones 1:1 grabadas", "Plan de implementación", "Acceso a la comunidad senior", "Garantía 14 días"],
      modulesCount: 0,
      sortOrder: 5,
    },
    {
      slug: "agencia-software",
      title: "Construimos tu producto contigo",
      subtitle: "Proyecto a medida con nuestra agencia. Diseño, desarrollo y lanzamiento de tu SaaS en 8–16 semanas.",
      type: "agencia",
      durationLabel: "Proyecto · 8–16 semanas",
      priceUsd: 0,
      accent: "warm",
      bullets: ["Discovery + alcance", "Diseño + desarrollo", "QA + lanzamiento", "30 días de soporte post-launch"],
      modulesCount: 0,
      sortOrder: 6,
    },
  ];

  for (const p of programs) {
    await db.insert(s.programs).values(p as any).onConflictDoNothing({ target: s.programs.slug });
  }

  // Get the programación-con-ia program for modules + lessons
  const [progCurso] = await db.select().from(s.programs).where(eq(s.programs.slug, "programacion-con-ia"));
  if (progCurso) {
    const moduleData = [
      { code: "M01", title: "Setup IDE + agentes", weekLabel: "Semana 1", sortOrder: 1, isBig: false },
      { code: "M02", title: "Prompt design pro", weekLabel: "Semana 1", sortOrder: 2, isBig: false },
      { code: "M03", title: "Proyecto: Soporte IA", weekLabel: "Semana 1", sortOrder: 3, isBig: true },
      { code: "M04", title: "APIs con copiloto", weekLabel: "Semana 2", sortOrder: 4, isBig: false },
      { code: "M05", title: "Bases de datos", weekLabel: "Semana 2", sortOrder: 5, isBig: false },
      { code: "M06", title: "Deploy y CI/CD", weekLabel: "Semana 2", sortOrder: 6, isBig: false },
      { code: "M07", title: "Sistemas multi-agente", weekLabel: "Semana 3", sortOrder: 7, isBig: true },
      { code: "M08", title: "Evaluación y observabilidad", weekLabel: "Semana 3", sortOrder: 8, isBig: false },
      { code: "M09", title: "Agencia interna de marketing", weekLabel: "Semana 3", sortOrder: 9, isBig: true },
      { code: "M10", title: "De prototipo a producto", weekLabel: "Semana 4", sortOrder: 10, isBig: false },
      { code: "M11", title: "Vender tu software", weekLabel: "Semana 4", sortOrder: 11, isBig: false },
      { code: "M12", title: "Demo Day", weekLabel: "Semana 4", sortOrder: 12, isBig: true },
    ];

    for (const m of moduleData) {
      const [inserted] = await db
        .insert(s.modules)
        .values({ ...m, programId: progCurso.id })
        .returning();
      // Add a sample lesson for M07
      if (m.code === "M07" && inserted) {
        await db.insert(s.lessons).values({
          moduleId: inserted.id,
          code: "L04",
          title: "Definición orchestrator",
          kind: "multiple_choice",
          question:
            'Elige la definición correcta. ¿Qué describe mejor un "sistema multi-agente orchestrator"?',
          options: [
            {
              k: "A",
              t: "Una arquitectura donde un agente delega tareas a sub-agentes especializados.",
              correct: true,
            },
            { k: "B", t: "Una librería de Python para llamar APIs en paralelo." },
            { k: "C", t: "Un tipo de prompt que mezcla cadenas de razonamiento." },
            { k: "D", t: "Un modelo más pequeño que el original entrenado por destilación." },
          ],
          correctKey: "A",
          hint: "Piensa en quién delega: el orquestador coordina, los sub-agentes ejecutan.",
          explanation:
            "Un orchestrator coordina sub-agentes; cada sub-agente tiene su propia herramienta y contexto. Es el patrón opuesto a un 'swarm' donde todos los agentes son iguales.",
          xpReward: 15,
          sortOrder: 1,
        });
      }
    }

    // Module progress for admin user
    const [admin] = await db.select().from(s.users).where(eq(s.users.email, adminEmail));
    if (admin) {
      const allMods = await db.select().from(s.modules).where(eq(s.modules.programId, progCurso.id));
      for (let i = 0; i < allMods.length; i++) {
        const state = i < 4 ? "done" : i === 4 ? "current" : "locked";
        await db
          .insert(s.moduleProgress)
          .values({ userId: admin.id, moduleId: allMods[i].id, state })
          .onConflictDoNothing();
      }
      await db
        .insert(s.enrollments)
        .values({ userId: admin.id, programId: progCurso.id, status: "active" })
        .onConflictDoNothing();
    }
  }

  // ── CATEGORIES
  const cats = [
    { slug: "anuncios", name: "Anuncios", emoji: "📌", color: "warm", sortOrder: 1 },
    { slug: "general", name: "General", emoji: "💬", sortOrder: 2 },
    { slug: "wins", name: "Wins", emoji: "🏆", color: "accent", sortOrder: 3 },
    { slug: "preguntas", name: "Preguntas", emoji: "❓", sortOrder: 4 },
    { slug: "proyectos-ia", name: "Proyectos IA", emoji: "🚀", sortOrder: 5 },
    { slug: "busco-cliente", name: "Busco cliente", emoji: "💼", sortOrder: 6 },
    { slug: "off-topic", name: "Off-topic", emoji: "🎙️", sortOrder: 7 },
  ];
  for (const c of cats) {
    await db.insert(s.categories).values(c).onConflictDoNothing({ target: s.categories.slug });
  }

  // ── BLOG
  const blogs = [
    {
      slug: "era-programador-empresario",
      title: "La era del programador empresario: por qué todos tendrán equipo.",
      excerpt:
        "La IA convierte a cualquier profesional en operador de un pequeño ejército. No es ciencia ficción — es lo que mi mejor alumna hizo el mes pasado.",
      body: `La IA ya no es una herramienta — es un equipo entero esperando órdenes.\n\nDurante años hablamos de "el programador full-stack". Hoy hablamos de "el programador empresario": una persona con una visión, un puñado de agentes IA y un negocio funcionando.\n\nEsto no es ciencia ficción. Es lo que María hizo el mes pasado. Tres meses dentro del programa, ya tiene un producto facturando $4k MRR — y lo opera sola, con tres agentes que la asisten.\n\n## ¿Qué cambia esto?\n\nCambia el costo de iniciar. Cambia el tamaño mínimo viable de un equipo. Cambia quién puede ser fundador.\n\nLa pregunta ya no es "¿sabes programar?". La pregunta es "¿sabes dirigir agentes?". Y esa habilidad — saber descomponer un problema, formular el prompt correcto, evaluar la salida y volver a iterar — es lo que llamamos hoy ingeniería de software con IA.\n\n## Cómo dirigirlos\n\n1. **Decide qué quieres antes de pedirlo.** Si tú no tienes claro el output, el agente no lo va a inventar por ti.\n2. **Da contexto, no instrucciones.** "Soy CFO de una PyME industrial, tengo este Excel, este es mi problema". No "haz un dashboard".\n3. **Evalúa antes de aceptar.** Cada vez que el agente te entregue algo, pregúntate: ¿esto resuelve mi problema, o solo lo parece?\n4. **Itera en voz alta.** El agente aprende de tus correcciones. Si no le explicas por qué algo está mal, vas a recibir el mismo error mañana.\n\nEste es el patrón. Lo enseño en M07 y lo aplican en su proyecto final. Llevamos 2.847 alumnos y sigue funcionando.`,
      category: "IA · Ingeniería",
      readMinutes: 22,
      isFeatured: true,
      publishedAt: new Date("2026-02-14"),
    },
    {
      slug: "framework-4-ofertas",
      title: "El framework de 4 ofertas que uso para cobrar $5k sin justificarme.",
      excerpt: "Pricing es posicionamiento. Si tu única oferta es 'consultoría por hora', estás compitiendo en el sótano.",
      body: "Cuando empecé, cobraba por hora. Hoy cobro por outcome. La diferencia no es solo el monto — es la conversación.\n\nEste es el framework que enseño en M11.",
      category: "Negocios",
      readMinutes: 8,
      publishedAt: new Date("2026-02-11"),
    },
    {
      slug: "maria-recupero-40k",
      title: "María R. recuperó $40k con un agente en 3 semanas — el desglose.",
      excerpt: "Caso real, números reales. La arquitectura del agente, el costo de tokens, los obstáculos y lo que aprendí.",
      body: "María llegó al programa con un problema claro: $40k atrapados en cobranza vencida. En tres semanas, recuperó el 60%.\n\nAquí el desglose técnico y de negocio.",
      category: "Caso real",
      readMinutes: 15,
      publishedAt: new Date("2026-02-08"),
    },
    {
      slug: "cuando-no-usar-agente",
      title: "Cuándo NO usar un agente (y qué usar en su lugar).",
      excerpt: "Agentes son caros, lentos y a veces innecesarios. Una guía honesta de cuándo prender el ventilador.",
      body: "No todo problema es un agente. A veces un script de 12 líneas resuelve más que un agente de 4 herramientas.",
      category: "IA · Producto",
      readMinutes: 6,
      publishedAt: new Date("2026-02-04"),
    },
    {
      slug: "cobro-3x-mas",
      title: "Por qué cobro 3x más que mi competencia y duermo tranquilo.",
      excerpt: "La conversación que tuve con un cliente que dudaba — y cómo cerré sin negociar.",
      body: "Posicionamiento, no precio. Aquí la conversación que cambió cómo cobro.",
      category: "Negocios",
      readMinutes: 9,
      publishedAt: new Date("2026-02-01"),
    },
    {
      slug: "stack-minimo-saas",
      title: "Stack mínimo para enviar tu primer SaaS en 7 días con IA.",
      excerpt: "Next.js, Postgres, Stripe, Vercel y un agente que escribe el 70% del código. El resto es disciplina.",
      body: "Aquí el stack exacto que uso para prototipos rápidos. Probado en 5 productos en vivo.",
      category: "Tutorial",
      readMinutes: 11,
      publishedAt: new Date("2026-01-28"),
    },
  ];
  for (const b of blogs) {
    await db.insert(s.blogPosts).values(b as any).onConflictDoNothing({ target: s.blogPosts.slug });
  }

  // ── POSTS (community feed)
  const adminRow = (await db.select().from(s.users).where(eq(s.users.email, adminEmail)))[0];
  const mariaRow = (await db.select().from(s.users).where(eq(s.users.email, "maria@example.com")))[0];
  const luisRow = (await db.select().from(s.users).where(eq(s.users.email, "luis@example.com")))[0];
  const dianaRow = (await db.select().from(s.users).where(eq(s.users.email, "diana@example.com")))[0];

  const [catAnuncios] = await db.select().from(s.categories).where(eq(s.categories.slug, "anuncios"));
  const [catWins] = await db.select().from(s.categories).where(eq(s.categories.slug, "wins"));
  const [catPreg] = await db.select().from(s.categories).where(eq(s.categories.slug, "preguntas"));
  const [catProy] = await db.select().from(s.categories).where(eq(s.categories.slug, "proyectos-ia"));

  const postsExisting = await db.select({ c: sql<number>`count(*)::int` }).from(s.posts);
  if ((postsExisting[0]?.c ?? 0) === 0 && adminRow) {
    await db.insert(s.posts).values([
      {
        authorId: adminRow.id,
        categoryId: catAnuncios?.id,
        title: "🎯 Mañana abrimos Demo Day · cohorte 03",
        body: "8 alumnos presentan sus productos a 3 inversores ángeles invitados. Si querés pitch, comenten abajo y los meto en lista. Empieza 19:00 GMT-5.",
        pinned: true,
        likesCount: 240,
        commentsCount: 88,
        viewsCount: 2400,
      },
      {
        authorId: mariaRow?.id ?? adminRow.id,
        categoryId: catWins?.id,
        title: "💰 Mi primer agente recuperó $12k en 4 días",
        body: "Después de M07 me animé y armé el agente de cobranzas para mi empresa. En cuatro días recuperó $12.300 USD que llevaban meses parados. No lo puedo creer.",
        hot: true,
        likesCount: 184,
        commentsCount: 47,
        viewsCount: 1200,
      },
      {
        authorId: luisRow?.id ?? adminRow.id,
        categoryId: catPreg?.id,
        title: '¿Alguien comparó approaches multi-agente en M08?',
        body: 'Estoy debatiéndome entre arquitectura "orchestrator" vs. "swarm" para un cliente. Si alguien tiene benchmarks reales se los agradezco.',
        likesCount: 32,
        commentsCount: 21,
        viewsCount: 486,
      },
      {
        authorId: dianaRow?.id ?? adminRow.id,
        categoryId: catProy?.id,
        title: "🚀 Lancé hoy mi MVP — agradecida 🙏",
        body: "3 meses dentro y ya está en producción. 12 usuarios pagos en 48h. Voy a hacer un teardown en el próximo Demo Day.",
        likesCount: 96,
        commentsCount: 28,
        viewsCount: 740,
      },
    ]);
  }

  // ── EVENTS
  const eventsExisting = await db.select({ c: sql<number>`count(*)::int` }).from(s.events);
  if ((eventsExisting[0]?.c ?? 0) === 0) {
    const now = Date.now();
    await db.insert(s.events).values([
      {
        title: "Live · APIs con IA",
        host: "Cristian + Diana",
        startsAt: new Date(now + 1000 * 60 * 60 * 3),
        durationMinutes: 90,
        capacity: 300,
        attending: 247,
      },
      {
        title: "Taller gratis: SaaS sin código",
        host: "Cristian",
        startsAt: new Date(now + 1000 * 60 * 60 * 24 * 5),
        durationMinutes: 120,
        capacity: 500,
        attending: 247,
        hot: true,
      },
      {
        title: "Demo Day · Cohorte 03",
        host: "Cristian + Luis",
        startsAt: new Date(now + 1000 * 60 * 60 * 24 * 10),
        durationMinutes: 180,
        capacity: 200,
        attending: 132,
      },
    ]);
  }

  // ── COUPON · EMPIEZA = 100% off (total $0)
  await db
    .insert(s.coupons)
    .values({ code: "EMPIEZA", kind: "percent", value: 100, active: true, usesLeft: 1000 })
    .onConflictDoNothing();

  // ── ACTIVITY
  const actExisting = await db.select({ c: sql<number>`count(*)::int` }).from(s.activity);
  if ((actExisting[0]?.c ?? 0) === 0) {
    await db.insert(s.activity).values([
      { kind: "purchase", icon: "💳", text: "María R. compró Curso Programación · $689", color: "var(--accent)" },
      { kind: "complete", icon: "🎓", text: "Diana P. completó M07", color: "var(--green)" },
      { kind: "lead", icon: "📩", text: "Nuevo lead desde Blog · l.foster@…", color: "var(--muted)" },
      { kind: "cancel", icon: "❌", text: 'Cancelación · Andrés L. · "no tengo tiempo"', color: "var(--red)" },
      { kind: "publish", icon: "📚", text: 'Cristian publicó "Era del programador empresario"', color: "var(--ink)" },
      { kind: "enroll", icon: "🎙️", text: "Taller MAR 11 alcanzó 247/300 cupos", color: "var(--warm)" },
    ]);
  }

  console.log("Done seeding.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
