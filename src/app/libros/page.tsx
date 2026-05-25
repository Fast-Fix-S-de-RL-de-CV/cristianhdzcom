import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * /libros — Catálogo público de libros + bundles.
 *
 * Estrategia de venta aplicada:
 *
 *   1. Bookblocks alternados (Vol. I a la izquierda, Vol. II a la derecha) con
 *      portada premium en gradiente, rating + páginas, dos precios (digital y
 *      físico) y CTAs directos al checkout.
 *
 *   2. Cross-sell entre libros: chip discreto "Llévate ambos y ahorras $X"
 *      después de cada precio individual, que linkea al bundle digital.
 *
 *   3. Escalera de valor con 3 bundles ordenados de menor a mayor compromiso:
 *      digital → físico firmado → completo con talleres (badge RECOMENDADO).
 *
 *   4. Precio comparativo tachado para crear contraste de ahorro inmediato.
 *
 *   5. Urgencia honesta: si stockPhysical < 50, "Quedan X copias firmadas".
 *
 * Todo se renderea desde DB (tabla `books`). Admin puede crear/editar libros
 * y bundles desde /admin/libros sin tocar código.
 */
const ACCENT_GRADIENTS: Record<string, string> = {
  warm: "linear-gradient(135deg, oklch(35% 0.05 50), oklch(20% 0.04 60))",
  accent: "linear-gradient(135deg, oklch(40% 0.12 252), oklch(22% 0.08 245))",
  ink: "linear-gradient(135deg, oklch(38% 0.10 150), oklch(22% 0.05 160))",
};

function formatRating(avg: number | null, count: number) {
  if (avg == null) return `${count.toLocaleString("es-MX")} reseñas`;
  const stars = (avg / 10).toFixed(1);
  return `★ ${stars} · ${count.toLocaleString("es-MX")} reseñas`;
}

export default async function BooksPage() {
  const allRows = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.isActive, true))
    .orderBy(asc(schema.books.sortOrder));

  const books = allRows.filter((b) => !b.isBundle);
  const bundles = allRows.filter((b) => b.isBundle);

  // Bundle digital de referencia para cross-sell entre libros individuales.
  const digitalBundle = bundles.find(
    (b) =>
      (b.bundleIncludes?.books?.length ?? 0) >= 2 &&
      (b.bundleIncludes?.programs?.length ?? 0) === 0 &&
      b.hasDigital,
  );

  return (
    <div>
      <Nav />

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <Eyebrow>Biblioteca CH · {books.length} {books.length === 1 ? "título" : "títulos"}</Eyebrow>
        <h1 style={{ fontSize: "clamp(64px, 9vw, 96px)", marginTop: 16, maxWidth: 1100 }}>
          El arte de hacer <span style={{ color: "var(--warm)" }}>negocios</span>.
        </h1>
        <p style={{ fontSize: 20, color: "var(--muted)", maxWidth: 700, marginTop: 20, lineHeight: 1.5 }}>
          Dos manuales prácticos. Uno para empezar sin capital, otro para construir desde internet. Los mismos
          principios que se enseñan en los talleres.
        </p>
      </section>

      <div className="rule" />

      {books.map((b, idx) => {
        const accent = (b.accent === "warm" ? "warm" : "accent") as "warm" | "accent";
        const gradient = ACCENT_GRADIENTS[b.accent] ?? ACCENT_GRADIENTS.accent;
        const volLabel = `VOLUMEN ${toRoman(idx + 1)}`;
        const metaLabel = b.pages ? `${b.pages} págs` : `${idx + 1} de ${books.length}`;
        // Ahorro al comprar ambos vs individual digital.
        const savings =
          digitalBundle?.priceBundleUsd != null && b.priceDigitalUsd != null
            ? books.reduce((sum, x) => sum + (x.priceDigitalUsd ?? 0), 0) - digitalBundle.priceBundleUsd
            : null;
        return (
          <BookBlock
            key={b.id}
            slug={b.slug}
            vol={volLabel}
            accent={accent}
            flip={idx % 2 === 1}
            title={b.title}
            desc={b.description ?? b.subtitle ?? ""}
            bullets={b.bullets ?? []}
            digital={b.priceDigitalUsd ?? 0}
            physical={b.pricePrintUsd ?? 0}
            priceCompare={b.priceCompareUsd}
            hasDigital={b.hasDigital}
            hasPhysical={b.hasPhysical}
            stockPhysical={b.stockPhysical}
            rating={formatRating(b.ratingAvg, b.ratingCount)}
            meta={metaLabel}
            coverGradient={gradient}
            crossSellBundleSlug={digitalBundle?.slug ?? null}
            crossSellSavings={savings}
          />
        );
      })}

      {/* Bundles section */}
      {bundles.length > 0 && (
        <section
          className="sec"
          style={{ background: "var(--bg-2)", borderRadius: 32, margin: "0 56px 96px" }}
        >
          <div
            className="between"
            style={{ alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 24 }}
          >
            <div>
              <Eyebrow>Paquetes con descuento</Eyebrow>
              <h2 style={{ fontSize: 64, color: "var(--ink)", marginTop: 16 }}>
                Combos pensados para ahorrarte tiempo y dinero.
              </h2>
            </div>
            <span className="serif" style={{ fontSize: 22, color: "var(--muted)", maxWidth: 360, textAlign: "right" }}>
              Comprar todo junto siempre sale más barato — y te llega bien empaquetado.
            </span>
          </div>
          <div
            className="books-bundle-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(bundles.length, 3)}, 1fr)`,
              gap: 24,
            }}
          >
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

/* ─────────── Componente: Bookblock individual ─────────── */

function BookBlock({
  slug,
  vol,
  accent,
  title,
  desc,
  bullets,
  digital,
  physical,
  priceCompare,
  hasDigital,
  hasPhysical,
  stockPhysical,
  rating,
  meta,
  coverGradient,
  flip,
  crossSellBundleSlug,
  crossSellSavings,
}: {
  slug: string;
  vol: string;
  accent: "warm" | "accent";
  title: string;
  desc: string;
  bullets: string[];
  digital: number;
  physical: number;
  priceCompare: number | null;
  hasDigital: boolean;
  hasPhysical: boolean;
  stockPhysical: number | null;
  rating: string;
  meta: string;
  coverGradient: string;
  flip?: boolean;
  crossSellBundleSlug: string | null;
  crossSellSavings: number | null;
}) {
  const accentColor = accent === "warm" ? "var(--warm)" : "var(--accent)";
  const cover = (
    <div style={{ position: "relative" }}>
      <div style={{ aspectRatio: "3/4", position: "relative" }}>
        <div
          className="ph"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 4,
            background: coverGradient,
            border: "none",
            color: "var(--bg)",
            boxShadow: "0 30px 60px rgba(15,17,21,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset",
            flexDirection: "column",
            padding: 40,
            gap: 12,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.7 }}>
            {vol}
          </span>
          <span
            className="serif"
            style={{
              fontSize: 48,
              color: "var(--bg)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              alignSelf: "flex-start",
              textAlign: "left",
            }}
          >
            {title.replace(/\.$/, "")}
          </span>
          <span
            style={{
              marginTop: "auto",
              alignSelf: "flex-end",
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            Cristian Hernández
          </span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 24, gap: 12, flexWrap: "wrap" }}>
        <Chip variant={accent === "warm" ? "warm" : "accent"}>{rating}</Chip>
        <Chip>{meta}</Chip>
        {hasPhysical && stockPhysical != null && stockPhysical < 50 && stockPhysical > 0 && (
          <Chip variant="warm">🔥 Quedan {stockPhysical} firmadas</Chip>
        )}
      </div>
    </div>
  );

  const text = (
    <div>
      <span className="mono" style={{ fontSize: 12, color: accentColor, letterSpacing: "0.08em" }}>
        {vol} · {accent === "warm" ? "NEGOCIOS" : "INTERNET"}
      </span>
      <h2 style={{ fontSize: 72, marginTop: 12, marginBottom: 20 }}>{title}</h2>
      <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 24 }}>{desc}</p>
      <div className="grid-2" style={{ gap: 16, marginBottom: 32 }}>
        {bullets.map((t) => (
          <div key={t} className="row" style={{ gap: 10, fontSize: 14 }}>
            <span style={{ color: accentColor }}>✦</span> {t}
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 16, paddingTop: 24, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
        {hasDigital && (
          <div>
            <div className="serif" style={{ fontSize: 44 }}>
              ${digital}
              {priceCompare && priceCompare > digital ? (
                <span
                  className="mono"
                  style={{
                    fontSize: 14,
                    color: "var(--muted)",
                    textDecoration: "line-through",
                    marginLeft: 8,
                    fontWeight: 400,
                  }}
                >
                  ${priceCompare}
                </span>
              ) : null}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              DIGITAL · USD
            </div>
          </div>
        )}
        {hasPhysical && (
          <div>
            <div className="serif" style={{ fontSize: 44 }}>
              ${physical}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              FÍSICO · ENVÍO LATAM
            </div>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/blog`}>
            <Button size="lg" variant="ghost">
              Leer extracto
            </Button>
          </Link>
          <Link href={`/checkout/libro/${slug}`}>
            <Button size="lg">Comprar ahora →</Button>
          </Link>
        </div>
      </div>
      {crossSellBundleSlug && crossSellSavings && crossSellSavings > 0 && (
        <Link
          href={`/checkout/libro/${crossSellBundleSlug}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 18,
            padding: "8px 14px",
            background: "color-mix(in srgb, var(--accent) 12%, white)",
            color: "var(--accent)",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        >
          💡 LLEVA LOS 2 LIBROS Y AHORRA ${crossSellSavings} →
        </Link>
      )}
    </div>
  );

  return (
    <section className="sec" style={{ paddingTop: 80 }}>
      <div
        className="book-grid"
        style={{
          display: "grid",
          gridTemplateColumns: flip ? "1fr 0.85fr" : "0.85fr 1fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        {flip ? text : cover}
        {flip ? cover : text}
      </div>
    </section>
  );
}

/* ─────────── Componente: Bundle card ─────────── */

function BundleCard({ bundle }: { bundle: typeof schema.books.$inferSelect }) {
  const isRecommended = bundle.badge != null;
  const includesCount =
    (bundle.bundleIncludes?.books?.length ?? 0) + (bundle.bundleIncludes?.programs?.length ?? 0);

  return (
    <div
      style={{
        border: isRecommended ? "2px solid var(--accent)" : "1px solid var(--line)",
        background: "white",
        borderRadius: 18,
        padding: 28,
        position: "relative",
        boxShadow: isRecommended ? "0 16px 40px rgba(15,17,21,0.08)" : undefined,
      }}
    >
      {isRecommended && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: 28,
            background: "var(--accent)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {bundle.badge}
        </div>
      )}
      <Chip>
        {bundle.hasPhysical && bundle.hasDigital
          ? "DIGITAL + FÍSICO"
          : bundle.hasPhysical
            ? "FÍSICOS"
            : "DIGITAL"}
        {(bundle.bundleIncludes?.programs?.length ?? 0) > 0 ? " + TALLERES" : ""}
      </Chip>
      <div className="serif" style={{ fontSize: 56, color: "var(--ink)", marginTop: 16 }}>
        ${bundle.priceBundleUsd}
        {bundle.priceCompareUsd && bundle.priceCompareUsd > (bundle.priceBundleUsd ?? 0) ? (
          <span
            className="mono"
            style={{
              fontSize: 18,
              color: "var(--muted)",
              textDecoration: "line-through",
              marginLeft: 10,
              fontWeight: 400,
            }}
          >
            ${bundle.priceCompareUsd}
          </span>
        ) : null}
      </div>
      <div style={{ color: isRecommended ? "var(--ink-2)" : "var(--muted)", marginTop: 6, fontSize: 14 }}>
        {bundle.subtitle ?? `${includesCount} productos incluidos`}
      </div>
      {(bundle.bullets?.length ?? 0) > 0 && (
        <div className="col" style={{ gap: 8, marginTop: 18 }}>
          {bundle.bullets.map((b) => (
            <div key={b} className="row" style={{ gap: 8, fontSize: 13 }}>
              <span style={{ color: "var(--accent)" }}>✓</span> {b}
            </div>
          ))}
        </div>
      )}
      <Link href={`/checkout/libro/${bundle.slug}`}>
        <Button
          size="lg"
          variant={isRecommended ? "accent" : "ghost"}
          style={{ marginTop: 24, width: "100%", justifyContent: "center" }}
        >
          {isRecommended ? "Quiero esto →" : "Comprar bundle"}
        </Button>
      </Link>
    </div>
  );
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [val, sym] of map) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out || "I";
}
