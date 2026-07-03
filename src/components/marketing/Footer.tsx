import Link from "next/link";
import { getTenantCtx } from "@/lib/tenant";

/** Iconos por red social — se reutilizan tanto en los defaults como en el branding del tenant. */
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  ),
  youtube: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  ),
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.8l-.4 2.9h-2.4V22c4.7-.8 8.4-4.9 8.4-10z" />
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  threads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 11.5c-.1 0-.2-.1-.3-.1-.2-2.7-1.7-4.3-4.1-4.3-1.5 0-2.7.6-3.4 1.8l1.4.9c.5-.8 1.3-1 2-1 .8 0 1.4.2 1.8.7.3.3.5.8.6 1.3-.7-.1-1.5-.2-2.3-.1-2.4.1-3.9 1.5-3.8 3.4 0 1 .5 1.8 1.3 2.4.7.4 1.5.7 2.5.6 1.3-.1 2.3-.5 2.9-1.4.5-.7.8-1.5.9-2.6.5.3.8.6 1.1 1 .4.6.4 1.6 0 2.7-.4 1-1 1.7-1.8 2.2-.8.6-1.9.8-3 .8-1.5 0-2.8-.5-3.7-1.4-1-1-1.5-2.4-1.5-4.2 0-1.8.5-3.3 1.5-4.2 1-1 2.2-1.5 3.7-1.5 1.2 0 2.2.3 3 .8.7.5 1.3 1.2 1.7 2.2l1.5-.6c-.4-1.2-1.2-2.1-2.2-2.8-1-.7-2.3-1-3.9-1-2 0-3.7.7-5 2-1.3 1.3-2 3.1-2 5.2 0 2.1.7 3.9 2 5.2 1.3 1.3 3 1.9 5 1.9 1.5 0 2.8-.3 3.9-1 1-.6 1.8-1.5 2.4-2.7.5-1 .7-2.1.7-3.2-.1-1.2-.5-2.2-1.3-2.9zM12.6 15c-.4 0-.8-.1-1.1-.3-.4-.2-.6-.6-.6-1 0-.7.6-1.2 1.8-1.3h.5c.4 0 .7 0 1.1.1-.2 1.5-.9 2.4-1.7 2.5z" />
    </svg>
  ),
  tiktok: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.6 6.9a4.8 4.8 0 01-3.4-1.4 4.8 4.8 0 01-1.4-3.4h-3.2v13.2a2.9 2.9 0 11-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.1 6.1 0 00-.9-.1 6.1 6.1 0 106.1 6.1V9.7a8 8 0 004.8 1.6V8.1z" />
    </svg>
  ),
  linkedin: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  ),
};

/** Defaults del footer (diseño actual de cristianhdz.com) — se usan cuando el
 * branding del tenant no define social / footerLinks propios. */
const DEFAULT_SOCIALS: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: "Instagram", href: "https://instagram.com/liccristianhdz", icon: SOCIAL_ICONS.instagram },
  { label: "YouTube", href: "https://youtube.com/@liccristianhdz", icon: SOCIAL_ICONS.youtube },
  { label: "Facebook", href: "https://facebook.com/liccristianhernandez", icon: SOCIAL_ICONS.facebook },
  { label: "X", href: "https://x.com/liccristianhdz", icon: SOCIAL_ICONS.x },
  { label: "Threads", href: "https://www.threads.com/@liccristianhdz", icon: SOCIAL_ICONS.threads },
];

const DEFAULT_COLS: [string, [string, string][]][] = [
  [
    "Aprende",
    [
      ["Talleres gratis", "/programas?filtro=taller"],
      ["Cursos", "/programas?filtro=curso"],
      ["Certificación", "/programas?filtro=cert"],
      ["Empieza gratis", "/registro"],
    ],
  ],
  [
    "Negocio",
    [
      ["Consultoría", "/programas?filtro=consultoria"],
      ["Agencia de software", "/programas?filtro=agencia"],
      ["Casos", "/blog"],
      ["Empresas", "mailto:info@cristianhdz.com"],
    ],
  ],
  [
    "Recursos",
    [
      ["Libros", "/libros"],
      ["Blog", "/blog"],
      ["Comunidad", "/comunidad"],
      ["Contacto", "mailto:info@cristianhdz.com"],
    ],
  ],
];

const DEFAULT_FOOTER_TEXT =
  "Enseño a profesionales y empresarios a construir negocios y software con inteligencia artificial.";

export async function Footer() {
  const ctx = await getTenantCtx();
  const tp = ctx?.tp ?? ((p: string) => p);
  const b = ctx?.branding;
  const siteName = b?.siteName ?? "Cristian Hernández";
  const logoUrl = ctx ? (b?.logoUrl ?? null) : "/logo.png";
  const footerText = ctx ? (b?.footerText ?? "") : DEFAULT_FOOTER_TEXT;

  // Redes: si el tenant configuró las suyas, se usan; si no, los defaults actuales.
  const brandedSocials = Object.entries(b?.social ?? {})
    .filter(([, url]) => typeof url === "string" && url.trim().length > 0)
    .map(([key, url]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      href: url as string,
      icon: SOCIAL_ICONS[key] ?? SOCIAL_ICONS.x,
    }));
  const socials = brandedSocials.length > 0 ? brandedSocials : DEFAULT_SOCIALS;

  // Columnas de links: footerLinks del branding (columna única) o defaults.
  const brandedLinks = (b?.footerLinks ?? []).filter((l) => l?.label && l?.href);
  const cols: [string, [string, string][]][] =
    brandedLinks.length > 0
      ? [["Enlaces", brandedLinks.map((l) => [l.label, l.href] as [string, string])]]
      : DEFAULT_COLS;

  return (
    <footer className="ch-foot">
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 3fr", gap: 48, marginBottom: 48 }}>
        <div>
          <div className="ch-logo">
            {logoUrl ? <img src={logoUrl} alt={siteName} /> : <span>{siteName}</span>}
          </div>
          {footerText && (
            <p style={{ marginTop: 16, color: "var(--muted)", lineHeight: 1.6, maxWidth: 340 }}>
              {footerText}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="footer-social"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-2)",
                  background: "white",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        {/* Las 3 columnas de links viven en su propio sub-grid: así se mantienen
            HORIZONTALES (3 columnas) también en móvil, en vez de apilarse y
            alargar el footer. */}
        <div className="footer-links">
          {cols.map(([t, links]) => (
            <div key={t}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>
                {t}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([label, href]) => (
                  <Link key={label} href={tp(href)} style={{ color: "var(--ink-2)", fontSize: 14 }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 24,
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        <span>© 2026 {siteName} — Todos los derechos reservados</span>
        <span className="mono">v. 2026 · Built with AI</span>
      </div>
    </footer>
  );
}
