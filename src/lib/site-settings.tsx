import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/**
 * Helper único para acceder a la fila singleton de site_settings.
 * Si por alguna razón no existe la fila aún, devuelve defaults sensatos
 * (los mismos textos que antes vivían hardcoded en page.tsx) para que la
 * home nunca se rompa.
 */
export async function getSiteSettings() {
  const [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).limit(1);
  if (!row) return defaults();
  return row;
}

/** Defaults que se usan si la fila no existe. Evita layout-shift en cold start. */
function defaults(): typeof schema.siteSettings.$inferSelect {
  return {
    id: 1,
    heroChip1Label: "G20 · Brasil 2024 · Sudáfrica 2025",
    heroChip1Pulse: true,
    heroChip2Label: "HUAWEI SPARK 2023",
    heroEyebrow: "Hola, soy",
    heroTitle: "Cristian Hernández.",
    heroSubtitleAccent: "Arquitecto de Software",
    heroSubtitleRest: "y Empresario.",
    heroBio1:
      "Delegado mexicano en la Cumbre del G20 (Brasil 2024, Sudáfrica 2025). Director de **Fast Fix**, agencia de software a medida, y de **Click Thunder**, holding propietaria de 14 marcas SaaS. También opero empresas del sector restaurantero.",
    heroBio2:
      "Ganador del **Premio Huawei Spark 2023** por expansión en el sector informático. He compartido foros con empresarios como Marcus Dantus y Ernesto Coppel, y mantengo relación directa con los consulados de Brasil y México. Trabajar conmigo es sinónimo de *confianza, compromiso y resultados*.",
    heroCtaPrimaryLabel: "Empezar gratis →",
    heroCtaSecondaryLabel: "Ver mis empresas",
    heroPortraitUrl: "/uploads/cristian-portrait.jpg",
    heroPortraitFooterLine: "FAST FIX · CLICK THUNDER · G20",
    heroPortraitChip: "● Disponible",
    heroStats: [
      { value: "14", label: "MARCAS SAAS" },
      { value: "G20", label: "DELEGADO MEXICANO" },
      { value: "2", label: "LIBROS PUBLICADOS" },
      { value: "2023", label: "HUAWEI SPARK" },
    ],
    heroQuoteText: "Confianza, compromiso y resultados — esa es la promesa.",
    heroQuoteAttrib: "— CRISTIAN H. · 2026",
    updatedAt: new Date(),
  };
}

/**
 * Convierte texto markdown-light a JSX. Soporta:
 *   **bold**  → <strong>
 *   *italic*  → <em>
 *
 * Diseñado para los párrafos de bio del hero donde queremos enfatizar
 * nombres propios (Fast Fix, Click Thunder, Huawei Spark) y frases clave
 * (confianza, compromiso y resultados).
 */
export function renderMarkdownLight(text: string): React.ReactNode[] {
  if (!text) return [];
  const out: React.ReactNode[] = [];
  // Regex captura **...** o *...* (greedy mínimo, single line)
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(text.slice(lastIdx, match.index));
    }
    if (match[1]) {
      out.push(<strong key={key++} style={{ color: "var(--ink)" }}>{match[1]}</strong>);
    } else if (match[2]) {
      out.push(<em key={key++}>{match[2]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    out.push(text.slice(lastIdx));
  }
  return out;
}
