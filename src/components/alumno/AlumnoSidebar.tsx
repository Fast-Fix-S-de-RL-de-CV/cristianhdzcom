"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AlumnoActiveKey } from "./AlumnoShell";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  key: AlumnoActiveKey;
  notify?: boolean;
};

/**
 * Tiny outline icons drawn at 18px — matches the mock's clean stroke style.
 * Inlined for zero asset overhead and perfect color control.
 */
const Icon = {
  Compass: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={9} />
      <polygon points="16,8 13,13 8,16 11,11" fill="currentColor" stroke="none" opacity={0.9} />
    </svg>
  ),
  Live: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={3} fill="currentColor" stroke="none" />
      <path d="M6.5 6.5 a8 8 0 0 0 0 11" />
      <path d="M17.5 6.5 a8 8 0 0 1 0 11" />
      <path d="M3 4 a13 13 0 0 0 0 16" />
      <path d="M21 4 a13 13 0 0 1 0 16" />
    </svg>
  ),
  Library: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="5" height="16" rx="0.6" />
      <rect x="11" y="4" width="5" height="16" rx="0.6" />
      <path d="M17 4 L20 17 L18 20" />
    </svg>
  ),
  Code: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8,8 4,12 8,16" />
      <polyline points="16,8 20,12 16,16" />
      <line x1="13" y1="6" x2="11" y2="18" />
    </svg>
  ),
  Book: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5 a2 2 0 0 1 2 -2 h10 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 z" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  Chat: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12 a8 8 0 0 1 -11.6 7.1 L4 20 l1 -4.3 A8 8 0 1 1 21 12 z" />
    </svg>
  ),
  Calendar: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </svg>
  ),
  Members: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={9} cy={9} r={3.2} />
      <path d="M3 19 a6 6 0 0 1 12 0" />
      <circle cx={17} cy={10} r={2.5} />
      <path d="M16 14 a5 5 0 0 1 5 5" />
    </svg>
  ),
  Mail: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <polyline points="4,7 12,13 20,7" />
    </svg>
  ),
  Trophy: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4 h10 v6 a5 5 0 0 1 -10 0 z" />
      <path d="M7 7 H4.5 a2.5 2.5 0 0 0 2.5 2.5" />
      <path d="M17 7 h2.5 a2.5 2.5 0 0 1 -2.5 2.5" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="15" x2="12" y2="20" />
    </svg>
  ),
  Shield: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z" />
    </svg>
  ),
};

const APRENDER: NavLink[] = [
  { key: "sendero", href: "/plataforma", label: "Mi sendero", icon: Icon.Compass },
  { key: "talleres", href: "/plataforma/talleres", label: "Talleres en vivo", icon: Icon.Live, notify: true },
  { key: "biblioteca", href: "/plataforma/biblioteca", label: "Biblioteca", icon: Icon.Library },
  { key: "proyectos", href: "/plataforma/proyectos", label: "Mis proyectos", icon: Icon.Code },
  { key: "libros", href: "/libros", label: "Libros", icon: Icon.Book },
];

const COMUNIDAD: NavLink[] = [
  { key: "comunidad", href: "/comunidad", label: "Feed", icon: Icon.Chat },
  { key: "calendario", href: "/comunidad/calendario", label: "Calendario", icon: Icon.Calendar },
  { key: "miembros", href: "/comunidad/miembros", label: "Miembros", icon: Icon.Members },
  { key: "mensajes", href: "/mensajes", label: "Mensajes", icon: Icon.Mail },
  { key: "ranking", href: "/comunidad/ranking", label: "Ranking", icon: Icon.Trophy },
];

type SidebarUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  hearts: number;
};

/**
 * Sidebar premium navy oscuro para el modo alumno.
 * Sigue el mock 1:1: navy #061B36, logo dorado, MODO ALUMNO chip,
 * item activo con borde dorado izquierdo + fondo navy más claro,
 * notificaciones tipo punto rojo, identity card abajo con XP bar.
 */
export function AlumnoSidebar({
  user,
  active,
}: {
  user: SidebarUser;
  active: AlumnoActiveKey;
}) {
  const pathname = usePathname() || "";
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActiveKey = (key: AlumnoActiveKey) => key === active;
  const isActiveByPath = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  // XP progress towards next level. Use a simple linear curve:
  // each level requires (level * 500) XP to advance.
  const xpForCurrentLevel = user.level * 500;
  const xpForNextLevel = (user.level + 1) * 500;
  const xpProgress = Math.max(
    0,
    Math.min(1, (user.xp - xpForCurrentLevel) / Math.max(1, xpForNextLevel - xpForCurrentLevel)),
  );

  return (
    <aside
      className="plat-side alumno-sidebar"
      style={{
        background: "linear-gradient(180deg, #061B36 0%, #0B2548 100%)",
        borderRight: "1px solid rgba(216,168,63,0.10)",
        padding: "24px 14px 14px",
        gap: 18,
        color: "rgba(255,255,255,0.85)",
      }}
    >
      <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio" style={{ padding: "0 6px" }}>
        <img src="/logo.png" alt="Cristian Hernández" style={{ maxWidth: 180, filter: "brightness(1.05)" }} />
      </Link>

      {/* MODO ALUMNO label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            fontWeight: 700,
            color: "var(--gold)",
          }}
        >
          MODO ALUMNO
        </span>
        <svg width={10} height={6} viewBox="0 0 10 6" fill="none" style={{ marginLeft: 2 }}>
          <path d="M1 1.5 L5 4.5 L9 1.5" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>

      {/* APRENDER */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {APRENDER.map((l) => {
          const isActive = isActiveKey(l.key) || isActiveByPath(l.href);
          return <NavItem key={l.href} link={l} active={isActive} />;
        })}
      </div>

      {/* COMUNIDAD */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          className="mono"
          style={{
            padding: "0 14px 6px",
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.12em",
            fontWeight: 700,
          }}
        >
          COMUNIDAD
        </div>
        {COMUNIDAD.map((l) => {
          const isActive = isActiveKey(l.key) || isActiveByPath(l.href);
          return <NavItem key={l.href} link={l} active={isActive} />;
        })}
      </div>

      {/* Bottom: Mi cuenta + identity card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <NavItem
          link={{ key: "cuenta", href: "/cuenta", label: "Mi cuenta", icon: <span style={{ fontSize: 18 }}>⌂</span> }}
          active={isActiveKey("cuenta") || pathname === "/cuenta"}
        />

        {/* Identity card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(160deg, #F2C65A 0%, #D8A83F 100%)",
                color: "var(--navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.04em",
                boxShadow: "0 2px 0 #B88523",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}
              >
                {user.name}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                Nivel {user.level}
              </div>
            </div>
          </div>
          {/* XP bar */}
          <div
            style={{
              height: 5,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: `${Math.round(xpProgress * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #D8A83F 0%, #F2C65A 100%)",
                transition: "width 0.6s",
              }}
            />
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.04em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{user.xp.toLocaleString("es-MX")} XP</span>
            <span>{xpForNextLevel.toLocaleString("es-MX")}</span>
          </div>
        </div>

        {/* Admin switch */}
        {isAdmin && (
          <Link
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--gold)",
              color: "var(--navy)",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
              gap: 8,
              boxShadow: "0 3px 0 #B88523",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--navy)" }}>{Icon.Shield}</span> Panel admin
            </span>
            <span>→</span>
          </Link>
        )}
      </div>

      {/* Local style overrides for the dark variant + active state */}
      <style>{`
        .alumno-sidebar .nav-item-dark {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          position: relative;
        }
        .alumno-sidebar .nav-item-dark:not(.active):hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }
        .alumno-sidebar .nav-item-dark.active {
          background: linear-gradient(90deg, rgba(216,168,63,0.18) 0%, rgba(216,168,63,0.04) 100%);
          color: white;
          font-weight: 700;
          box-shadow: inset 3px 0 0 0 var(--gold);
        }
        .alumno-sidebar .nav-item-dark .nav-icon {
          width: 22px;
          color: inherit;
          opacity: 0.85;
        }
        .alumno-sidebar .nav-item-dark.active .nav-icon {
          color: var(--gold);
          opacity: 1;
        }
      `}</style>
    </aside>
  );
}

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link href={link.href} className={`nav-item-dark${active ? " active" : ""}`}>
      <span className="nav-icon" style={{ display: "inline-flex" }}>{link.icon}</span>
      <span style={{ flex: 1 }}>{link.label}</span>
      {link.notify && (
        <span
          aria-label="Hay actividad"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#E89B3D",
            boxShadow: "0 0 0 3px rgba(232,155,61,0.18)",
          }}
        />
      )}
      {link.key === "mensajes" && <UnreadBadge />}
    </Link>
  );
}

function UnreadBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/dm/unread")
        .then((r) => (r.ok ? r.json() : { unread: 0 }))
        .then((j) => {
          if (!cancelled) setN(j.unread ?? 0);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  if (n <= 0) return null;
  return (
    <span
      style={{
        background: "var(--gold)",
        color: "var(--navy)",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: 10,
        fontWeight: 800,
        fontFamily: "var(--font-mono)",
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}
