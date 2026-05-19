import Link from "next/link";

const COLS: [string, [string, string][]][] = [
  [
    "Aprende",
    [
      ["Talleres gratis", "/programas?filtro=taller"],
      ["Cursos", "/programas?filtro=curso"],
      ["Certificación", "/programas?filtro=cert"],
      ["Plataforma", "/plataforma"],
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
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
        <div>
          <div className="ch-logo">
            <img src="/logo.png" alt="Cristian Hernández" />
          </div>
          <p style={{ marginTop: 16, color: "var(--muted)", lineHeight: 1.6, maxWidth: 340 }}>
            Enseño a profesionales y empresarios a construir negocios y software con inteligencia artificial.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {["IG", "YT", "IN", "X", "TT"].map((s) => (
              <span
                key={s}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  background: "white",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
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
