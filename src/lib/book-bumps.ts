/**
 * Order-bump engine para el checkout de libros.
 *
 * Reglas de marketing aplicadas (de mayor a menor relevancia):
 *
 *   1. Si compras 1 libro digital → ofrece el FÍSICO FIRMADO con descuento
 *      exclusivo (vs precio normal). Argumento: lo lees ya pero presumes
 *      el físico en tu librero.
 *
 *   2. Si compras 1 libro digital → ofrece el OTRO libro digital con
 *      descuento (mejor: el bundle digital completo si existe).
 *
 *   3. Si compras 1 libro físico → ofrece el DIGITAL ahora con descuento
 *      brutal (lo lees mientras llega el envío, riesgo 0).
 *
 *   4. Si compras bundle digital → ofrece sumar físicos firmados.
 *
 *   5. Si compras bundle físico → ofrece sumar digital ahora.
 *
 *   6. Si compras cualquier bundle sin talleres → ofrece subir al bundle
 *      premium con 2 talleres en vivo.
 *
 * El cálculo de bump price siempre debe ser MENOR al precio normal del
 * producto agregado — los bumps son una "puerta abierta" mientras hay
 * fricción mínima (ya está pagando).
 */

import type { books } from "@/db/schema";

type Book = typeof books.$inferSelect;

export type CheckoutFormat = "digital" | "physical" | "bundle";

export type Bump = {
  /** ID estable del bump (productSlug + variant). */
  id: string;
  /** Producto al que aplica el bump (slug). */
  productSlug: string;
  /** Variant del producto que se agrega (digital | physical | bundle). */
  variant: CheckoutFormat;
  /** Título corto, frase de venta. */
  title: string;
  /** Subtítulo / argumento. */
  subtitle: string;
  /** Precio con descuento que paga el cliente al aceptar (USD). */
  priceUsd: number;
  /** Precio normal sin el descuento del bump (USD) — para mostrar ahorro. */
  comparePriceUsd: number;
  /** Etiqueta del beneficio principal. */
  highlight: string;
};

export function computeBumps(opts: {
  /** El producto que el cliente está comprando ahora. */
  product: Book;
  /** Formato elegido para el producto principal. */
  format: CheckoutFormat;
  /** Catálogo completo (necesario para encontrar bundles y libros relacionados). */
  catalog: Book[];
}): Bump[] {
  const { product, format, catalog } = opts;
  const bumps: Bump[] = [];

  const otherBooks = catalog.filter((b) => !b.isBundle && b.id !== product.id && b.isActive);
  const digitalBundle = catalog.find(
    (b) => b.isBundle && b.isActive && b.hasDigital && !b.hasPhysical && (b.bundleIncludes?.programs?.length ?? 0) === 0,
  );
  const physicalBundle = catalog.find(
    (b) => b.isBundle && b.isActive && b.hasPhysical && !b.hasDigital && (b.bundleIncludes?.programs?.length ?? 0) === 0,
  );
  const premiumBundle = catalog.find(
    (b) => b.isBundle && b.isActive && (b.bundleIncludes?.programs?.length ?? 0) > 0,
  );

  // ── Caso 1: libro individual en DIGITAL ──
  if (!product.isBundle && format === "digital") {
    // BUMP A: súmalo en físico firmado con descuento
    if (product.hasPhysical && product.pricePrintUsd != null) {
      const discounted = Math.max(15, Math.round(product.pricePrintUsd * 0.55));
      bumps.push({
        id: `${product.slug}-add-physical`,
        productSlug: product.slug,
        variant: "physical",
        title: `📚 Suma el físico firmado por solo $${discounted}`,
        subtitle: "Lectura inmediata en digital + ejemplar físico firmado por Cristian. Envío gratis LATAM.",
        priceUsd: discounted,
        comparePriceUsd: product.pricePrintUsd,
        highlight: `AHORRA $${product.pricePrintUsd - discounted}`,
      });
    }
    // BUMP B: mejor lleva el bundle digital (los 2 libros) con descuento del 2do
    if (digitalBundle?.priceBundleUsd != null && product.priceDigitalUsd != null) {
      const upgradeCost = Math.max(10, digitalBundle.priceBundleUsd - product.priceDigitalUsd);
      const otherBook = otherBooks.find((b) => digitalBundle.bundleIncludes?.books?.includes(b.slug));
      if (otherBook?.priceDigitalUsd != null) {
        bumps.push({
          id: `${product.slug}-upgrade-digital-bundle`,
          productSlug: digitalBundle.slug,
          variant: "bundle",
          title: `🎁 Mejor lleva los 2 libros digitales por solo +$${upgradeCost}`,
          subtitle: `Vol. I + Vol. II completos. El segundo libro normalmente cuesta $${otherBook.priceDigitalUsd}.`,
          priceUsd: upgradeCost,
          comparePriceUsd: otherBook.priceDigitalUsd,
          highlight: `2x1 DIGITAL`,
        });
      }
    }
  }

  // ── Caso 2: libro individual en FÍSICO ──
  if (!product.isBundle && format === "physical") {
    // BUMP A: súmale el digital por casi nada (lo lee mientras llega)
    if (product.hasDigital && product.priceDigitalUsd != null) {
      const discounted = Math.max(5, Math.round(product.priceDigitalUsd * 0.2));
      bumps.push({
        id: `${product.slug}-add-digital`,
        productSlug: product.slug,
        variant: "digital",
        title: `⚡ Suma el digital por solo +$${discounted} y léelo HOY`,
        subtitle: "Tu físico llega en 7-12 días. Empieza a leer en 2 minutos en cualquier dispositivo.",
        priceUsd: discounted,
        comparePriceUsd: product.priceDigitalUsd,
        highlight: `AHORRA $${product.priceDigitalUsd - discounted}`,
      });
    }
    // BUMP B: súbete al bundle físico de los 2
    if (physicalBundle?.priceBundleUsd != null && product.pricePrintUsd != null) {
      const upgradeCost = Math.max(20, physicalBundle.priceBundleUsd - product.pricePrintUsd);
      const otherBook = otherBooks.find((b) => physicalBundle.bundleIncludes?.books?.includes(b.slug));
      if (otherBook?.pricePrintUsd != null) {
        bumps.push({
          id: `${product.slug}-upgrade-physical-bundle`,
          productSlug: physicalBundle.slug,
          variant: "bundle",
          title: `📦 Mejor lleva los 2 físicos firmados por solo +$${upgradeCost}`,
          subtitle: `Vol. I + Vol. II en pasta dura firmada. El segundo normalmente cuesta $${otherBook.pricePrintUsd}.`,
          priceUsd: upgradeCost,
          comparePriceUsd: otherBook.pricePrintUsd,
          highlight: `2 LIBROS FIRMADOS`,
        });
      }
    }
  }

  // ── Caso 3: bundle digital de los 2 libros ──
  if (product.isBundle && product.hasDigital && !product.hasPhysical) {
    if (physicalBundle?.priceBundleUsd != null && product.priceBundleUsd != null) {
      const upgradeCost = Math.max(30, physicalBundle.priceBundleUsd - 10);
      bumps.push({
        id: `${product.slug}-add-physical-bundle`,
        productSlug: physicalBundle.slug,
        variant: "bundle",
        title: `📦 Suma los 2 físicos firmados por solo +$${upgradeCost}`,
        subtitle: "Lectura inmediata + biblioteca firmada en pasta dura. Envío gratis LATAM.",
        priceUsd: upgradeCost,
        comparePriceUsd: physicalBundle.priceBundleUsd,
        highlight: `AHORRA $${physicalBundle.priceBundleUsd - upgradeCost}`,
      });
    }
  }

  // ── Caso 4: bundle físico de los 2 libros ──
  if (product.isBundle && product.hasPhysical && !product.hasDigital) {
    if (digitalBundle?.priceBundleUsd != null) {
      const upgradeCost = Math.max(10, Math.round(digitalBundle.priceBundleUsd * 0.2));
      bumps.push({
        id: `${product.slug}-add-digital-bundle`,
        productSlug: digitalBundle.slug,
        variant: "bundle",
        title: `⚡ Suma los 2 digitales por solo +$${upgradeCost} y empieza HOY`,
        subtitle: "Mientras llega el envío, ya estás leyendo. PDF + EPUB + audio.",
        priceUsd: upgradeCost,
        comparePriceUsd: digitalBundle.priceBundleUsd,
        highlight: `AHORRA $${digitalBundle.priceBundleUsd - upgradeCost}`,
      });
    }
  }

  // ── Caso 5: cualquier bundle SIN talleres → ofrece upgrade al premium ──
  if (product.isBundle && (product.bundleIncludes?.programs?.length ?? 0) === 0) {
    if (premiumBundle?.priceBundleUsd != null && product.priceBundleUsd != null) {
      const upgradeCost = Math.max(80, premiumBundle.priceBundleUsd - product.priceBundleUsd);
      bumps.push({
        id: `${product.slug}-upgrade-premium`,
        productSlug: premiumBundle.slug,
        variant: "bundle",
        title: `🚀 Mejor el paquete completo con 2 talleres en vivo por +$${upgradeCost}`,
        subtitle: "Suma los 2 talleres en vivo con Cristian (8h total). Aplicas lo del libro en casos reales.",
        priceUsd: upgradeCost,
        comparePriceUsd: premiumBundle.priceBundleUsd,
        highlight: `RECOMENDADO`,
      });
    }
  }

  // Limita a 2 bumps para no saturar (psicología: más bumps = parálisis).
  return bumps.slice(0, 2);
}

/** Precio base del producto según el formato elegido. */
export function basePrice(product: Book, format: CheckoutFormat): number {
  if (product.isBundle) return product.priceBundleUsd ?? 0;
  if (format === "digital") return product.priceDigitalUsd ?? 0;
  if (format === "physical") return product.pricePrintUsd ?? 0;
  return 0;
}
