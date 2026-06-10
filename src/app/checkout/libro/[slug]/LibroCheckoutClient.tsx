"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeBumps, basePrice, type Bump, type CheckoutFormat } from "@/lib/book-bumps";
import { apiErrorMessage } from "@/lib/apiError";
import { useToast } from "@/components/ui/ConfirmProvider";
import { Field } from "@/components/ui/Field";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";

type Book = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverUrl: string | null;
  pages: number | null;
  priceDigitalUsd: number | null;
  pricePrintUsd: number | null;
  priceCompareUsd: number | null;
  priceBundleUsd: number | null;
  hasDigital: boolean;
  hasPhysical: boolean;
  stockPhysical: number | null;
  digitalFileUrl: string | null;
  isBundle: boolean;
  bundleIncludes: { books?: string[]; programs?: string[] };
  ratingAvg: number | null;
  ratingCount: number;
  bullets: string[];
  accent: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export function LibroCheckoutClient({
  product,
  catalog,
  initialFormat,
  initialBumps,
  initialBuyer,
}: {
  product: Book;
  catalog: Book[];
  initialFormat: CheckoutFormat;
  initialBumps: Bump[];
  initialBuyer: { name: string; email: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [format, setFormat] = useState<CheckoutFormat>(initialFormat);
  const [acceptedBumps, setAcceptedBumps] = useState<Set<string>>(new Set());
  const [buyer, setBuyer] = useState(initialBuyer);
  const [shipping, setShipping] = useState({
    fullName: initialBuyer.name,
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "México",
    phone: "",
  });

  // Recompute bumps when format changes.
  const bumps = useMemo(
    () => (format === initialFormat ? initialBumps : computeBumps({ product: product as never, format, catalog: catalog as never })),
    [format, initialFormat, initialBumps, product, catalog],
  );

  // Reset acceptedBumps if user switches format (different bumps surface).
  function setFormatAndReset(f: CheckoutFormat) {
    setFormat(f);
    setAcceptedBumps(new Set());
  }

  const baseUsd = basePrice(product as never, format);
  const acceptedBumpsList = bumps.filter((b) => acceptedBumps.has(b.id));
  const bumpsTotal = acceptedBumpsList.reduce((sum, b) => sum + b.priceUsd, 0);
  const totalUsd = baseUsd + bumpsTotal;

  const needsShipping =
    format === "physical" || (format === "bundle" && product.hasPhysical);

  function toggleBump(id: string, checked: boolean) {
    setAcceptedBumps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit() {
    if (!buyer.name || !buyer.email) {
      toast.error("Falta nombre o email.");
      return;
    }
    if (needsShipping && (!shipping.line1 || !shipping.city || !shipping.postalCode || !shipping.country)) {
      toast.error("Falta dirección de envío.");
      return;
    }

    const payload = {
      slug: product.slug,
      format,
      buyer,
      shipping: needsShipping ? { ...shipping, fullName: shipping.fullName || buyer.name } : undefined,
      bumps: acceptedBumpsList.map((b) => ({
        productSlug: b.productSlug,
        variant: b.variant,
        priceUsd: b.priceUsd,
      })),
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/checkout/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          const msg =
            json?.error === "out_of_stock"
              ? "Se agotó el stock de la versión física."
              : json?.error === "shipping_required"
                ? "Necesitamos tu dirección de envío."
                : json?.error === "format_not_available"
                  ? "Ese formato no está disponible para este producto."
                  : apiErrorMessage(json, "No se pudo procesar la compra.");
          toast.error(msg);
          return;
        }
        // ── MODO STRIPE: redirigir a Stripe Checkout ──
        if (json.url) {
          window.location.href = json.url;
          return;
        }
        // ── MODO DEMO ──
        if (json.redirectTo) {
          router.push(json.redirectTo);
        }
      } catch {
        toast.error("Error de red al procesar la compra.");
      }
    });
  }

  return (
    <section
      className="sec checkout-grid"
      style={{
        paddingTop: 48,
        paddingBottom: 64,
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr",
        gap: 48,
        alignItems: "flex-start",
      }}
    >
      {/* ──────── LEFT: Producto + formato + bumps + envío ──────── */}
      <div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 8 }}>
          CHECKOUT · {product.isBundle ? "BUNDLE" : "LIBRO"}
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.1, marginBottom: 12 }}>
          {product.title}
        </h1>
        {product.subtitle && (
          <p style={{ fontSize: 17, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 24 }}>
            {product.subtitle}
          </p>
        )}

        {/* Selector de formato (solo si tiene múltiples opciones) */}
        {!product.isBundle && product.hasDigital && product.hasPhysical && (
          <div style={{ marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
              ELIGE EL FORMATO
            </div>
            <div className="row" style={{ gap: 12 }}>
              <FormatOption
                active={format === "digital"}
                onClick={() => setFormatAndReset("digital")}
                title="Digital"
                subtitle="PDF + EPUB · lectura inmediata"
                price={product.priceDigitalUsd ?? 0}
                priceCompare={product.priceCompareUsd}
              />
              <FormatOption
                active={format === "physical"}
                onClick={() => setFormatAndReset("physical")}
                title="Físico firmado"
                subtitle="Pasta dura · envío LATAM"
                price={product.pricePrintUsd ?? 0}
                priceCompare={null}
                disabled={product.stockPhysical != null && product.stockPhysical <= 0}
              />
            </div>
          </div>
        )}

        {/* ────── Order bumps (la pieza clave de la estrategia) ────── */}
        {bumps.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 12 }}>
              💡 OFERTAS EXCLUSIVAS EN ESTE CHECKOUT
            </div>
            <div className="col" style={{ gap: 12 }}>
              {bumps.map((b) => {
                const accepted = acceptedBumps.has(b.id);
                return (
                  <label
                    key={b.id}
                    style={{
                      display: "block",
                      cursor: "pointer",
                      padding: 18,
                      borderRadius: 12,
                      border: "2px solid " + (accepted ? "var(--accent)" : "var(--line-2)"),
                      background: accepted ? "color-mix(in srgb, var(--accent) 6%, white)" : "white",
                      transition: "all 150ms",
                    }}
                  >
                    <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => toggleBump(b.id, e.target.checked)}
                        style={{ marginTop: 4, width: 18, height: 18, accentColor: "var(--accent)" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{b.title}</span>
                          <span
                            className="mono"
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--accent)",
                              color: "white",
                              fontWeight: 800,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {b.highlight}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                          {b.subtitle}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* ────── Datos del comprador ────── */}
        <div style={{ marginBottom: 36 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 18 }}>
            TUS DATOS
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Field
              label="Nombre completo"
              format="name"
              required
              value={buyer.name}
              onChange={(v) => setBuyer({ ...buyer, name: v })}
              placeholder="Tu nombre"
              autoComplete="name"
              style={{ flex: "1 1 220px" }}
            />
            <Field
              label="Correo"
              format="email"
              required
              value={buyer.email}
              onChange={(v) => setBuyer({ ...buyer, email: v })}
              placeholder="tu@correo.com"
              autoComplete="email"
              style={{ flex: "1 1 220px" }}
            />
          </div>
        </div>

        {/* ────── Dirección (solo si físico) ────── */}
        {needsShipping && (
          <div style={{ marginBottom: 36 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 18 }}>
              📦 DIRECCIÓN DE ENVÍO
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              <Field
                label="Calle y número"
                required
                value={shipping.line1}
                onChange={(v) => setShipping({ ...shipping, line1: v })}
                placeholder="Av. Reforma 123"
                autoComplete="address-line1"
              />
              <Field
                label="Colonia / Apartamento"
                value={shipping.line2}
                onChange={(v) => setShipping({ ...shipping, line2: v })}
                placeholder="Opcional"
                autoComplete="address-line2"
              />
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                <Field
                  label="Ciudad"
                  format="title"
                  required
                  value={shipping.city}
                  onChange={(v) => setShipping({ ...shipping, city: v })}
                  placeholder="Tu ciudad"
                  autoComplete="address-level2"
                  style={{ flex: "1 1 170px" }}
                />
                <Field
                  label="Estado"
                  format="title"
                  required
                  value={shipping.state}
                  onChange={(v) => setShipping({ ...shipping, state: v })}
                  placeholder="Tu estado"
                  autoComplete="address-level1"
                  style={{ flex: "1 1 170px" }}
                />
                <Field
                  label="C.P."
                  format="postal"
                  required
                  value={shipping.postalCode}
                  onChange={(v) => setShipping({ ...shipping, postalCode: v })}
                  placeholder="00000"
                  autoComplete="postal-code"
                  maxLength={6}
                  style={{ flex: "0 1 120px" }}
                />
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                <SelectField
                  label="País"
                  required
                  value={shipping.country}
                  onChange={(v) => setShipping({ ...shipping, country: v })}
                  options={["México", "Colombia", "Argentina", "Chile", "Perú", "USA", "España", "Otro"]}
                  style={{ flex: "1 1 200px" }}
                />
                <Field
                  label="Teléfono"
                  format="phone"
                  value={shipping.phone}
                  onChange={(v) => setShipping({ ...shipping, phone: v })}
                  placeholder="10 dígitos"
                  autoComplete="tel"
                  help="Opcional — para coordinar la entrega"
                  style={{ flex: "1 1 200px" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────── RIGHT: Sticky summary + CTA ──────── */}
      <div>
        <div
          style={{
            position: "sticky",
            top: 100,
            padding: 28,
            borderRadius: 18,
            border: "1px solid var(--line)",
            background: "white",
            boxShadow: "0 16px 40px rgba(15,17,21,0.08)",
          }}
        >
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            RESUMEN
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>
            {product.title}
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
              · {formatLabel(format, product.isBundle)}
            </span>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div className="between">
              <span style={{ color: "var(--ink-2)" }}>{product.title.slice(0, 32)}{product.title.length > 32 ? "…" : ""}</span>
              <span className="mono">${baseUsd}</span>
            </div>
            {acceptedBumpsList.map((b) => (
              <div key={b.id} className="between" style={{ color: "var(--accent)" }}>
                <span>+ {b.title.replace(/^[^\s]+\s/, "").slice(0, 36)}</span>
                <span className="mono">${b.priceUsd}</span>
              </div>
            ))}
            <div className="between" style={{ paddingTop: 12, borderTop: "1px solid var(--line)", marginTop: 8 }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span className="serif" style={{ fontSize: 32 }}>${totalUsd}</span>
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={pending}
            size="lg"
            style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
          >
            {pending ? "Procesando…" : `Pagar $${totalUsd} USD →`}
          </Button>

          <div
            className="mono"
            style={{
              marginTop: 14,
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            🔒 STRIPE · PAYPAL · OXXO · SPEI
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-2)", textAlign: "center", lineHeight: 1.5 }}>
            ✓ Garantía de 30 días — devolución sin preguntas.
            <br />
            ✓ {needsShipping ? "Envío gratis LATAM en 7-12 días." : "Acceso inmediato al PDF tras el pago."}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", textAlign: "center" }}>
            <Link href="/libros" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "none" }}>
              ← Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormatOption({
  active,
  onClick,
  title,
  subtitle,
  price,
  priceCompare,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  price: number;
  priceCompare: number | null;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 18,
        borderRadius: 12,
        border: "2px solid " + (active ? "var(--ink)" : "var(--line-2)"),
        background: active ? "color-mix(in srgb, var(--ink) 5%, white)" : "white",
        textAlign: "left",
        opacity: disabled ? 0.4 : 1,
        transition: "all 120ms",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{subtitle}</div>
      <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
        <span className="serif" style={{ fontSize: 28 }}>${price}</span>
        {priceCompare && priceCompare > price ? (
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through" }}>
            ${priceCompare}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function formatLabel(f: CheckoutFormat, isBundle: boolean): string {
  if (isBundle) return "Bundle";
  if (f === "digital") return "Digital";
  if (f === "physical") return "Físico firmado";
  return "Producto";
}
