import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getStripeForTenant, requestOrigin, finalizeCheckoutSession } from "@/lib/stripe";
import { getTenantCtx } from "@/lib/tenant";
import { createSession, getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/finish?session_id=cs_...&next=/ruta
 *
 * Punto de retorno de Stripe Checkout (success_url de programas, libros y
 * membresías). Es un Route Handler porque es el ÚNICO contexto donde Next
 * permite escribir cookies — las páginas de confirmación no pueden abrir
 * sesión durante el render.
 *
 *  1. Finaliza la session (idempotente: advisory lock vs webhook) con el
 *     Stripe DEL TENANT del request.
 *  2. Si el comprador no tiene sesión web, la abre (createSession).
 *  3. Redirige a `next` (solo paths relativos; ya viene con el basePath del
 *     tenant porque el checkout lo generó con ctx.tp()) conservando los
 *     searchParams originales, para que la página de confirmación resuelva
 *     la orden.
 */
export async function GET(req: Request) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  // Solo paths relativos del propio sitio (evita open redirect).
  let next = url.searchParams.get("next") || ctx.tp("/");
  if (!next.startsWith("/") || next.startsWith("//")) next = ctx.tp("/");

  // Host público real del request (dominio propio o mimarca.app/{slug}).
  const target = new URL(next, requestOrigin(req));
  url.searchParams.forEach((v, k) => {
    if (k !== "next") target.searchParams.set(k, v);
  });

  const { stripe } = await getStripeForTenant(ctx.tenant.id);
  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "payment_intent"],
      });
      await finalizeCheckoutSession(session, ctx.tenant.id);
    } catch (e) {
      // La página de confirmación tiene su propio fallback de finalize;
      // aquí no bloqueamos el redirect.
      console.error("[checkout/finish] finalize:", e);
    }

    try {
      // Abrir sesión web si el comprador no está logueado. El session_id de
      // Stripe es un token impredecible que solo el comprador recibe en el
      // redirect, así que sirve como prueba de posesión de la compra.
      const me = await getCurrentUser();
      if (!me) {
        const [order] = await db
          .select({ userId: schema.orders.userId })
          .from(schema.orders)
          .where(
            and(
              sql`${schema.orders.metadata}->>'stripeSessionId' = ${sessionId}`,
              eq(schema.orders.tenantId, ctx.tenant.id),
            ),
          )
          .limit(1);
        if (order?.userId) await createSession(order.userId);
      }
    } catch (e) {
      console.error("[checkout/finish] login:", e);
    }
  }

  return NextResponse.redirect(target);
}
