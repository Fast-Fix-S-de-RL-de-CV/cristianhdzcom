"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEARN_LINKS = [
  { href: "/plataforma", icon: "◎", label: "Mi sendero" },
  { href: "/plataforma/talleres", icon: "✦", label: "Talleres en vivo" },
  { href: "/plataforma/biblioteca", icon: "≡", label: "Biblioteca" },
  { href: "/plataforma/proyectos", icon: "◇", label: "Proyectos" },
];

const COMMUNITY_LINKS = [
  { href: "/comunidad", icon: "○", label: "Feed" },
  { href: "/comunidad/calendario", icon: "○", label: "Eventos" },
  { href: "/comunidad/ranking", icon: "○", label: "Ranking" },
];

export function PlataformaSidebar() {
  const pathname = usePathname() || "/plataforma";

  const isActive = (href: string) => {
    if (href === "/plataforma") return pathname === "/plataforma";
    if (href === "/comunidad") return pathname === "/comunidad";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="plat-side">
      <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio">
        <img src="/logo.png" alt="Cristian Hernández" style={{ maxWidth: 180 }} />
      </Link>
      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
          Aprender
        </div>
        {LEARN_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-item ${isActive(l.href) ? "active" : ""}`}
          >
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>
      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
          Comunidad
        </div>
        {COMMUNITY_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-item ${isActive(l.href) ? "active" : ""}`}
          >
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>
      <div className="col" style={{ gap: 4, marginTop: "auto" }}>
        <Link
          href="/cuenta"
          className={`nav-item ${isActive("/cuenta") ? "active" : ""}`}
        >
          <span>⌂</span> Mi cuenta
        </Link>
        <div className="card" style={{ padding: 14, background: "var(--bg-2)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            SIGUIENTE GENERACIÓN
          </div>
          <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>
            04 Mar
          </div>
          <Link href="/programas">
            <button
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 10,
                padding: "8px 12px",
                fontSize: 12,
              }}
            >
              Ver programas
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
