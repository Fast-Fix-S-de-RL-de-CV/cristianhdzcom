import Link from "next/link";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getStripe, finalizeCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Confirmación post-Stripe-Checkout.
 *
 * Acepta dos params:
 *   - `?session_id=cs_...` (cuando viene de Stripe vía /api/checkout/finish,
 *     que ya finalizó la orden y abrió la sesión web del comprador)
 *   - `?order=<uuid>` (modo demo / legado)
 *
 * Si llega session_id pero ni el webhook ni /finish procesaron todavía,
 * finaliza inline como fallback (idempotente). OJO: una página NO puede
 * escribir cookies, así que el login solo ocurre en /api/checkout/finish.
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const { slug } = await params;
  const { order: orderIdParam, session_id: sessionId } = await searchParams;

  let orderId = orderIdParam ?? null;
  let createdNewAccount = false;

  // Fallback al webhook: si vino de Stripe con session_id, finalize aquí.
  if (!orderId && sessionId && isStripeConfigured()) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "payment_intent"],
      });
      // ¿Ya hay un order? Buscar por metadata->>stripeSessionId.
      const [existing] = await db
        .select({ id: schema.orders.id, userId: schema.orders.userId })
        .from(schema.orders)
        .where(sql`${schema.orders.metadata}->>'stripeSessionId' = ${sessionId}`)
        .limit(1);
      if (existing) {
        orderId = existing.id;
      } else if (session.payment_status === "paid") {
        const result = await finalizeCheckoutSession(session);
        orderId = result.orderId;
        createdNewAccount = result.createdNewAccount;
      }
    } catch (e) {
      console.error("[checkout/confirmacion]", e);
    }
  }

  // ¿Hay sesión web abierta? (la abre /api/checkout/finish; aquí solo leemos)
  const me = await getCurrentUser();

  let order: typeof schema.orders.$inferSelect | null = null;
  let program: typeof schema.programs.$inferSelect | null = null;
  if (orderId) {
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    order = o ?? null;
    if (o?.programId) {
      const [p] = await db.select().from(schema.programs).where(eq(schema.programs.id, o.programId)).limit(1);
      program = p ?? null;
    }
  } else {
    const [p] = await db.select().from(schema.programs).where(eq(schema.programs.slug, slug)).limit(1);
    program = p ?? null;
  }

  return (
    <div>
      <Nav />
      <section className="sec" style={{ maxWidth: 720, margin: "0 auto", paddingTop: 64 }}>
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "oklch(95% 0.04 155)",
              color: "oklch(45% 0.13 155)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              margin: "0 auto 24px",
            }}
          >
            ✓
          </div>
          <Eyebrow>Pago confirmado</Eyebrow>
          <h1 style={{ fontSize: 48, marginTop: 12, marginBottom: 16 }}>¡Bienvenido a la generación!</h1>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.5 }}>
            Acabas de inscribirte a <strong style={{ color: "var(--ink)" }}>{program?.title}</strong>. Te enviamos los accesos
            a tu correo y tu lugar en la plataforma ya está listo.
          </p>
          {createdNewAccount && (
            <p style={{ fontSize: 14, color: "var(--gold-deep)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.5 }}>
              Te creamos cuenta automáticamente.{me ? " Ya estás logueado —" : ""} revisa tu correo para la contraseña temporal.
            </p>
          )}
          <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/plataforma">
              <Button size="lg">Ir a mi sendero →</Button>
            </Link>
            <Link href="/comunidad">
              <Button size="lg" variant="ghost">
                Entrar a la comunidad
              </Button>
            </Link>
          </div>
          {order && (
            <div className="mono" style={{ marginTop: 32, color: "var(--muted)", fontSize: 11 }}>
              ORDEN · {order.id.slice(0, 8).toUpperCase()} · ${(order.totalCents / 100).toFixed(0)} USD
            </div>
          )}
          {!orderId && sessionId && (
            <div className="mono" style={{ marginTop: 24, color: "var(--muted)", fontSize: 12 }}>
              Procesando tu pago… si en un minuto no ves el detalle, recarga la página.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
