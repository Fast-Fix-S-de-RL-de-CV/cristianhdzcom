/**
 * Normalización + validación ISOMÓRFICA (cliente y servidor).
 *
 * Una sola fuente de verdad: el componente <Field> normaliza al escribir y las
 * APIs vuelven a normalizar como defensa. No dupliques estas reglas a mano.
 */

export type FieldFormat =
  | "name" // nombre de persona: solo letras/espacios/'- + Title Case
  | "email" // minúsculas, sin espacios
  | "phone" // solo dígitos, máx 15
  | "number" // solo dígitos
  | "postal" // solo dígitos (código postal)
  | "rfc" // mayúsculas, A-Z0-9&Ñ, máx 13
  | "upper" // TODO MAYÚSCULAS (conserva espacios/números/símbolos)
  | "title" // Title Case permitiendo números y símbolos
  | "text" // libre
  | "password"; // sin transformar

/** Title Case respetando acentos/ñ y separadores espacio/'/-. */
export const titleCase = (s: string): string =>
  s.toLowerCase().replace(/(^|[\s'\-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

export const fmtName = (r: string): string =>
  titleCase(r.replace(/[^\p{L}\s'\-]/gu, "").replace(/\s{2,}/g, " "));

export const fmtEmail = (r: string): string => r.toLowerCase().replace(/\s+/g, "");

export const fmtPhone = (r: string): string => r.replace(/\D/g, "").slice(0, 15);

export const fmtRfc = (r: string): string => r.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, "").slice(0, 13);

export const fmtDigits = (r: string): string => r.replace(/\D/g, "");

export const fmtUpper = (r: string): string => r.toUpperCase();

export const fmtTitle = (r: string): string => titleCase(r);

/** Aplica la normalización correspondiente al formato. */
export function applyFormat(format: FieldFormat | undefined, raw: string): string {
  switch (format) {
    case "name":
      return fmtName(raw);
    case "email":
      return fmtEmail(raw);
    case "phone":
      return fmtPhone(raw);
    case "number":
    case "postal":
      return fmtDigits(raw);
    case "rfc":
      return fmtRfc(raw);
    case "upper":
      return fmtUpper(raw);
    case "title":
      return fmtTitle(raw);
    case "text":
    case "password":
    default:
      return raw;
  }
}

export const isValidEmail = (s: string): boolean => /^\S+@\S+\.\S+$/.test(s.trim());

/** inputMode/teclado móvil sugerido por formato. */
export function inputModeFor(format: FieldFormat | undefined): "email" | "tel" | "numeric" | undefined {
  if (format === "email") return "email";
  if (format === "phone") return "tel";
  if (format === "number" || format === "postal") return "numeric";
  return undefined;
}

/** Formatos que tienen un concepto de "válido" (muestran ✓ y mensaje propio). */
export function hasValidity(format: FieldFormat | undefined): boolean {
  return format === "email" || format === "phone" || format === "name";
}

/**
 * Mensaje de error ESPECÍFICO por formato (nunca "datos inválidos").
 * Devuelve null si el valor es válido (o si está vacío y no es requerido).
 */
export function formatError(
  format: FieldFormat | undefined,
  value: string,
  required: boolean,
): string | null {
  const v = (value ?? "").trim();
  if (!v) return required ? "Este campo es obligatorio." : null;
  switch (format) {
    case "email":
      return isValidEmail(v) ? null : "Correo no válido — ej. nombre@dominio.com";
    case "phone":
      return v.replace(/\D/g, "").length >= 10 ? null : "El teléfono debe tener al menos 10 dígitos.";
    case "name":
      return v.length >= 2 ? null : "Escribe tu nombre completo.";
    case "rfc":
      return v.length >= 12 ? null : "El RFC debe tener 12 o 13 caracteres.";
    default:
      return null;
  }
}
