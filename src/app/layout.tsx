import type { Metadata } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { Lightbox } from "@/components/ui/Lightbox";
import { TenantProvider, type TenantClientInfo } from "@/components/tenant/TenantProvider";
import { ImpersonationBar } from "@/components/tenant/ImpersonationBar";
import { getTenantCtx } from "@/lib/tenant";
import { resolveNavItems } from "@/lib/nav-items";

export const dynamic = "force-dynamic";

/**
 * Root layout multi-tenant (ver ARCHITECTURE_SAAS.md):
 *  - Realm tenant: branding del tenant → CSS vars inline + metadata + TenantProvider.
 *  - Realm plataforma (mimarca.app raíz): branding mimarca por defecto.
 */

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getTenantCtx();
  if (!ctx) {
    return {
      title: "mimarca.app — Tu plataforma de cursos y comunidad",
      description:
        "Lanza tu propia plataforma: sitio web, cursos, comunidad, membresías y pagos con tus propias llaves. La alternativa a Skool en español.",
      icons: { icon: [{ url: "/favicon.png", type: "image/png", sizes: "any" }] },
    };
  }
  const b = ctx.branding;
  const seo = b.seo ?? {};
  const title = seo.title || b.siteName;
  const description = seo.description || b.footerText || `${b.siteName} — cursos, comunidad y membresías.`;
  const requestUrl = ctx.tenant.customDomain
    ? `https://${ctx.tenant.customDomain}${ctx.basePath || ""}`
    : process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}${ctx.basePath || ""}`
      : undefined;
  const canonical = seo.canonicalUrl || requestUrl;
  const ogImage = seo.ogImageUrl || b.logoUrl || undefined;
  const robots = seo.robots === "noindex,nofollow"
    ? { index: false, follow: false }
    : { index: true, follow: true };

  return {
    title,
    description,
    keywords: seo.keywords?.length ? seo.keywords : undefined,
    alternates: canonical ? { canonical } : undefined,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: b.siteName,
      images: ogImage ? [{ url: ogImage, alt: title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    icons: {
      icon: [{ url: b.faviconUrl || "/favicon.png", type: "image/png", sizes: "any" }],
    },
  };
}

/** Deriva la paleta completa a partir de accent/ink/bg del tenant. */
function brandVars(b: { accent: string; ink: string; bg: string }): React.CSSProperties {
  const { accent, ink, bg } = b;
  return {
    ["--bg" as string]: bg,
    ["--bg-2" as string]: `color-mix(in srgb, ${bg} 96%, ${ink})`,
    ["--bg-3" as string]: `color-mix(in srgb, ${bg} 90%, ${ink})`,
    ["--ink" as string]: ink,
    ["--ink-2" as string]: `color-mix(in srgb, ${ink} 85%, ${bg})`,
    ["--navy" as string]: ink,
    ["--navy-2" as string]: `color-mix(in srgb, ${ink} 88%, white)`,
    ["--navy-3" as string]: `color-mix(in srgb, ${ink} 75%, white)`,
    ["--navy-soft" as string]: `color-mix(in srgb, ${ink} 10%, ${bg})`,
    ["--accent" as string]: `color-mix(in srgb, ${ink} 88%, white)`,
    ["--gold" as string]: accent,
    ["--gold-light" as string]: `color-mix(in srgb, ${accent} 72%, white)`,
    ["--gold-deep" as string]: `color-mix(in srgb, ${accent} 62%, black)`,
    ["--gold-soft" as string]: `color-mix(in srgb, ${accent} 14%, ${bg})`,
    ["--gold-line" as string]: `color-mix(in srgb, ${accent} 45%, ${bg})`,
    ["--gold-gradient" as string]: `linear-gradient(135deg, color-mix(in srgb, ${accent} 62%, black) 0%, color-mix(in srgb, ${accent} 72%, white) 40%, ${accent} 70%, color-mix(in srgb, ${accent} 55%, black) 100%)`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantCtx();

  const isDefaultBrand =
    !ctx ||
    (ctx.branding.accent === "#C8A951" && ctx.branding.ink === "#0A1E3A" && ctx.branding.bg === "#FBFAF5");

  const tenantInfo: TenantClientInfo = ctx
    ? {
        slug: ctx.tenant.slug,
        basePath: ctx.basePath,
        siteName: ctx.branding.siteName,
        accent: ctx.branding.accent,
        logoUrl: ctx.branding.logoUrl ?? null,
        navItems: resolveNavItems(ctx.branding.navItems),
      }
    : { slug: "", basePath: "", siteName: "mimarca.app", accent: "#C8A951", logoUrl: null, navItems: [] };

  return (
    <html lang="es" style={ctx && !isDefaultBrand ? brandVars(ctx.branding) : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ImpersonationBar />
        <TenantProvider value={tenantInfo}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </TenantProvider>
        <Lightbox />
      </body>
    </html>
  );
}
