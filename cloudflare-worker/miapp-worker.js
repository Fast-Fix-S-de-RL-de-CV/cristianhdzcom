/**
 * Cloudflare Worker — miapp-worker
 *
 * Basado en el worker de tiendasyscom. Idéntico salvo:
 *   - origen: tecnimarket.com → mimarca.app
 *   - NO reescribe "/" → "/{slug}" (ver nota "IMPORTANTE" abajo).
 *
 * Deploy: wrangler deploy cloudflare-worker/miapp-worker.js --name miapp-worker
 */

export default {
  async fetch(request, env, ctx) {
    const incomingUrl = new URL(request.url);

    const forwardedHost = request.headers.get("x-forwarded-host");
    let hostname = forwardedHost || incomingUrl.hostname;

    hostname = hostname.toLowerCase().trim();
    if (hostname.endsWith(".")) {
      hostname = hostname.slice(0, -1);
    }

    const cleanHostname = hostname.startsWith("www.")
      ? hostname.slice(4)
      : hostname;

    const pathname = incomingUrl.pathname;
    const search = incomingUrl.search;

    // Interceptar robots.txt
    if (pathname === "/robots.txt") {
      try {
        const robotsResponse = await fetch(
          `https://mimarca.app/api/public/robots-txt/${cleanHostname}`   // ← cambiado
        );
        const robotsContent = await robotsResponse.text();
        return new Response(robotsContent, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (e) {
        return new Response("User-agent: *\nAllow: /\n", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // Consultar el API para verificar que el dominio está vinculado
    const response = await fetch(
      `https://mimarca.app/api/check-domain/${cleanHostname}`   // ← cambiado
    );
    const data = await response.json();

    if (!data.isLinked) {
      return new Response(data.message || "Dominio no vinculado", {
        status: 404,
      });
    }

    // ← IMPORTANTE: en syscom aquí iba `proxyPath = "/" ? "/{slug}" : pathname`.
    // En mimarca (Next.js SSR) el slug es VIRTUAL — no existe una ruta física
    // /{slug} — y el tenant se resuelve por el header de dominio en TODAS las
    // rutas. Reescribir "/" → "/{slug}" haría que la home diera 404. Por eso se
    // proxya el path tal cual.
    const proxyPath = pathname;

    // URL destino
    const targetUrl = `https://mimarca.app${proxyPath}${search}`;   // ← cambiado

    const headers = new Headers(request.headers);
    headers.set("Host", "mimarca.app");            // ← cambiado
    headers.set("X-Forwarded-Host", cleanHostname);
    headers.set("X-Original-Host", cleanHostname);

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "follow",
    });

    return fetch(newRequest);
  },
};
