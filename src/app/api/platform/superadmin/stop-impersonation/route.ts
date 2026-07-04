import { NextResponse } from "next/server";
import { stopImpersonation } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Salir de la impersonación. NO exige requireSuperAdmin: durante la
 * impersonación la sesión actúa como usuario de tenant, así que este endpoint
 * debe funcionar en ese estado. Solo revierte si la sesión estaba impersonando
 * (no-op en cualquier otro caso). Devuelve { redirectUrl: "/superadmin" }.
 */

export async function POST() {
  await stopImpersonation();
  return NextResponse.json({ ok: true, redirectUrl: "/superadmin" });
}
