import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeDomain } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

/**
 * robots.txt por dominio custom, servido al Cloudflare Worker `miapp-worker`
 * (patrón tiendasyscom). Siempre responde text/plain, incluso ante error, para
 * que el worker nunca rompa. Hoy: default permisivo con sitemap del dominio.
 */

function robotsFor(domain: string | null): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (domain) lines.push(`Sitemap: https://${domain}/sitemap.xml`);
  return lines.join("\n") + "\n";
}

export async function GET(_req: Request, ctx: { params: Promise<{ domain: string }> }) {
  let domain: string | null = null;
  try {
    const { domain: raw } = await ctx.params;
    domain = normalizeDomain(decodeURIComponent(raw || ""));
    if (domain) {
      const [row] = await db
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.customDomain, domain))
        .limit(1);
      if (!row) domain = null; // dominio no vinculado: robots default sin sitemap
    }
  } catch {
    domain = null;
  }

  return new NextResponse(robotsFor(domain), {
    status: 200,
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" },
  });
}
