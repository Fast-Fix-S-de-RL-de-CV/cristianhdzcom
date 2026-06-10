"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { apiErrorMessage } from "@/lib/apiError";
import { isValidEmail } from "@/lib/format";

type Program = {
  id: string;
  slug: string;
  title: string;
  type: string;
  priceUsd: number;
  priceCompareUsd?: number;
  installmentPriceUsd?: number;
  installmentCount?: number;
};

const BUMPS = [
  { id: "books", title: "Bundle de mis 2 libros (digital)", desc: "El arte de hacer negocios sin dinero + por internet — instantáneo.", price: 19, was: 49 },
  { id: "sops", title: "Plantillas + SOPs de mi agencia", desc: "38 plantillas Notion + scripts de ventas que usamos a diario.", price: 39, was: 89 },
  { id: "1on1", title: "Mentoría 1:1 con Cristian (60 min)", desc: "Una sesión privada para revisar tu nicho, oferta y siguientes pasos.", price: 149, was: 299 },
];

export function CheckoutClient({
  program,
  recentSales,
  seatsLeft,
  cohortRange,
}: {
  program: Program;
  recentSales: number;
  seatsLeft: number | null;
  cohortRange: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("México");
  const [phone, setPhone] = useState("");
  const [activeBumps, setActiveBumps] = useState<Record<string, boolean>>({ books: true });
  const [coupon, setCoupon] = useState("EMPIEZA");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponInfo, setCouponInfo] = useState<{ kind: "amount" | "percent"; value: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 32);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const bumpsTotal = useMemo(
    () => BUMPS.filter((b) => activeBumps[b.id]).reduce((s, b) => s + b.price * 100, 0),
    [activeBumps],
  );
  const subtotalCents = program.priceUsd * 100 + bumpsTotal;
  const discountCents = useMemo(() => {
    if (!couponApplied || !couponInfo) return 0;
    if (couponInfo.kind === "percent") return Math.round((subtotalCents * couponInfo.value) / 100);
    return Math.min(subtotalCents, couponInfo.value);
  }, [couponApplied, couponInfo, subtotalCents]);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  async function onApplyCoupon() {
    setCouponError(null);
    if (!coupon.trim()) return;
    const res = await fetch(`/api/coupons/${encodeURIComponent(coupon.trim())}`);
    if (!res.ok) {
      setCouponApplied(false);
      setCouponInfo(null);
      setCouponError("Cupón no válido o expirado.");
      return;
    }
    const j = await res.json();
    setCouponInfo({ kind: j.kind, value: j.value });
    setCouponApplied(true);
  }

  async function onSubmit() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Nombre: debe tener al menos 2 caracteres.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Email: escribe un correo válido — ej. nombre@dominio.com.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          name: name.trim(),
          email: email.trim(),
          country,
          phone,
          bumps: BUMPS.filter((b) => activeBumps[b.id]).map((b) => ({ id: b.id, title: b.title, priceCents: b.price * 100 })),
          couponCode: couponApplied ? coupon.trim() : undefined,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(j, "No pudimos procesar tu pago."));
        return;
      }
      // ── MODO STRIPE: redirigir a Stripe Checkout ──
      if (j?.url) {
        window.location.href = j.url;
        return;
      }
      // ── MODO DEMO (sin Stripe): ir directo a confirmación ──
      if (j?.orderId) {
        router.push(j.redirectTo ?? `/checkout/${program.slug}/confirmacion?order=${j.orderId}`);
      }
    } catch {
      setError("Error de red — revisa tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "var(--bg-2)", minHeight: "100vh" }}>
      {/* Trust strip */}
      <div
        style={{
          background: "var(--accent-soft)",
          color: "var(--ink)",
          padding: "10px 56px",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {recentSales > 0 ? (
          <span>
            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
              {recentSales.toLocaleString("es-MX")} {recentSales === 1 ? "alumno" : "alumnos"}
            </strong>{" "}
            {recentSales === 1 ? "se inscribió" : "ya se inscribieron"} en los últimos 7 días
          </span>
        ) : (
          <span style={{ color: "var(--muted)" }}>Sé el primero de esta generación.</span>
        )}
        {seatsLeft !== null && (
          <span>
            <span
              className="pulse"
              style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginRight: 6 }}
            />
            {seatsLeft} {seatsLeft === 1 ? "cupo restante" : "cupos restantes"} en esta generación
          </span>
        )}
        <span style={{ color: "var(--muted)" }}>🔒 Pago 100% seguro · Stripe + PayPal</span>
      </div>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid var(--line)", padding: "20px 56px" }}>
        <div className="between" style={{ flexWrap: "wrap", gap: 16 }}>
          <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio">
            <img src="/logo.png" alt="Cristian Hernández" />
          </Link>
          <div className="row" style={{ gap: 24 }}>
            <Step n="1" label="Tu información" active />
            <span style={{ color: "var(--line-2)" }}>─</span>
            <Step n="2" label="Pago seguro" />
            <span style={{ color: "var(--line-2)" }}>─</span>
            <Step n="3" label="Confirmar" />
          </div>
          <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--muted)" }}>
            <span>¿Dudas?</span>
            <a href="mailto:info@cristianhdz.com" style={{ color: "var(--accent)", fontWeight: 600 }}>
              info@cristianhdz.com
            </a>
          </div>
        </div>
      </div>

      <div
        className="checkout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 1fr",
          gap: 32,
          padding: "32px 56px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT */}
        <div className="col" style={{ gap: 20 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.1 }}>Estás a 30 segundos de entrar a la generación.</h1>

          {/* Customer info */}
          <Card style={{ padding: 24 }}>
            <div className="between" style={{ marginBottom: 16 }}>
              <h3 className="serif" style={{ fontSize: 20 }}>
                ① Tu información
              </h3>
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              <Field label="Nombre" value={name} onChange={setName} required />
              <Field label="Email" type="email" value={email} onChange={setEmail} required />
              <Field label="País" value={country} onChange={setCountry} />
              <Field label="Teléfono" value={phone} onChange={setPhone} />
            </div>
            <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)" }}>
              El pago (tarjeta, PayPal, SPEI u OXXO) se completa en la página segura de Stripe — nunca capturamos tu
              tarjeta aquí.
            </div>
          </Card>

          {/* Order bumps */}
          <div>
            <Eyebrow style={{ marginBottom: 12 }}>🎁 Añade ahora — sólo en este checkout</Eyebrow>
            <div className="col" style={{ gap: 10 }}>
              {BUMPS.map((b) => {
                const on = !!activeBumps[b.id];
                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBumps((s) => ({ ...s, [b.id]: !on }))}
                    className="card"
                    style={{
                      padding: 18,
                      background: on ? "oklch(97% 0.02 75)" : "white",
                      borderColor: on ? "var(--warm)" : "var(--line)",
                      borderWidth: on ? 2 : 1,
                      display: "grid",
                      gridTemplateColumns: "28px 1fr auto",
                      gap: 14,
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: on ? "var(--warm)" : "white",
                        border: on ? "none" : "1.5px solid var(--line-2)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {on && "✓"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        Sí, añade: {b.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{b.desc}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="serif" style={{ fontSize: 22, color: "var(--warm)" }}>
                        +${b.price}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textDecoration: "line-through" }}>
                        ${b.was}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testimonial */}
          <Card style={{ padding: 20, borderLeft: "3px solid var(--accent)" }}>
            <div className="row" style={{ gap: 12, marginBottom: 10 }}>
              <div className="av" style={{ width: 40, height: 40, fontSize: 13, background: "var(--bg-2)" }}>
                MR
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>María Reyes</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  CFO · PYME · COMPRÓ HACE 4 MESES
                </div>
              </div>
              <div style={{ marginLeft: "auto", color: "var(--warm)" }}>★★★★★</div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
              &ldquo;Recuperé el costo del curso en la segunda semana. Si dudas, ya pagaste demasiado tiempo dudando.&rdquo;
            </p>
          </Card>

          {/* Final CTA */}
          {error && <div style={{ color: "var(--red)", fontSize: 13, marginTop: -8 }}>{error}</div>}
          <Button
            size="lg"
            shine
            disabled={submitting || !email || !name}
            onClick={onSubmit}
            style={{ justifyContent: "center", padding: "22px", fontSize: 17, width: "100%" }}
          >
            {submitting ? "Procesando…" : `Continuar al pago seguro · ${fmt(totalCents)} USD 🔒`}
          </Button>
          <div className="row" style={{ justifyContent: "center", gap: 20, fontSize: 12, color: "var(--muted)" }}>
            <span>🔒 256-bit SSL</span>
            <span>·</span>
            <span>Stripe verificado</span>
            <span>·</span>
            <span>Garantía 14 días</span>
          </div>
        </div>

        {/* RIGHT — sticky summary */}
        <aside style={{ position: "sticky", top: 20 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
              <div className="between">
                <Eyebrow>Tu pedido</Eyebrow>
                <span className="mono" style={{ fontSize: 11, color: secondsLeft < 60 ? "var(--red)" : "var(--muted)" }}>
                  EXPIRA EN {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <div className="row" style={{ gap: 14, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    background: "var(--accent)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-serif)",
                    fontSize: 26,
                    fontWeight: 600,
                  }}
                >
                  A
                </div>
                <div style={{ flex: 1 }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--accent)" }}>
                    {program.type.toUpperCase()} · GENERACIÓN
                  </span>
                  <h4 className="serif" style={{ fontSize: 17, lineHeight: 1.15 }}>
                    {program.title}
                  </h4>
                  {cohortRange && (
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                      {cohortRange}
                    </div>
                  )}
                </div>
                <div className="serif" style={{ fontSize: 22 }}>
                  ${program.priceUsd}
                </div>
              </div>

              <div className="col" style={{ gap: 8, paddingTop: 14, fontSize: 13 }}>
                {BUMPS.map((b) => {
                  const on = !!activeBumps[b.id];
                  return (
                    <div className="row" key={b.id}>
                      <span style={{ color: on ? "oklch(48% 0.13 155)" : "var(--muted)" }}>+ {b.title}</span>
                      <span
                        className="mono"
                        style={{ marginLeft: "auto", color: on ? "var(--ink)" : "var(--muted)" }}
                      >
                        {on ? `+$${b.price}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon */}
              <div className="row" style={{ marginTop: 16, gap: 8 }}>
                <input
                  className="input"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value.toUpperCase());
                    if (couponApplied) {
                      setCouponApplied(false);
                      setCouponInfo(null);
                    }
                  }}
                  style={{ flex: 1, padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 12 }}
                />
                <Button variant="ghost" size="sm" onClick={onApplyCoupon} type="button">
                  {couponApplied ? "✓ Aplicado" : "Aplicar"}
                </Button>
              </div>
              {couponError && (
                <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{couponError}</div>
              )}

              <div className="rule" style={{ margin: "16px 0" }} />

              <div className="col" style={{ gap: 6, fontSize: 13 }}>
                <div className="row">
                  <span style={{ color: "var(--muted)" }}>Subtotal</span>
                  <span className="mono" style={{ marginLeft: "auto" }}>
                    {fmt(subtotalCents)}
                  </span>
                </div>
                {discountCents > 0 && (
                  <div className="row">
                    <span style={{ color: "oklch(48% 0.13 155)" }}>
                      Cupón {coupon}
                    </span>
                    <span
                      className="mono"
                      style={{ marginLeft: "auto", color: "oklch(48% 0.13 155)" }}
                    >
                      −{fmt(discountCents)}
                    </span>
                  </div>
                )}
                <div className="row">
                  <span style={{ color: "var(--muted)" }}>Impuestos</span>
                  <span className="mono" style={{ marginLeft: "auto" }}>
                    $0
                  </span>
                </div>
              </div>

              <div className="row" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>Total hoy</span>
                <span className="serif" style={{ fontSize: 44, marginLeft: "auto", lineHeight: 1 }}>
                  {fmt(totalCents)}
                </span>
              </div>
              {program.installmentPriceUsd && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  o {program.installmentCount} cuotas de{" "}
                  <strong style={{ color: "var(--ink)" }}>${program.installmentPriceUsd}</strong> sin interés
                </div>
              )}
            </div>
          </Card>

          {/* Guarantee */}
          <Card
            style={{ padding: 20, marginTop: 14, display: "grid", gridTemplateColumns: "64px 1fr", gap: 14, alignItems: "center" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "oklch(95% 0.04 155)",
                color: "oklch(45% 0.13 155)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🛡
            </div>
            <div>
              <div className="serif" style={{ fontSize: 18 }}>
                Garantía 14 días
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                Si en 14 días no es lo que esperabas, devolución 100%. Sin preguntas.
              </div>
            </div>
          </Card>

          <Card style={{ padding: 20, marginTop: 14 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Recibes inmediatamente</Eyebrow>
            <div className="col" style={{ gap: 8, fontSize: 13 }}>
              {[
                "Acceso a la plataforma de aprendizaje",
                "Entrada a la comunidad CH · Discord",
                "Los 2 libros en tu correo",
                "Reserva de tu mentoría 1:1",
                "Calendario de talleres en vivo",
              ].map((t) => (
                <div key={t} className="row" style={{ gap: 10 }}>
                  <span style={{ color: "oklch(48% 0.13 155)", fontWeight: 700 }}>✓</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {["VISA", "MASTERCARD", "AMEX", "PAYPAL", "STRIPE", "OXXO"].map((s) => (
              <div
                key={s}
                style={{
                  padding: "6px 12px",
                  border: "1px solid var(--line-2)",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                  background: "white",
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, label, active, done }: { n: string; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: done ? "oklch(58% 0.13 155)" : active ? "var(--accent)" : "var(--bg-3)",
          color: done || active ? "white" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "var(--ink)" : "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label}
      </label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        style={{
          marginTop: 2,
          padding: "8px 0",
          borderRadius: 0,
          border: "none",
          borderBottom: "1.5px solid var(--line-2)",
          fontSize: mono ? 16 : 14,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontWeight: 500,
        }}
      />
    </div>
  );
}
