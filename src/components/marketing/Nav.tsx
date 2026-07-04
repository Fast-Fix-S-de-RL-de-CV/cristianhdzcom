"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTenant } from "@/components/tenant/TenantProvider";
import { isExternalHref, resolveNavItems } from "@/lib/nav-items";

type SessionUser = { id: string; name: string; role: string; level: number } | null;

export function Nav() {
  const { tp, basePath, siteName, logoUrl, navItems } = useTenant();
  const rawPathname = usePathname() || "/";
  // En mimarca.app/{slug} el pathname del navegador trae el prefijo del
  // tenant; lo quitamos para comparar contra los hrefs internos.
  const pathname =
    basePath && (rawPathname === basePath || rawPathname.startsWith(basePath + "/"))
      ? rawPathname.slice(basePath.length) || "/"
      : rawPathname;
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
        const res = await fetch(tp("/api/auth/me"), { credentials: "include" });
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
  const items = resolveNavItems(navItems);
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
      <Link href={tp("/")} className="ch-logo" aria-label={`${siteName} — Inicio`}>
        {logoUrl ? <img src={logoUrl} alt={siteName} /> : <span>{siteName}</span>}
      </Link>
      <div className="ch-nav-links">
        {items.map(({ label, href, openInNewTab }) => {
          const pathOnly = href.split("#")[0] || "/";
          const external = isExternalHref(href);
          const active = !external && (pathOnly === "/" ? pathname === "/" : pathname.startsWith(pathOnly));
          return (
            <Link
              key={`${label}-${href}`}
              href={external ? href : tp(href)}
              className={cn(active && "is-active")}
              target={external || openInNewTab ? "_blank" : undefined}
              rel={external || openInNewTab ? "noreferrer" : undefined}
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
            <Link href={tp(dashboardHref)}>
              <Button variant="primary">Mi escritorio →</Button>
            </Link>
            <Link href={tp("/cuenta")} aria-label="Mi cuenta">
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
            <Link href={tp("/login")}>
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href={tp("/registro")}>
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
            <Link href={tp("/")} aria-label="Inicio">
              {logoUrl ? <img src={logoUrl} alt={siteName} /> : <span className="ch-logo">{siteName}</span>}
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
            {items.map(({ label, href, openInNewTab }) => {
              const pathOnly = href.split("#")[0] || "/";
              const external = isExternalHref(href);
              const active = !external && (pathOnly === "/" ? pathname === "/" : pathname.startsWith(pathOnly));
              return (
                <Link
                  key={`${label}-${href}`}
                  href={external ? href : tp(href)}
                  className={cn(active && "is-active")}
                  target={external || openInNewTab ? "_blank" : undefined}
                  rel={external || openInNewTab ? "noreferrer" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ch-mobile-actions">
            {user ? (
              <>
                <Link href={tp(dashboardHref)}>
                  <Button variant="primary">Mi escritorio →</Button>
                </Link>
                <Link href={tp("/cuenta")}>
                  <Button variant="ghost">Mi cuenta</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={tp("/registro")}>
                  <Button variant="primary">Empezar gratis →</Button>
                </Link>
                <Link href={tp("/login")}>
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
