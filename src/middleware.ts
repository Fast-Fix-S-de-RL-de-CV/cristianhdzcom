import { NextRequest, NextResponse } from "next/server";

/**
 * Routing multi-tenant (ver ARCHITECTURE_SAAS.md):
 *
 *  Host raíz (mimarca.app):
 *    /                  → rewrite /saas            (landing de la SaaS)
 *    /crear, /precios   → rewrite /saas/crear, ... (realm plataforma)
 *    /superadmin/**     → rewrite /saas/superadmin/**
 *    /api/platform/**   → pasa directo             (APIs plataforma)
 *    /{slug}/**         → rewrite /** + headers x-tenant-key/x-tenant-base
 *
 *  Cualquier otro Host (cristianhdz.com, dominios custom, o worker CF que
 *  manda X-Tenant-Host): NO se reescribe el path; solo headers de tenant.
 *
 * El middleware NO toca la DB: la resolución real del tenant vive en
 * src/lib/tenant.ts (server components / route handlers).
 */

const ROOT_HOSTS = new Set(
  (process.env.PLATFORM_ROOT_HOSTS || "mimarca.app,www.mimarca.app,localhost,127.0.0.1")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** Primeros segmentos del host raíz que pertenecen al realm plataforma. */
const PLATFORM_SEGMENTS = new Set(["saas", "crear", "precios", "superadmin"]);

function hostname(req: NextRequest): string {
  const xfh = req.headers.get("x-tenant-host") || req.headers.get("x-forwarded-host");
  const raw = (xfh || req.headers.get("host") || "").split(",")[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, "");
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // Assets / internals: nunca tenant-rewrite
  if (
    path.startsWith("/_next") ||
    path.startsWith("/uploads") ||
    /\.[a-zA-Z0-9]+$/.test(path) // archivos con extensión (logo.png, favicon…)
  ) {
    return NextResponse.next();
  }

  const host = hostname(req);
  const bare = host.startsWith("www.") ? host.slice(4) : host;

  // ── Realm por DOMINIO (cristianhdz.com, dominios custom, X-Tenant-Host) ──
  if (!ROOT_HOSTS.has(host) && !ROOT_HOSTS.has(bare)) {
    const headers = new Headers(req.headers);
    headers.set("x-tenant-key", `domain:${bare}`);
    headers.set("x-tenant-base", "");
    return NextResponse.next({ request: { headers } });
  }

  // ── Host raíz (mimarca.app) ──
  const seg = path.split("/")[1] ?? "";

  // Landing y páginas de plataforma → /saas/**
  if (seg === "" || PLATFORM_SEGMENTS.has(seg)) {
    if (seg === "saas") {
      // No exponer /saas directo: canónico es /
      const to = url.clone();
      to.pathname = path.replace(/^\/saas/, "") || "/";
      return NextResponse.redirect(to);
    }
    const to = url.clone();
    to.pathname = seg === "" ? "/saas" : `/saas${path}`;
    return NextResponse.rewrite(to);
  }

  // APIs de plataforma pasan directo (sin tenant)
  if (seg === "api") {
    return NextResponse.next();
  }

  // ── Tenant por SLUG: mimarca.app/{slug}/** → /** ──
  const slug = seg.toLowerCase();
  const rest = path.slice(1 + seg.length) || "/";
  const to = url.clone();
  to.pathname = rest;

  const headers = new Headers(req.headers);
  headers.set("x-tenant-key", `slug:${slug}`);
  headers.set("x-tenant-base", `/${slug}`);
  return NextResponse.rewrite(to, { request: { headers } });
}

export const config = {
  // Todo menos estáticos de Next (el propio middleware filtra extensiones)
  matcher: ["/((?!_next/static|_next/image).*)"],
};
