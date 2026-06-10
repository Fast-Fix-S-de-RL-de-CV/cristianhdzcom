import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { getStripe, siteUrl, isStripeConfigured, finalizeCheckoutSession } from "@/lib/stripe";
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
 *  1. Finaliza la session (idempotente: advisory lock vs webhook).
 *  2. Si el comprador no tiene sesión web, la abre (createSession).
 *  3. Redirige a `next` (solo paths relativos) conservando los searchParams
 *     originales, para que la página de confirmación resuelva la orden.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  // Solo paths relativos del propio sitio (evita open redirect).
  let next = url.searchParams.get("next") || "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  const target = new URL(next, siteUrl());
  url.searchParams.forEach((v, k) => {
    if (k !== "next") target.searchParams.set(k, v);
  });

  if (sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "payment_intent"],
      });
      await finalizeCheckoutSession(session);
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
          .where(sql`${schema.orders.metadata}->>'stripeSessionId' = ${sessionId}`)
          .limit(1);
        if (order?.userId) await createSession(order.userId);
      }
    } catch (e) {
      console.error("[checkout/finish] login:", e);
    }
  }

  return NextResponse.redirect(target);
}
