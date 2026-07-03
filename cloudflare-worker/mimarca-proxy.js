/**
 * Cloudflare Worker — mimarca-proxy
 *
 * Reverse proxy transparente para dominios personalizados de mimarca.app
 * (patrón rifabase, versión simple: SIN lookup de slug). Cuando un cliente
 * accede a tumarca.com, el Worker sirve el contenido de mimarca.app con el
 * MISMO path/query, seteando `X-Tenant-Host: tumarca.com`. El middleware de
 * Next (src/middleware.ts) resuelve el tenant por ese header — aquí no se
 * consulta nada.
 *
 * Deploy:
 *   1. wrangler deploy cloudflare-worker/mimarca-proxy.js --name mimarca-proxy
 *   2. (nada más — las worker routes por dominio las crea la API
 *      /api/admin/domain vía src/lib/cloudflare.ts; el nombre del script
 *      debe coincidir con env CLOUDFLARE_WORKER_NAME, default "mimarca-proxy")
 *
 * Variables de entorno requeridas en Cloudflare Dashboard → Workers → Settings:
 *   (ninguna — el origen está hardcodeado abajo)
 */

const ORIGIN = "https://mimarca.app";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    // Obtener hostname real (por si viene de otro proxy)
    const forwardedHost = request.headers.get("x-forwarded-host");
    let hostname = (forwardedHost || incomingUrl.hostname).toLowerCase().trim();

    // Quitar punto final si existe
    if (hostname.endsWith(".")) hostname = hostname.slice(0, -1);

    // Normalizar: quitar www (el middleware de Next también lo hace)
    const cleanHostname = hostname.startsWith("www.")
      ? hostname.slice(4)
      : hostname;

    const pathname = incomingUrl.pathname;
    const search = incomingUrl.search;

    // Interceptar robots.txt: permitir todo en dominios personalizados
    if (pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\n", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Proxy transparente: mismo path/query contra mimarca.app
    const targetUrl = `${ORIGIN}${pathname}${search}`;

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set("X-Tenant-Host", cleanHostname);
    proxyHeaders.set("X-Forwarded-Host", cleanHostname);

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.body,
      redirect: "follow",
    });

    return fetch(proxyRequest);
  },
};
