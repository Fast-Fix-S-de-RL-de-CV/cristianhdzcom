"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { AlumnoActiveKey } from "./AlumnoShell";

type NavLink = { href: string; label: string; icon: string; key: AlumnoActiveKey };

const APRENDER: NavLink[] = [
  { key: "sendero", href: "/plataforma", label: "Mi sendero", icon: "◎" },
  { key: "talleres", href: "/plataforma/talleres", label: "Talleres en vivo", icon: "✦" },
  { key: "biblioteca", href: "/plataforma/biblioteca", label: "Biblioteca", icon: "≡" },
  { key: "proyectos", href: "/plataforma/proyectos", label: "Mis proyectos", icon: "◇" },
  { key: "libros", href: "/libros", label: "Libros", icon: "▤" },
];

const COMUNIDAD: NavLink[] = [
  { key: "comunidad", href: "/comunidad", label: "Feed", icon: "○" },
  { key: "calendario", href: "/comunidad/calendario", label: "Calendario", icon: "○" },
  { key: "miembros", href: "/comunidad/miembros", label: "Miembros", icon: "○" },
  { key: "mensajes", href: "/mensajes", label: "Mensajes", icon: "○" },
  { key: "ranking", href: "/comunidad/ranking", label: "Ranking", icon: "○" },
  { key: "sobre", href: "/comunidad/sobre", label: "Sobre CH", icon: "○" },
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
  // Fallback when the page didn't pass an `active` matching a link.
  const isActiveByPath = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const isAdmin = user.role === "admin" || user.role === "superadmin";

  return (
    <aside className="plat-side">
      <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio">
        <img src="/logo.png" alt="Cristian Hernández" style={{ maxWidth: 180 }} />
      </Link>

      {/* MODO ALUMNO chip — makes the context unmistakable */}
      <div
        style={{
          margin: "-8px 4px 0",
          padding: "6px 10px",
          borderRadius: 999,
          background: "var(--navy-soft)",
          color: "var(--navy)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          fontWeight: 700,
          alignSelf: "flex-start",
        }}
      >
        MODO ALUMNO
      </div>

      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>Aprender</div>
        {APRENDER.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn("nav-item", (isActiveKey(l.key) || isActiveByPath(l.href)) && "active")}
          >
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>

      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>Comunidad</div>
        {COMUNIDAD.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn("nav-item", (isActiveKey(l.key) || isActiveByPath(l.href)) && "active")}
            style={{ position: "relative" }}
          >
            <span>{l.icon}</span> {l.label}
            {l.key === "mensajes" && <UnreadBadge />}
          </Link>
        ))}
      </div>

      <div className="col" style={{ gap: 6, marginTop: "auto" }}>
        {/* Identity card */}
        <Link
          href="/cuenta"
          className={cn("nav-item", (isActiveKey("cuenta") || pathname === "/cuenta") && "active")}
          style={{ marginBottom: 4 }}
        >
          <span>⌂</span> Mi cuenta
        </Link>
        <div
          className="card"
          style={{
            padding: 12,
            background: "var(--bg-2)",
            display: "grid",
            gridTemplateColumns: "36px 1fr",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div className="av" style={{ width: 36, height: 36, fontSize: 12 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              Lv.{user.level} · {user.xp.toLocaleString("es-MX")} XP
            </div>
          </div>
        </div>

        {/* Admin context switch — only visible to staff */}
        {isAdmin && (
          <Link
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--ink)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              gap: 8,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden>🛡</span> Panel admin
            </span>
            <span style={{ color: "var(--gold)" }}>→</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

/**
 * Tiny client component that polls /api/dm/unread every 30s.
 * Renders nothing if there are no unread messages.
 */
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
        marginLeft: "auto",
        background: "var(--accent)",
        color: "white",
        borderRadius: 999,
        padding: "2px 7px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}
