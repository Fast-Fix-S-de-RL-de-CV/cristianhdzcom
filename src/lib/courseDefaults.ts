/**
 * Contenido por defecto de las secciones editables de un curso. Se usa como
 * fallback en la página pública Y como precarga en el editor admin, para que
 * lo que ve el alumno y lo que edita el admin sean siempre lo mismo.
 */
export const DEFAULT_WHO_FOR: { t: string; d: string }[] = [
  { t: "Eres profesional o empleado", d: "Quieres dar el salto a usar IA en serio, no solo ChatGPT casual." },
  { t: "Tienes un negocio", d: "Buscas internalizar software y dejar de depender de freelancers caros." },
  { t: "Vienes del lado de negocio", d: "No programas hoy pero entiendes producto. Te volverás peligroso." },
];

export const DEFAULT_FAQS: { q: string; a: string }[] = [
  { q: "¿Necesito saber programar?", a: "No. Aceptamos profesionales sin código. Damos un onboarding de 5 días antes del kickoff." },
  { q: "¿Cuánto tiempo necesito por semana?", a: "Entre 6 y 8 horas. Las sesiones en vivo son 2 por semana de 2h." },
  { q: "¿Puedo pagar a plazos?", a: "Sí. 3 cuotas sin intereses con tarjeta. Para empresas emitimos factura." },
  { q: "¿Qué pasa si no me gusta?", a: "14 días de garantía, sin preguntas, devolución íntegra." },
  { q: "¿Recibo certificado?", a: "Sí, al completar los 4 proyectos. Es el sello CH · IA, no decorativo." },
];
