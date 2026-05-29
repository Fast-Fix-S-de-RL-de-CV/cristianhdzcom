import type { Metadata } from "next";
import { Nav } from "@/components/marketing/Nav";

export const metadata: Metadata = {
  title: "Fast Fix — Soluciones en IT | Cristian Hernández",
  description:
    "Fast Fix: desarrollo de software a la medida, apps móviles, sitios y sistemas web, e-commerce, IA y automatización. Una de las empresas de Cristian Hernández.",
};

/**
 * /empresas/fast-fix
 *
 * Micrositio de Fast Fix embebido DEBAJO del menú nativo de cristianhdz.com,
 * para que se sienta "parte de" el sitio. El contenido vive como sitio
 * estático self-contained en /public/fast-fix (mismo stack/estilo que el zip
 * original: CSS moderno + Houdini + scroll-driven animations). Va en un iframe
 * a pantalla completa con scroll interno, lo que preserva intactos todos los
 * efectos (que dependen de su propio scroll-container) sin contaminar el CSS
 * global del resto de la app.
 */
export default function FastFixPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      <Nav />
      <iframe
        src="/fast-fix/index.html"
        title="Fast Fix — Soluciones en IT"
        style={{ flex: 1, width: "100%", border: 0, display: "block" }}
      />
    </div>
  );
}
