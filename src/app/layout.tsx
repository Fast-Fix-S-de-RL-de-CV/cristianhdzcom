import type { Metadata } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

export const metadata: Metadata = {
  title: "Cristian Hernández — Negocios y programación con IA",
  description:
    "Programador profesional con IA, autor de 2 libros y fundador de una agencia de software. Aprende a construir negocios y software con inteligencia artificial.",
  metadataBase: new URL(process.env.PUBLIC_SITE_URL || "http://localhost:3031"),
  openGraph: {
    title: "Cristian Hernández",
    description: "Aprende a hacer negocios y software con IA.",
    type: "website",
    images: [{ url: "/logo.png", width: 1260, height: 368, alt: "Cristian Hernández" }],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "any" }],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
