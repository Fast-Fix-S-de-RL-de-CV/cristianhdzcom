"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const ITEMS: [string, string][] = [
  ["Inicio", "/"],
  ["Programas", "/programas"],
  ["Plataforma", "/plataforma"],
  ["Libros", "/libros"],
  ["Comunidad", "/comunidad"],
  ["Blog", "/blog"],
];

type SessionUser = { id: string; name: string; role: string; level: number } | null;

export function Nav() {
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<SessionUser>(null);
  const [loaded, setLoaded] = useState(false);

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
        {ITEMS.map(([label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(active ? "text-ink font-semibold" : "text-ink-2")}
              style={{ color: active ? "var(--ink)" : "var(--ink-2)", fontWeight: active ? 600 : 500 }}
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
    </nav>
  );
}
