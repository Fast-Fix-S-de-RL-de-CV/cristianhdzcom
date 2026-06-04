"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlumnoSidebar } from "./AlumnoSidebar";
import type { AlumnoActiveKey } from "./AlumnoShell";

type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  hearts: number;
  tier?: string;
  tierScore?: number;
};

/**
 * Navegación móvil/tablet del área de alumno.
 *
 * En desktop el rail lateral (.plat-side) está siempre visible. En ≤1024px ese
 * rail se ocultaba SIN reemplazo, dejando la zona de miembros sin navegación
 * (no se podía cambiar de sección en celular). Este componente añade:
 *   - una barra superior fija (navy) con hamburguesa + logo + avatar, y
 *   - un drawer lateral que reutiliza EL MISMO <AlumnoSidebar> (cero
 *     duplicación: mismos links, iconos, identity card, XP, switch admin).
 *
 * Se auto-oculta en desktop vía CSS (.alumno-topbar { display:none }).
 */
export function AlumnoMobileNav({ user, active }: { user: NavUser; active: AlumnoActiveKey }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el drawer al navegar.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body mientras el drawer está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="alumno-topbar">
        <button
          type="button"
          className="alumno-burger"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/" className="ch-logo" aria-label="Inicio">
          <img src="/logo.png" alt="Cristian Hernández" />
        </Link>

        <Link href="/cuenta" className="av" aria-label="Mi cuenta" title={user.name}>
          {initials}
        </Link>
      </header>

      {open && (
        <div
          className="alumno-drawer-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="alumno-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú del alumno"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="alumno-drawer-close"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <AlumnoSidebar user={user} active={active} />
          </div>
        </div>
      )}
    </>
  );
}
