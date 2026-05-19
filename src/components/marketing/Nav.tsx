"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function Nav() {
  const pathname = usePathname() || "/";
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
        <Link href="/login">
          <Button variant="ghost">Iniciar sesión</Button>
        </Link>
        <Link href="/registro">
          <Button variant="primary">Empezar gratis →</Button>
        </Link>
      </div>
    </nav>
  );
}
