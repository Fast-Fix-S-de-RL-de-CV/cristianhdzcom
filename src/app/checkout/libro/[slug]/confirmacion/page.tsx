import Link from "next/link";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getStripe, finalizeCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConfirmacionLibroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; new?: string; session_id?: string }>;
}) {
  const { slug } = await params;
  const { order: orderIdParam, new: isNewAccount, session_id: sessionId } = await searchParams;
  let orderId = orderIdParam ?? null;
  let accountWasCreated = isNewAccount === "1";

  // Si vino de Stripe (session_id), finalizar aquí como fallback al webhook.
  if (!orderId && sessionId && isStripeConfigured()) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
      const [existing] = await db
        .select({ id: schema.orders.id, userId: schema.orders.userId })
        .from(schema.orders)
        .where(sql`${schema.orders.metadata}->>'stripeSessionId' = ${sessionId}`)
        .limit(1);
      if (existing) {
        orderId = existing.id;
      } else if (session.payment_status === "paid") {
        // Fallback si ni el webhook ni /api/checkout/finish procesaron aún.
        // El login NO ocurre aquí (una página no puede escribir cookies):
        // lo hace /api/checkout/finish antes de redirigir.
        const result = await finalizeCheckoutSession(session);
        orderId = result.orderId;
        accountWasCreated = accountWasCreated || result.createdNewAccount;
      }
    } catch (e) {
      console.error("[checkout/libro/confirmacion]", e);
    }
  }

  // ¿Hay sesión web abierta? (la abre /api/checkout/finish; aquí solo leemos)
  const me = await getCurrentUser();

  // Datos del producto comprado (para mostrar título + cover)
  const [product] = await db.select().from(schema.books).where(eq(schema.books.slug, slug)).limit(1);

  // Datos de la orden si tenemos id
  let order: typeof schema.orders.$inferSelect | null = null;
  if (orderId) {
    const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    order = row ?? null;
  }

  const meta = (order?.metadata ?? {}) as {
    bookTitle?: string;
    format?: string;
    shipping?: { city?: string; country?: string } | null;
  };
  const totalUsd = order ? Math.round(order.totalCents / 100) : 0;
  const isPhysical = meta.format === "physical" || (meta.format === "bundle" && product?.hasPhysical);

  return (
    <div>
      <Nav />
      <section className="sec" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 64,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            🎉
          </div>
          <h1 style={{ fontSize: 56, textAlign: "center", lineHeight: 1.1, marginBottom: 16 }}>
            ¡Compra confirmada!
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "var(--ink-2)",
              textAlign: "center",
              lineHeight: 1.5,
              marginBottom: 40,
            }}
          >
            Acabas de llevarte <strong>{meta.bookTitle ?? product?.title ?? "tu pedido"}</strong>.
            Te mandamos un email con la confirmación y los siguientes pasos.
          </p>

          <Card style={{ padding: 28 }}>
            <div
              className="mono"
              style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 12 }}
            >
              TU PEDIDO
            </div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{meta.bookTitle ?? product?.title}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {orderId && `Orden #${orderId.slice(0, 8).toUpperCase()}`}
              {meta.format && ` · ${meta.format.toUpperCase()}`}
              {totalUsd > 0 && ` · $${totalUsd} USD`}
            </div>

            <div className="rule" style={{ margin: "20px 0" }} />

            <div className="col" style={{ gap: 16 }}>
              {/* Entrega digital */}
              {meta.format !== "physical" && (
                <div>
                  <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <strong style={{ fontSize: 15 }}>Acceso digital inmediato</strong>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", marginLeft: 32, lineHeight: 1.55 }}>
                    Te mandamos el PDF + EPUB + el audio narrado al correo. Puedes empezar a leer en este momento.
                  </p>
                  {product?.digitalFileUrl && (
                    <div style={{ marginLeft: 32, marginTop: 10 }}>
                      <a href={product.digitalFileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm">Descargar ahora →</Button>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Envío físico */}
              {isPhysical && (
                <div>
                  <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>📦</span>
                    <strong style={{ fontSize: 15 }}>Envío en camino</strong>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", marginLeft: 32, lineHeight: 1.55 }}>
                    Tu(s) ejemplar(es) firmado(s) llegan en 7-12 días a{" "}
                    {meta.shipping?.city ? `${meta.shipping.city}, ` : ""}
                    {meta.shipping?.country ?? "tu dirección"}. Te mandamos el tracking en cuanto sale del taller.
                  </p>
                </div>
              )}

              {/* Acceso a la comunidad — clave: al comprar son clientes,
                  tienen cuenta y acceso al feed privado de inmediato. */}
              <div>
                <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>💬</span>
                  <strong style={{ fontSize: 15 }}>
                    {accountWasCreated ? "Te creamos cuenta + acceso a la comunidad" : "Tu acceso a la comunidad"}
                  </strong>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", marginLeft: 32, lineHeight: 1.55 }}>
                  {accountWasCreated
                    ? `Como acabas de convertirte en cliente, te creamos una cuenta${me ? " y ya estás logueado" : ""}. La contraseña temporal se mandó a tu correo — entra a 'Mi cuenta' para cambiarla.`
                    : "Ya eres parte oficial de la comunidad. Tienes acceso al feed privado, directorio de miembros y mensajería."}
                </p>
              </div>

              {/* Garantía */}
              <div>
                <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>🛡️</span>
                  <strong style={{ fontSize: 15 }}>Garantía de 30 días</strong>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", marginLeft: 32, lineHeight: 1.55 }}>
                  Si no te funciona, te devolvemos el 100% sin preguntas. Solo escríbenos a info@cristianhdz.com.
                </p>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <Link href="/comunidad">
              <Button>Entrar a la comunidad →</Button>
            </Link>
            <Link href="/libros">
              <Button variant="ghost">Ver más libros</Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
