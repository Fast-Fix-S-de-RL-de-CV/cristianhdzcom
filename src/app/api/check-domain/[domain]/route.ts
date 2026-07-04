import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeDomain } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

/**
 * Verificación de dominio para el Cloudflare Worker `miapp-worker`
 * (patrón tiendasyscom). El worker pregunta por cada dominio custom si está
 * ligado a un tenant; si no, responde 404 en el edge.
 *
 * Público (sin auth), CORS `*`. Se llama contra el host raíz mimarca.app.
 * Respuesta: { isLinked, tenantId, slug, message }.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_req: Request, ctx: { params: Promise<{ domain: string }> }) {
  const { domain: raw } = await ctx.params;
  const domain = normalizeDomain(decodeURIComponent(raw || ""));

  if (!domain) {
    return NextResponse.json(
      { isLinked: false, message: "Dominio no válido" },
      { status: 400, headers: CORS },
    );
  }

  const [row] = await db
    .select({ id: schema.tenants.id, slug: schema.tenants.slug })
    .from(schema.tenants)
    .where(eq(schema.tenants.customDomain, domain))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { isLinked: false, message: "Dominio no vinculado a ningún tenant" },
      { status: 200, headers: CORS },
    );
  }

  return NextResponse.json(
    { isLinked: true, tenantId: row.id, slug: row.slug, message: "Dominio vinculado a un tenant" },
    { status: 200, headers: CORS },
  );
}
