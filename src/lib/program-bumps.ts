/**
 * Catálogo de order bumps para el checkout de PROGRAMAS.
 *
 * Fuente de verdad de los precios: el cliente solo manda el `id` del bump
 * y el servidor resuelve título/precio aquí (nunca confía en el precio que
 * llegue del navegador).
 */

export type ProgramBump = {
  id: string;
  title: string;
  desc: string;
  /** Precio con descuento que paga el cliente (USD). */
  price: number;
  /** Precio normal sin descuento — solo para mostrar el ahorro (USD). */
  was: number;
};

export const PROGRAM_BUMPS: ProgramBump[] = [
  { id: "books", title: "Bundle de mis 2 libros (digital)", desc: "El arte de hacer negocios sin dinero + por internet — instantáneo.", price: 19, was: 49 },
  { id: "sops", title: "Plantillas + SOPs de mi agencia", desc: "38 plantillas Notion + scripts de ventas que usamos a diario.", price: 39, was: 89 },
  { id: "1on1", title: "Mentoría 1:1 con Cristian (60 min)", desc: "Una sesión privada para revisar tu nicho, oferta y siguientes pasos.", price: 149, was: 299 },
];

/**
 * Resuelve ids de bumps contra el catálogo server-side.
 * Devuelve `null` si algún id no existe (request manipulado → el caller
 * responde 400). El precio SIEMPRE sale del catálogo.
 */
export function resolveProgramBumps(
  ids: string[],
): { id: string; title: string; priceCents: number }[] | null {
  const out: { id: string; title: string; priceCents: number }[] = [];
  for (const id of ids) {
    const bump = PROGRAM_BUMPS.find((b) => b.id === id);
    if (!bump) return null;
    out.push({ id: bump.id, title: bump.title, priceCents: bump.price * 100 });
  }
  return out;
}
