/**
 * Seed 3 cursos completos (Marketing con IA, Programación avanzada, Ventas con IA)
 * + Inscribe el alumno de prueba en los 4 cursos (los 3 nuevos + el de programación
 *   profesional ya existente) + Genera moduleProgress inicial para que el sendero
 *   muestre un punto de partida realista.
 *
 * Idempotente: si los programas/módulos/lecciones ya existen (por slug+code),
 * los actualiza en lugar de duplicarlos.
 *
 * Run with:
 *   DATABASE_URL=... npx tsx scripts/seed-cursos-completos.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as s from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

type LessonSpec = {
  code: string;
  title: string;
  kind: "multiple_choice" | "true_false" | "fill_blank" | "open";
  question: string;
  body?: string;
  options?: { k: string; t: string; correct?: boolean }[];
  correctKey?: string;
  explanation?: string;
  hint?: string;
  xpReward?: number;
};

type ModuleSpec = {
  code: string;
  title: string;
  description: string;
  weekLabel: string;
  isBig?: boolean;
  xpReward?: number;
  lessons: LessonSpec[];
};

type CourseSpec = {
  slug: string;
  title: string;
  subtitle: string;
  type: "curso";
  durationLabel: string;
  priceUsd: number;
  priceCompareUsd?: number;
  accent: "accent" | "warm" | "ink" | "green";
  description: string;
  bullets: string[];
  isFeatured?: boolean;
  sortOrder: number;
  modules: ModuleSpec[];
};

// ── Helper para generar lecciones de ejemplo rápido ──
const mc = (
  code: string,
  title: string,
  question: string,
  opts: [string, boolean][],
  expl: string,
): LessonSpec => {
  const keys = ["A", "B", "C", "D"];
  const options = opts.map(([t, correct], i) => ({ k: keys[i]!, t, correct }));
  const correctKey = options.find((o) => o.correct)?.k ?? "A";
  return {
    code,
    title,
    kind: "multiple_choice",
    question,
    options,
    correctKey,
    explanation: expl,
    xpReward: 15,
  };
};

const tf = (code: string, title: string, question: string, isTrue: boolean, expl: string): LessonSpec => ({
  code,
  title,
  kind: "true_false",
  question,
  options: [
    { k: "A", t: "Verdadero", correct: isTrue },
    { k: "B", t: "Falso", correct: !isTrue },
  ],
  correctKey: isTrue ? "A" : "B",
  explanation: expl,
  xpReward: 12,
});

// ════════════════════════════════════════════════════════════════════
// CURSO 1 — MARKETING CON IA
// ════════════════════════════════════════════════════════════════════
const MARKETING: CourseSpec = {
  slug: "marketing-con-ia",
  title: "Marketing con IA: de cero a 10K visitas/mes",
  subtitle: "Captación orgánica, contenido y embudos automatizados con IA",
  type: "curso",
  durationLabel: "8 semanas · 6 módulos",
  priceUsd: 297,
  priceCompareUsd: 497,
  accent: "warm",
  description:
    "Aprende a construir un sistema de marketing que captura, nutre y convierte clientes 24/7 usando IA — sin agencia, sin equipo, sin presupuesto inflado.",
  bullets: [
    "Estrategia de contenidos con investigación automatizada",
    "SEO técnico + IA para escalar artículos en 1 día",
    "Embudos de Email + WhatsApp automatizados",
    "Anuncios Meta/Google con copy generado por IA",
    "Métricas y dashboard Looker conectado al stack",
  ],
  isFeatured: true,
  sortOrder: 10,
  modules: [
    {
      code: "MK01",
      title: "Fundamentos del marketing 2026",
      description: "Qué cambió con IA y qué sigue igual: principios de captación, embudo y propuesta de valor.",
      weekLabel: "Semana 1",
      xpReward: 60,
      lessons: [
        mc(
          "L1",
          "El embudo de marketing moderno",
          "¿Cuál es la etapa donde la IA tiene mayor impacto en 2026?",
          [
            ["Top of funnel — generación de contenido y descubrimiento", true],
            ["Bottom of funnel — cierre de venta", false],
            ["Mid funnel — nutrición de leads", false],
            ["Post-venta", false],
          ],
          "La IA escala la creación de contenido a un costo marginal cercano a cero, lo que multiplica el alcance orgánico al top of funnel.",
        ),
        mc(
          "L2",
          "Propuesta de valor con IA",
          "¿Cuál de estas propuestas comunica MEJOR beneficio sobre features?",
          [
            ["Software con 47 funciones premium e IA integrada", false],
            ["Cierra 3× más ventas en la mitad de tiempo, sin contratar más vendedores", true],
            ["La plataforma más completa del mercado", false],
            ["Tecnología de punta con Claude y GPT-4", false],
          ],
          "La propuesta de valor habla del resultado del cliente, no de tu producto. 'Cierra más ventas' > 'Software con features'.",
        ),
        tf(
          "L3",
          "El mito del lead frío",
          "¿Es cierto que los leads fríos convierten igual que los calientes si usas IA?",
          false,
          "Aunque la IA mejora la conversión, los leads calientes siguen convirtiendo 5-10× mejor. La IA no reemplaza la calificación.",
        ),
      ],
    },
    {
      code: "MK02",
      title: "Investigación con IA",
      description: "Cómo investigar audiencia, dolores y oferta de competencia en horas (no semanas) con prompts estructurados.",
      weekLabel: "Semana 2",
      xpReward: 70,
      lessons: [
        mc(
          "L1",
          "Investigación de audiencia",
          "¿Cuál es la fuente más rica para entender el lenguaje real de tu cliente ideal?",
          [
            ["Encuestas estructuradas", false],
            ["Reviews de productos competidores en Amazon/G2/Trustpilot", true],
            ["Estadísticas de la industria", false],
            ["Tu propio criterio como fundador", false],
          ],
          "Los reviews son el voz-del-cliente puro. La gente escribe sus dolores reales en sus propias palabras — oro puro para tu copy.",
        ),
        mc(
          "L2",
          "Prompt de research",
          "¿Qué falta en este prompt? 'Resume los dolores del cliente de [producto X].'",
          [
            ["Tono deseado", false],
            ["Fuente específica + formato de salida + dolores en palabras del cliente", true],
            ["Idioma", false],
            ["Longitud", false],
          ],
          "Un prompt fuerte tiene: fuente (de dónde sacar info), formato (cómo entregar) y restricciones (qué SÍ y qué NO).",
        ),
        mc(
          "L3",
          "Espionaje competitivo ético",
          "¿Cuál NO es una forma ética de investigar competencia?",
          [
            ["Suscribirse a sus newsletters", false],
            ["Leer sus blogs públicos", false],
            ["Comprar un mes de su producto para probarlo", false],
            ["Hackear su panel de admin con cuentas robadas", true],
          ],
          "Todo lo público es legítimo. Pagar por su producto para probarlo es estándar. Acceso no autorizado es delito.",
        ),
      ],
    },
    {
      code: "MK03",
      title: "Contenido a escala (SEO + blog)",
      description: "Pipeline para producir 1 artículo SEO de 2,000 palabras en menos de 1 hora con IA.",
      weekLabel: "Semana 3",
      isBig: true,
      xpReward: 120,
      lessons: [
        mc(
          "L1",
          "Keywords de oportunidad",
          "¿Qué keyword tiene más oportunidad para una empresa nueva?",
          [
            ["'mejor crm' (volumen alto, competencia altísima)", false],
            ["'crm para fontaneros en español 2026' (volumen bajo, intent claro, competencia baja)", true],
            ["'crm' (volumen máximo)", false],
            ["'software' (genérico)", false],
          ],
          "Long-tail keywords con intent claro convierten 3-5× mejor y son rankeables sin presupuesto enorme.",
        ),
        mc(
          "L2",
          "Estructura ganadora",
          "¿Qué estructura tiene MEJOR probabilidad de rankear en 2026?",
          [
            ["Intro larga + texto corrido", false],
            ["TL;DR arriba + H2 con preguntas + ejemplos + FAQs + Schema markup", true],
            ["Solo bullets", false],
            ["Video embebido sin texto", false],
          ],
          "Google premia respuestas directas (TL;DR), estructura escaneable (H2 con preguntas) y datos estructurados (Schema).",
        ),
        tf(
          "L3",
          "Contenido 100% IA",
          "¿Google penaliza contenido escrito 100% por IA?",
          false,
          "Google penaliza contenido de baja calidad — sea humano o IA. Lo que importa es utilidad y experiencia (E-E-A-T), no el origen.",
        ),
      ],
    },
    {
      code: "MK04",
      title: "Email marketing automatizado",
      description: "Secuencias de bienvenida, nurture y reactivación con IA personalizando cada email.",
      weekLabel: "Semana 4",
      xpReward: 80,
      lessons: [
        mc(
          "L1",
          "Subject line",
          "¿Cuál subject line tiene mejor open rate?",
          [
            ["Newsletter semanal #47", false],
            ["te equivocaste con esto, ¿no? (minúsculas, curiosidad)", true],
            ["[OFERTA] -50% HOY MISMO ÚLTIMA OPORTUNIDAD", false],
            ["Boletín informativo de la empresa", false],
          ],
          "El subject que parece escrito por una persona real, no por una marca, gana siempre. Curiosidad + cercanía = clic.",
        ),
        mc(
          "L2",
          "Frecuencia ideal",
          "¿Cuántos emails enviar a un suscriptor nuevo en su primera semana?",
          [
            ["1 — no quiero molestar", false],
            ["3-5 emails de bienvenida con valor real", true],
            ["10+ emails todos los días", false],
            ["0 — esperar a que el suscriptor pida", false],
          ],
          "La primera semana es de máximo engagement. Una secuencia de 3-5 emails con valor convierte mejor que ser tímido.",
        ),
      ],
    },
    {
      code: "MK05",
      title: "Anuncios Meta + Google con IA",
      description: "Cómo escribir 50 variaciones de anuncio en 15 min y dejar que la IA encuentre la ganadora.",
      weekLabel: "Semana 5",
      xpReward: 90,
      lessons: [
        mc(
          "L1",
          "Estructura de campaña Meta",
          "¿Cuántas variaciones de creativo deberías probar al lanzar?",
          [
            ["1 — la mejor que se te ocurra", false],
            ["3-5 por ángulo emocional distinto", true],
            ["50+ aleatorias", false],
            ["Solo videos", false],
          ],
          "Meta necesita variabilidad para optimizar. 3-5 ángulos × 2-3 hooks × 2 CTAs te da 12-30 variaciones manejables.",
        ),
        mc(
          "L2",
          "Métrica que importa",
          "¿Cuál métrica refleja mejor la salud real de tu campaña?",
          [
            ["CTR alto", false],
            ["CPL bajo", false],
            ["ROAS o CAC vs LTV", true],
            ["Impresiones", false],
          ],
          "CTR y CPL son métricas intermedias. Lo único que importa al final es: cuánto cuesta un cliente vs. cuánto te paga en su vida útil.",
        ),
      ],
    },
    {
      code: "MK06",
      title: "Dashboard y atribución",
      description: "Cómo medir qué canal de marketing realmente trae plata (no clics) — con Looker + GA4 + UTMs.",
      weekLabel: "Semana 6",
      isBig: true,
      xpReward: 110,
      lessons: [
        mc(
          "L1",
          "UTM tracking",
          "¿Cuál es el orden correcto de los parámetros UTM más usados?",
          [
            ["utm_source / utm_medium / utm_campaign", true],
            ["utm_campaign / utm_medium / utm_source", false],
            ["utm_content / utm_term / utm_medium", false],
            ["Solo utm_source", false],
          ],
          "Source = de dónde (google, fb). Medium = qué tipo (cpc, email, social). Campaign = nombre de la campaña.",
        ),
        tf(
          "L2",
          "Atribución last-click",
          "¿Es confiable usar last-click attribution como única métrica?",
          false,
          "Last-click ignora todo el journey previo. En 2026, los clientes tocan 5-15 puntos antes de convertir. Usa modelos data-driven o multi-touch.",
        ),
      ],
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// CURSO 2 — PROGRAMACIÓN AVANZADA CON IA
// ════════════════════════════════════════════════════════════════════
const PROG_AVANZADA: CourseSpec = {
  slug: "programacion-avanzada-ia",
  title: "Programación avanzada con IA: sistemas en producción",
  subtitle: "Arquitectura, performance, observabilidad y escalado de SaaS con Claude/Cursor",
  type: "curso",
  durationLabel: "10 semanas · 7 módulos",
  priceUsd: 497,
  priceCompareUsd: 797,
  accent: "accent",
  description:
    "Para programadores que ya construyen con IA y quieren llevar sus sistemas a escala real: 10K+ usuarios, 99.9% uptime, latencias <100ms y costos controlados.",
  bullets: [
    "Arquitectura cliente-servidor moderna (Next.js + Edge + DB)",
    "Observabilidad: logs, traces, métricas con OpenTelemetry",
    "Optimización de performance (DB, frontend, API)",
    "Sistemas de colas, jobs en background, webhooks",
    "Estrategia de testing pragmática (unit + e2e + load)",
    "Seguridad: auth, secretos, rate limiting, OWASP top 10",
  ],
  isFeatured: true,
  sortOrder: 20,
  modules: [
    {
      code: "PA01",
      title: "Arquitectura moderna en 2026",
      description: "Por qué Next.js + Edge + Postgres + un buen ORM ganan a microservicios para 95% de los SaaS.",
      weekLabel: "Semana 1",
      xpReward: 80,
      lessons: [
        mc(
          "L1",
          "Monolito vs microservicios",
          "Para un SaaS con <100K usuarios, ¿qué arquitectura es generalmente superior?",
          [
            ["Microservicios — escala mejor", false],
            ["Monolito modular bien diseñado", true],
            ["Serverless puro con AWS Lambda", false],
            ["Kubernetes con 20 servicios", false],
          ],
          "Microservicios SOLO valen la pena cuando la complejidad organizacional > complejidad técnica. Para <100K usuarios, un monolito modular es más rápido de desarrollar, debuggear y operar.",
        ),
        mc(
          "L2",
          "ORM en producción",
          "¿Cuál es el mejor argumento PARA usar un ORM como Drizzle/Prisma vs SQL crudo?",
          [
            ["Es más rápido en runtime", false],
            ["Type safety + refactoring + migraciones versionadas", true],
            ["Genera mejores queries que un humano", false],
            ["Es la moda", false],
          ],
          "Un ORM moderno te da type safety end-to-end, migraciones versionadas y refactors seguros. La performance bien optimizada es comparable al SQL crudo.",
        ),
        tf(
          "L3",
          "Edge vs serverful",
          "¿Edge functions son siempre más rápidas que un servidor tradicional?",
          false,
          "Edge tiene latencia <50ms a usuarios distantes, pero las DB típicamente viven en una región. Si haces 3 queries por request, una Edge function en Singapur con DB en US puede ser MÁS lenta que un servidor en US.",
        ),
      ],
    },
    {
      code: "PA02",
      title: "Performance de base de datos",
      description: "Índices, query planning, conexiones pooling, N+1, y cuándo cachear.",
      weekLabel: "Semana 2",
      xpReward: 90,
      lessons: [
        mc(
          "L1",
          "El problema N+1",
          "Tu API hace 1 query para listar 50 órdenes + 50 queries para traer el customer de cada una. ¿Cómo lo arreglas?",
          [
            ["Cachear cada query individualmente", false],
            ["LEFT JOIN orders ON customers en una sola query", true],
            ["Borrar las órdenes viejas", false],
            ["Agregar más índices", false],
          ],
          "N+1 se resuelve con eager loading: traer relacionados en una sola query con JOIN o IN. Pasas de 51 queries a 1.",
        ),
        mc(
          "L2",
          "Cuándo poner índice",
          "¿En cuál columna SÍ pondrías un índice?",
          [
            ["status (solo 3 valores posibles, cardinalidad baja)", false],
            ["created_at (filtras y ordenas por fecha frecuentemente)", true],
            ["user_bio (texto largo, nunca filtras)", false],
            ["is_deleted (boolean)", false],
          ],
          "Índices brillan en columnas con alta cardinalidad usadas en WHERE/ORDER BY. Booleans y enums pequeños no se benefician (usar partial index si acaso).",
        ),
        mc(
          "L3",
          "Connection pool",
          "Tu app está en Vercel (lambdas) conectada a Postgres. ¿Qué herramienta resuelve el problema de explosión de conexiones?",
          [
            ["Más CPU en la DB", false],
            ["pgBouncer o un pooler como Supabase/Neon pooler", true],
            ["Aumentar max_connections en Postgres", false],
            ["Solo usar SQLite", false],
          ],
          "Cada lambda fría abre conexiones. Sin pooler, te quedas sin conexiones con tráfico medio. pgBouncer (modo transaction) sirve 10K+ lambdas con 50 conexiones reales a Postgres.",
        ),
      ],
    },
    {
      code: "PA03",
      title: "Observabilidad real",
      description: "Logs estructurados, traces distribuidos, métricas de negocio. Cuando algo falla, lo ves en segundos.",
      weekLabel: "Semana 3",
      isBig: true,
      xpReward: 120,
      lessons: [
        mc(
          "L1",
          "Logs estructurados",
          "¿Cuál log es más útil para debug en producción?",
          [
            ["console.log('error', err)", false],
            ["logger.error({ userId, orderId, err, traceId }, 'order_failed')", true],
            ["throw new Error('fail')", false],
            ["alert('algo falló')", false],
          ],
          "Logs estructurados (JSON con campos) son filtrables y agregables en Datadog/Logflare/Axiom. console.log es ruido en producción.",
        ),
        mc(
          "L2",
          "Métricas que importan",
          "¿Cuál NO es una de las 'Golden Signals' de SRE?",
          [
            ["Latencia (p50, p99)", false],
            ["Tráfico (req/seg)", false],
            ["Errores (% 5xx)", false],
            ["Cantidad de líneas de código", true],
          ],
          "Las Golden Signals son: Latencia, Tráfico, Errores, Saturación. Líneas de código no mide salud del sistema.",
        ),
      ],
    },
    {
      code: "PA04",
      title: "Background jobs y colas",
      description: "Cuándo usar una cola, qué herramienta elegir, cómo manejar reintentos y dead letters.",
      weekLabel: "Semana 4",
      xpReward: 90,
      lessons: [
        mc(
          "L1",
          "Cuándo encolar",
          "¿Cuál operación SIEMPRE deberías mover a una cola/job?",
          [
            ["Calcular el total de una orden (rápido)", false],
            ["Enviar email transaccional (puede fallar/tardar)", true],
            ["Validar un formulario", false],
            ["Devolver una vista HTML", false],
          ],
          "Todo lo que: a) puede fallar y necesita retry, b) tarda >500ms, c) requiere un servicio externo flaky. Email es el ejemplo canónico.",
        ),
        tf(
          "L2",
          "Idempotencia",
          "¿Un job que envía email debe ser idempotente?",
          true,
          "Sí. Si la cola reintenta (red caída, timeout), no quieres mandar el mismo email 3 veces. Usa un idempotency key (ej: orderId+'_confirmation').",
        ),
      ],
    },
    {
      code: "PA05",
      title: "Testing pragmático",
      description: "Cómo testear lo que importa sin convertirte en un cementerio de tests inútiles.",
      weekLabel: "Semana 5",
      xpReward: 80,
      lessons: [
        mc(
          "L1",
          "Pirámide de testing",
          "¿Cuál es la distribución sana de tests?",
          [
            ["100% unit tests", false],
            ["100% e2e (Playwright)", false],
            ["~70% unit, ~20% integration, ~10% e2e", true],
            ["Sin tests, mejor velocidad", false],
          ],
          "Unit tests son rápidos y específicos. E2E son lentos pero verifican el flujo real. La pirámide te da feedback rápido + confianza real.",
        ),
        mc(
          "L2",
          "Qué NO testear",
          "¿Cuál NO vale la pena cubrir con tests?",
          [
            ["Lógica de cálculo de precios + impuestos", false],
            ["Endpoint /api/checkout", false],
            ["Que un getter trivial devuelva el valor del campo", true],
            ["Flujo de login", false],
          ],
          "Testear getters triviales es ruido. Testea: a) lógica de negocio compleja, b) integraciones, c) bugs que ya pasaron (regresión).",
        ),
      ],
    },
    {
      code: "PA06",
      title: "Seguridad: lo no negociable",
      description: "Auth, secretos, rate limiting, OWASP top 10 aplicado a un SaaS Next.js real.",
      weekLabel: "Semana 6",
      isBig: true,
      xpReward: 110,
      lessons: [
        mc(
          "L1",
          "Hash de passwords",
          "¿Cuál algoritmo NO debes usar para hashear passwords?",
          [
            ["bcrypt", false],
            ["argon2", false],
            ["MD5 o SHA-256 directo", true],
            ["scrypt", false],
          ],
          "MD5/SHA son hashes rápidos — pensados para integridad de archivos, no para passwords. Usa bcrypt/argon2/scrypt que son LENTOS a propósito (resisten brute force).",
        ),
        mc(
          "L2",
          "Rate limiting",
          "¿Cuál endpoint NECESITA rate limit obligatorio?",
          [
            ["GET /api/products (público, cache-able)", false],
            ["POST /api/auth/login (target de brute force)", true],
            ["GET /api/me (autenticado)", false],
            ["POST /api/healthcheck", false],
          ],
          "Endpoints de auth son el target #1 de ataques. Sin rate limit, un atacante prueba passwords ilimitadas. Mínimo: 5 intentos / 15 min por IP.",
        ),
        tf(
          "L3",
          "Variables de entorno",
          "¿Está bien commitear .env.example con secretos placeholder?",
          true,
          ".env.example con placeholders ('DATABASE_URL=postgres://...') es buena práctica. .env real con secretos: JAMÁS al repo.",
        ),
      ],
    },
    {
      code: "PA07",
      title: "Deploy y CI/CD",
      description: "Pipelines, feature flags, blue-green deploys y cómo no romper producción los viernes.",
      weekLabel: "Semana 7",
      xpReward: 90,
      lessons: [
        mc(
          "L1",
          "Feature flags",
          "¿Para qué SÍ usar feature flags?",
          [
            ["Rollout gradual de feature nueva al 10%, 50%, 100%", true],
            ["Reemplazar tests", false],
            ["Cachear datos", false],
            ["Bloquear competidores", false],
          ],
          "Feature flags permiten: rollout gradual, kill-switch en producción, A/B testing, separar deploy de release. Caja de herramientas esencial.",
        ),
        mc(
          "L2",
          "Blue-green deploy",
          "¿Qué problema resuelve blue-green deployment?",
          [
            ["Memoria insuficiente", false],
            ["Downtime durante deploys + capacidad de rollback instantáneo", true],
            ["Latencia alta", false],
            ["Costos altos", false],
          ],
          "Blue-green: dos entornos idénticos, tráfico se cambia atómicamente entre ellos. Si el nuevo deploy falla, revertir es cambiar el router (segundos).",
        ),
      ],
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// CURSO 3 — VENTAS CON IA
// ════════════════════════════════════════════════════════════════════
const VENTAS: CourseSpec = {
  slug: "ventas-con-ia",
  title: "Ventas con IA: cierra 3× más sin contratar vendedores",
  subtitle: "Prospección, calificación y cierre asistido por IA para founders y operadores",
  type: "curso",
  durationLabel: "6 semanas · 5 módulos",
  priceUsd: 197,
  priceCompareUsd: 397,
  accent: "green",
  description:
    "Sistema completo de ventas B2B/B2C para founders que odian vender pero necesitan facturar. IA + procesos + un guión que funciona.",
  bullets: [
    "Prospección automatizada con IA (LinkedIn + Apollo + Sales Nav)",
    "Calificación BANT con scoring de IA",
    "Guión de demo + manejo de objeciones",
    "Email + WhatsApp de follow-up con personalización masiva",
    "Cierre asistido: cuándo precio, cuándo no descontar, cuándo retirarte",
  ],
  isFeatured: false,
  sortOrder: 30,
  modules: [
    {
      code: "VN01",
      title: "Mindset del vendedor moderno",
      description: "Por qué 'odiar vender' es una excusa cara y cómo reframear la venta como servicio.",
      weekLabel: "Semana 1",
      xpReward: 60,
      lessons: [
        mc(
          "L1",
          "Vender no es manipular",
          "¿Cuál es la definición funcional de venta ética?",
          [
            ["Convencer a alguien de algo que no necesita", false],
            ["Ayudar al cliente a tomar la mejor decisión para él, incluso si esa decisión es 'no compres'", true],
            ["Cerrar a cualquier costo", false],
            ["Bajar el precio hasta que diga sí", false],
          ],
          "El mejor vendedor a veces dice 'no es para ti, mira esta otra solución'. Eso genera confianza y referidos. Manipulación = ventas que se cancelan.",
        ),
        mc(
          "L2",
          "Métrica madre",
          "¿Cuál métrica refleja la salud real de tu pipeline?",
          [
            ["Cantidad de leads", false],
            ["Conversion rate por etapa + velocity (días en cada etapa)", true],
            ["Total de demos hechas", false],
            ["Llamadas hechas", false],
          ],
          "Pipeline saludable = leads se mueven rápido y convierten en cada etapa. Tener 1000 leads atascados es peor que 50 que avanzan.",
        ),
      ],
    },
    {
      code: "VN02",
      title: "Prospección con IA",
      description: "Cómo armar listas de 500 prospectos calificados en 1 hora y enviarles outreach personalizado a escala.",
      weekLabel: "Semana 2",
      isBig: true,
      xpReward: 100,
      lessons: [
        mc(
          "L1",
          "ICP — Ideal Customer Profile",
          "¿Cuál ICP es más útil?",
          [
            ["'Empresas en LATAM'", false],
            ["'Director de Marketing en SaaS B2B con 20-50 empleados en México, Colombia o Chile, que ya use HubSpot'", true],
            ["'Cualquiera con presupuesto'", false],
            ["'Startups'", false],
          ],
          "Un ICP útil es tan específico que puedes hacer la lista en 5 min. 'Cualquiera con presupuesto' no es ICP, es esperanza.",
        ),
        mc(
          "L2",
          "Email cold de 3 frases",
          "¿Cuál es la estructura más efectiva?",
          [
            ["Frase 1: Tu pitch. Frase 2: Tus features. Frase 3: '¿Tienes 30 min?'", false],
            ["Frase 1: Algo específico de su empresa. Frase 2: Un dolor relacionado. Frase 3: Pregunta concreta (no demo)", true],
            ["Solo un link a tu landing", false],
            ["Frase 1: 'Hola, ¿qué tal?'. Frase 2-10: monólogo", false],
          ],
          "Cold emails ganan cuando: (1) muestras que investigaste, (2) hablas su dolor, (3) pides algo pequeño (no demo de 1h, una pregunta de Sí/No).",
        ),
        tf(
          "L3",
          "Volumen vs personalización",
          "¿Es cierto que enviar 1,000 emails iguales convierte más que 100 emails personalizados con IA?",
          false,
          "Hoy es lo contrario. Los inboxes filtran spam mejor que nunca. 100 emails ultra-personalizados con IA superan a 1,000 genéricos en respuestas Y en deliverability.",
        ),
      ],
    },
    {
      code: "VN03",
      title: "Calificación y descubrimiento",
      description: "BANT, MEDDIC, SPICED — cómo elegir framework y cómo hacer las preguntas correctas en demo.",
      weekLabel: "Semana 3",
      xpReward: 80,
      lessons: [
        mc(
          "L1",
          "BANT",
          "¿Qué significa BANT?",
          [
            ["Budget, Authority, Need, Timeline", true],
            ["Big, Active, New, Trusted", false],
            ["Buy, Activate, Negotiate, Trial", false],
            ["Brand, Awareness, Niche, Touchpoint", false],
          ],
          "BANT clásico = ¿Tienen presupuesto? ¿Quien decide está en la conversación? ¿Tienen una necesidad real? ¿Hay un timeline definido? Si falla uno, no es deal.",
        ),
        mc(
          "L2",
          "Pregunta de descubrimiento",
          "¿Cuál pregunta de demo es más reveladora?",
          [
            ["¿Te gusta nuestro producto?", false],
            ["¿Qué pasaría si no resuelves este problema en 6 meses?", true],
            ["¿Cuánto cuesta tu solución actual?", false],
            ["¿Eres el decisor?", false],
          ],
          "La mejor pregunta de descubrimiento expone el costo de la inacción. Si la respuesta es 'nada', no hay dolor, no hay venta.",
        ),
      ],
    },
    {
      code: "VN04",
      title: "Manejo de objeciones con IA",
      description: "Las 7 objeciones universales y un framework para responder cada una sin sonar a robot.",
      weekLabel: "Semana 4",
      xpReward: 85,
      lessons: [
        mc(
          "L1",
          "Objeción 'está caro'",
          "Cliente dice 'está muy caro'. ¿Mejor respuesta inicial?",
          [
            ["Te hago 20% de descuento", false],
            ["¿Caro comparado con qué? Cuéntame qué presupuesto manejas y qué esperarías por ese precio.", true],
            ["Sí, sé que es caro pero es la mejor solución", false],
            ["Ok, no te molesto más", false],
          ],
          "Nunca descuentes a la primera. 'Caro' es relativo — hay que entender CON QUÉ compara. Muchas veces el cliente compara contra 'no hacer nada' (costo invisible).",
        ),
        mc(
          "L2",
          "Objeción 'lo pensaré'",
          "¿Qué hacer cuando dicen 'déjame pensarlo'?",
          [
            ["Aceptar y esperar 6 meses", false],
            ["Preguntar: '¿Qué información te falta para tomar una decisión hoy?' + agendar siguiente paso concreto", true],
            ["Bajar el precio", false],
            ["Mandar más emails", false],
          ],
          "'Déjame pensarlo' = casi siempre 'no'. La pregunta abre lo que realmente le falta. Y siempre cerrar con próximo paso agendado (fecha + hora).",
        ),
      ],
    },
    {
      code: "VN05",
      title: "Cierre y follow-up",
      description: "Cuándo y cómo cerrar. Por qué 80% de los deals se cierran después del 5º contacto.",
      weekLabel: "Semana 5",
      isBig: true,
      xpReward: 100,
      lessons: [
        mc(
          "L1",
          "Cuántos follow-ups",
          "Estadística real: ¿cuántos follow-ups necesita en promedio un deal B2B para cerrar?",
          [
            ["1 contacto", false],
            ["2-3 contactos", false],
            ["5-12 contactos", true],
            ["100+ contactos", false],
          ],
          "El 80% de las ventas requiere 5-12 contactos. El 90% de los vendedores se rinde después del 2º. Ahí está la oportunidad — persistencia educada gana.",
        ),
        mc(
          "L2",
          "Cierre asumido",
          "¿Cuál técnica de cierre es más natural y efectiva?",
          [
            ["'¿Compras o no?'", false],
            ["'Te paso el contrato hoy y arrancamos el lunes. ¿Te queda?' (asume el sí)", true],
            ["Silencio incómodo eterno", false],
            ["Llamar 5 veces al día", false],
          ],
          "Cierre asumido = das por hecho la venta y propones el siguiente paso operativo. Si hay objeción real, ahí emerge. Si no, cerraste.",
        ),
        tf(
          "L3",
          "Descuento por urgencia",
          "¿Crear urgencia artificial ('solo hoy 50% off') es buena práctica a largo plazo?",
          false,
          "Urgencia artificial daña la marca. Los clientes aprenden a esperar el descuento. Mejor: urgencia REAL (cohorte arranca el lunes, capacidad limitada de implementación).",
        ),
      ],
    },
  ],
};

const COURSES: CourseSpec[] = [MARKETING, PROG_AVANZADA, VENTAS];

// ════════════════════════════════════════════════════════════════════
// Seed logic
// ════════════════════════════════════════════════════════════════════
async function upsertCourse(spec: CourseSpec) {
  // Program: upsert by slug
  const existing = await db.select().from(s.programs).where(eq(s.programs.slug, spec.slug)).limit(1);
  let programId: string;
  if (existing.length > 0) {
    programId = existing[0]!.id;
    await db
      .update(s.programs)
      .set({
        title: spec.title,
        subtitle: spec.subtitle,
        type: spec.type,
        durationLabel: spec.durationLabel,
        priceUsd: spec.priceUsd,
        priceCompareUsd: spec.priceCompareUsd ?? null,
        accent: spec.accent,
        description: spec.description,
        bullets: spec.bullets,
        modulesCount: spec.modules.length,
        isFeatured: spec.isFeatured ?? false,
        isActive: true,
        sortOrder: spec.sortOrder,
      })
      .where(eq(s.programs.id, programId));
    console.log(`✓ Updated program ${spec.slug}`);
  } else {
    const inserted = await db
      .insert(s.programs)
      .values({
        slug: spec.slug,
        title: spec.title,
        subtitle: spec.subtitle,
        type: spec.type,
        durationLabel: spec.durationLabel,
        priceUsd: spec.priceUsd,
        priceCompareUsd: spec.priceCompareUsd ?? null,
        accent: spec.accent,
        description: spec.description,
        bullets: spec.bullets,
        modulesCount: spec.modules.length,
        isFeatured: spec.isFeatured ?? false,
        isActive: true,
        sortOrder: spec.sortOrder,
      })
      .returning({ id: s.programs.id });
    programId = inserted[0]!.id;
    console.log(`✓ Created program ${spec.slug}`);
  }

  // Modules
  for (let i = 0; i < spec.modules.length; i++) {
    const m = spec.modules[i]!;
    const existingMod = await db
      .select()
      .from(s.modules)
      .where(and(eq(s.modules.programId, programId), eq(s.modules.code, m.code)))
      .limit(1);
    let moduleId: string;
    if (existingMod.length > 0) {
      moduleId = existingMod[0]!.id;
      await db
        .update(s.modules)
        .set({
          title: m.title,
          description: m.description,
          weekLabel: m.weekLabel,
          isBig: m.isBig ?? false,
          sortOrder: i,
          xpReward: m.xpReward ?? 60,
        })
        .where(eq(s.modules.id, moduleId));
    } else {
      const insertedMod = await db
        .insert(s.modules)
        .values({
          programId,
          code: m.code,
          title: m.title,
          description: m.description,
          weekLabel: m.weekLabel,
          isBig: m.isBig ?? false,
          sortOrder: i,
          xpReward: m.xpReward ?? 60,
        })
        .returning({ id: s.modules.id });
      moduleId = insertedMod[0]!.id;
    }

    // Lessons
    for (let j = 0; j < m.lessons.length; j++) {
      const l = m.lessons[j]!;
      const existingLes = await db
        .select()
        .from(s.lessons)
        .where(and(eq(s.lessons.moduleId, moduleId), eq(s.lessons.code, l.code)))
        .limit(1);
      if (existingLes.length > 0) {
        await db
          .update(s.lessons)
          .set({
            title: l.title,
            kind: l.kind,
            question: l.question,
            body: l.body ?? null,
            options: l.options ?? [],
            correctKey: l.correctKey ?? null,
            hint: l.hint ?? null,
            explanation: l.explanation ?? null,
            xpReward: l.xpReward ?? 15,
            sortOrder: j,
          })
          .where(eq(s.lessons.id, existingLes[0]!.id));
      } else {
        await db.insert(s.lessons).values({
          moduleId,
          code: l.code,
          title: l.title,
          kind: l.kind,
          question: l.question,
          body: l.body ?? null,
          options: l.options ?? [],
          correctKey: l.correctKey ?? null,
          hint: l.hint ?? null,
          explanation: l.explanation ?? null,
          xpReward: l.xpReward ?? 15,
          sortOrder: j,
        });
      }
    }
    console.log(`  ✓ Module ${m.code} (${m.lessons.length} lecciones)`);
  }
  return programId;
}

async function enrollUser(userEmail: string, programIds: string[]) {
  const [user] = await db.select().from(s.users).where(eq(s.users.email, userEmail)).limit(1);
  if (!user) {
    console.warn(`  ⚠ Usuario ${userEmail} no encontrado — skip enrollment`);
    return;
  }
  for (const pid of programIds) {
    const existing = await db
      .select()
      .from(s.enrollments)
      .where(and(eq(s.enrollments.userId, user.id), eq(s.enrollments.programId, pid)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(s.enrollments).values({
        userId: user.id,
        programId: pid,
        status: "active",
      });
    }

    // Mark first module as 'current' for visual progress on the path
    const [firstMod] = await db
      .select()
      .from(s.modules)
      .where(eq(s.modules.programId, pid))
      .orderBy(s.modules.sortOrder)
      .limit(1);
    if (firstMod) {
      const existingProgress = await db
        .select()
        .from(s.moduleProgress)
        .where(and(eq(s.moduleProgress.userId, user.id), eq(s.moduleProgress.moduleId, firstMod.id)))
        .limit(1);
      if (existingProgress.length === 0) {
        await db.insert(s.moduleProgress).values({
          userId: user.id,
          moduleId: firstMod.id,
          state: "current",
        });
      }
    }
  }
  console.log(`✓ Inscrito ${userEmail} en ${programIds.length} cursos`);
}

async function main() {
  const ids: string[] = [];
  for (const c of COURSES) {
    const id = await upsertCourse(c);
    ids.push(id);
  }

  // También obtener el curso de programación profesional (ya seedeado)
  const [progPro] = await db
    .select()
    .from(s.programs)
    .where(eq(s.programs.slug, "programacion-con-ia"))
    .limit(1);
  if (progPro) ids.push(progPro.id);

  // Inscribir alumno de prueba en TODOS
  await enrollUser("alumno@cristianhdz.com", ids);

  // Reporte final
  const totalPrograms = await db.select().from(s.programs);
  const totalModules = await db.select().from(s.modules);
  const totalLessons = await db.select().from(s.lessons);
  console.log(`\n📚 Total en DB:`);
  console.log(`   ${totalPrograms.length} programas`);
  console.log(`   ${totalModules.length} módulos`);
  console.log(`   ${totalLessons.length} lecciones`);
  console.log(`\n✅ Alumno de prueba inscrito en ${ids.length} cursos.`);
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
