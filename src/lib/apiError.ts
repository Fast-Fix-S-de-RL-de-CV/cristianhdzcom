/**
 * Convierte la respuesta de error de las APIs ({ error, details } con issues
 * de Zod) en un mensaje legible en español. Evita mostrar "invalid" pelón.
 */

type ZodIssueLite = { path?: (string | number)[]; message?: string; code?: string };
type ApiErrorBody = { error?: string; details?: ZodIssueLite[] };

/** Nombres bonitos para los campos más comunes de la plataforma. */
const FIELD_LABELS: Record<string, string> = {
  videoUrl: "URL del video",
  videoDurationSeconds: "Duración del video",
  title: "Título",
  code: "Código",
  question: "Pregunta",
  body: "Contenido",
  options: "Opciones",
  correctKey: "Respuesta correcta",
  hint: "Pista",
  explanation: "Explicación",
  xpReward: "XP",
  sortOrder: "Orden",
  moduleId: "Módulo",
  slug: "Slug",
  name: "Nombre",
  email: "Email",
  phone: "Teléfono",
  price: "Precio",
  priceCents: "Precio",
  currency: "Moneda",
  description: "Descripción",
  imageUrl: "Imagen",
  coverUrl: "Portada",
  linkUrl: "Link",
};

/** Traducciones de los mensajes en inglés que Zod trae por defecto. */
function translateZodMessage(msg: string): string {
  if (/^invalid url$/i.test(msg)) return "no es una URL válida (incluye https://)";
  if (/^invalid email$/i.test(msg)) return "no es un email válido";
  if (/^required$/i.test(msg)) return "es obligatorio";
  if (/^invalid$/i.test(msg)) return "tiene un valor inválido";
  let m = msg.match(/at least (\d+) character/i);
  if (m) return `debe tener al menos ${m[1]} caracteres`;
  m = msg.match(/at most (\d+) character/i);
  if (m) return `no puede pasar de ${m[1]} caracteres`;
  m = msg.match(/greater than or equal to (-?\d+)/i);
  if (m) return `debe ser ${m[1]} o mayor`;
  m = msg.match(/less than or equal to (-?\d+)/i);
  if (m) return `debe ser ${m[1]} o menor`;
  if (/expected number/i.test(msg)) return "debe ser un número";
  if (/expected string/i.test(msg)) return "debe ser texto";
  if (/invalid enum value|invalid option/i.test(msg)) return "tiene una opción no válida";
  if (/invalid uuid/i.test(msg)) return "tiene un identificador inválido";
  return msg; // mensajes custom ya vienen en español
}

const GENERIC: Record<string, string> = {
  invalid: "Hay un dato inválido en el formulario",
  forbidden: "No tienes permiso para hacer esto",
  unauthorized: "Tu sesión expiró — vuelve a iniciar sesión",
  not_found: "No se encontró el registro",
  server_error: "Error del servidor — intenta de nuevo",
};

/** Mensaje legible a partir del body de error de la API. */
export function apiErrorMessage(j: ApiErrorBody | null | undefined, fallback = "No se pudo guardar"): string {
  if (!j) return fallback;
  if (Array.isArray(j.details) && j.details.length > 0) {
    const issue = j.details[0];
    const rawField = issue.path && issue.path.length > 0 ? String(issue.path[0]) : "";
    const field = FIELD_LABELS[rawField] || rawField;
    const msg = translateZodMessage(issue.message || "tiene un valor inválido");
    return field ? `${field}: ${msg}` : msg;
  }
  if (j.error) return GENERIC[j.error] || j.error;
  return fallback;
}
