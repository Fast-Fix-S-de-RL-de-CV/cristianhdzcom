import Link from "next/link";

const SOCIALS: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "Instagram",
    href: "https://instagram.com/liccristianhdz",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@liccristianhdz",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/liccristianhernandez",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.8l-.4 2.9h-2.4V22c4.7-.8 8.4-4.9 8.4-10z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/liccristianhdz",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Threads",
    href: "https://www.threads.com/@liccristianhdz",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 11.5c-.1 0-.2-.1-.3-.1-.2-2.7-1.7-4.3-4.1-4.3-1.5 0-2.7.6-3.4 1.8l1.4.9c.5-.8 1.3-1 2-1 .8 0 1.4.2 1.8.7.3.3.5.8.6 1.3-.7-.1-1.5-.2-2.3-.1-2.4.1-3.9 1.5-3.8 3.4 0 1 .5 1.8 1.3 2.4.7.4 1.5.7 2.5.6 1.3-.1 2.3-.5 2.9-1.4.5-.7.8-1.5.9-2.6.5.3.8.6 1.1 1 .4.6.4 1.6 0 2.7-.4 1-1 1.7-1.8 2.2-.8.6-1.9.8-3 .8-1.5 0-2.8-.5-3.7-1.4-1-1-1.5-2.4-1.5-4.2 0-1.8.5-3.3 1.5-4.2 1-1 2.2-1.5 3.7-1.5 1.2 0 2.2.3 3 .8.7.5 1.3 1.2 1.7 2.2l1.5-.6c-.4-1.2-1.2-2.1-2.2-2.8-1-.7-2.3-1-3.9-1-2 0-3.7.7-5 2-1.3 1.3-2 3.1-2 5.2 0 2.1.7 3.9 2 5.2 1.3 1.3 3 1.9 5 1.9 1.5 0 2.8-.3 3.9-1 1-.6 1.8-1.5 2.4-2.7.5-1 .7-2.1.7-3.2-.1-1.2-.5-2.2-1.3-2.9zM12.6 15c-.4 0-.8-.1-1.1-.3-.4-.2-.6-.6-.6-1 0-.7.6-1.2 1.8-1.3h.5c.4 0 .7 0 1.1.1-.2 1.5-.9 2.4-1.7 2.5z" />
      </svg>
    ),
  },
];

const COLS: [string, [string, string][]][] = [
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

export function Footer() {
  return (
    <footer className="ch-foot">
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 3fr", gap: 48, marginBottom: 48 }}>
        <div>
          <div className="ch-logo">
            <img src="/logo.png" alt="Cristian Hernández" />
          </div>
          <p style={{ marginTop: 16, color: "var(--muted)", lineHeight: 1.6, maxWidth: 340 }}>
            Enseño a profesionales y empresarios a construir negocios y software con inteligencia artificial.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            {SOCIALS.map((s) => (
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
          {COLS.map(([t, links]) => (
            <div key={t}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>
                {t}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([label, href]) => (
                  <Link key={label} href={href} style={{ color: "var(--ink-2)", fontSize: 14 }}>
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
        <span>© 2026 Cristian Hernández — Todos los derechos reservados</span>
        <span className="mono">v. 2026 · Built with AI</span>
      </div>
    </footer>
  );
}
