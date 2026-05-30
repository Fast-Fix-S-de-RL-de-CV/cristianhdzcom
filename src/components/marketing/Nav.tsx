"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// Public-facing nav. Same 5 items para todos los usuarios — la entrada al
// área privada se hace por el botón "Mi escritorio →" / avatar a la
// derecha, no como item del menú (de lo contrario quedaba duplicada).
const NAV_ITEMS: [string, string][] = [
  ["Inicio", "/"],
  ["Acerca de", "/acerca"],
  ["Empresas", "/empresas"],
  ["Programas", "/programas"],
  ["Libros", "/libros"],
  ["Membresía", "/membresia"],
  ["Comunidad", "/comunidad"],
  ["Blog", "/blog"],
];

type SessionUser = { id: string; name: string; role: string; level: number } | null;

export function Nav() {
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<SessionUser>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar el menú móvil al cambiar de ruta y bloquear el scroll del body
  // mientras está abierto (el menú es fullscreen).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!cancelled && res.ok) {
          const j = (await res.json()) as { user?: SessionUser };
          setUser(j.user ?? null);
        }
      } catch {
        /* anonymous */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const dashboardHref = user?.role === "admin" || user?.role === "superadmin" ? "/admin" : "/plataforma";
  const initials = user
    ? user.name
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <nav className="ch-nav">
      <Link href="/" className="ch-logo" aria-label="Cristian Hernández — Inicio">
        <img src="/logo.png" alt="Cristian Hernández" />
      </Link>
      <div className="ch-nav-links">
        {NAV_ITEMS.map(([label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(active && "is-active")}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className="ch-nav-cta">
        {/* Hide CTAs while we don't know auth state, to avoid layout flash */}
        {!loaded ? (
          <div style={{ width: 200, height: 40 }} />
        ) : user ? (
          <>
            <Link href={dashboardHref}>
              <Button variant="primary">Mi escritorio →</Button>
            </Link>
            <Link href="/cuenta" aria-label="Mi cuenta">
              <div
                className="av"
                style={{ cursor: "pointer", width: 40, height: 40 }}
                title={user.name}
              >
                {initials}
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/registro">
              <Button variant="primary">Empezar gratis →</Button>
            </Link>
          </>
        )}
      </div>

      {/* Hamburguesa: solo visible ≤720px (CSS). Abre el menú fullscreen. */}
      <button
        type="button"
        className="ch-nav-burger"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menú móvil fullscreen */}
      {menuOpen && (
        <div className="ch-mobile-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="ch-mobile-menu-head">
            <Link href="/" aria-label="Inicio">
              <img src="/logo.png" alt="Cristian Hernández" />
            </Link>
            <button
              type="button"
              className="ch-mobile-close"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="ch-mobile-list">
            {NAV_ITEMS.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={cn(active && "is-active")}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ch-mobile-actions">
            {user ? (
              <>
                <Link href={dashboardHref}>
                  <Button variant="primary">Mi escritorio →</Button>
                </Link>
                <Link href="/cuenta">
                  <Button variant="ghost">Mi cuenta</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/registro">
                  <Button variant="primary">Empezar gratis →</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Iniciar sesión</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
