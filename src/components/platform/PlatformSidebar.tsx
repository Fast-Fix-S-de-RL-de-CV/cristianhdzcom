"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTenant } from "@/components/tenant/TenantProvider";

type NavLink = {
  href: string;
  label: string;
  icon: string;
};

const APRENDER: NavLink[] = [
  { href: "/plataforma", label: "Mi sendero", icon: "◎" },
  { href: "/plataforma/talleres", label: "Talleres en vivo", icon: "✦" },
  { href: "/plataforma/biblioteca", label: "Biblioteca", icon: "≡" },
  { href: "/plataforma/proyectos", label: "Proyectos", icon: "◇" },
];

const COMUNIDAD: NavLink[] = [
  { href: "/comunidad", label: "Feed", icon: "○" },
  { href: "/comunidad/calendario", label: "Eventos", icon: "○" },
  { href: "/comunidad/ranking", label: "Ranking", icon: "○" },
];

export function PlatformSidebar({ activeHref }: { activeHref?: string }) {
  const { tp, basePath, siteName, logoUrl } = useTenant();
  const rawPathname = usePathname() || "";
  // Quitar el prefijo del tenant (mimarca.app/{slug}) para comparar rutas internas.
  const pathname =
    basePath && (rawPathname === basePath || rawPathname.startsWith(basePath + "/"))
      ? rawPathname.slice(basePath.length) || "/"
      : rawPathname;
  const isActive = (href: string) => {
    if (activeHref) return activeHref === href;
    if (href === "/plataforma") return pathname === "/plataforma";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="plat-side">
      <Link href={tp("/")} className="ch-logo" aria-label={`${siteName} — Inicio`}>
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} style={{ maxWidth: 180 }} />
        ) : (
          <span>{siteName}</span>
        )}
      </Link>
      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
          Aprender
        </div>
        {APRENDER.map((l) => (
          <Link key={l.href} href={tp(l.href)} className={cn("nav-item", isActive(l.href) && "active")}>
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>
      <div className="col" style={{ gap: 4 }}>
        <div className="eyebrow" style={{ padding: "0 12px 8px" }}>
          Comunidad
        </div>
        {COMUNIDAD.map((l) => (
          <Link key={l.href} href={tp(l.href)} className={cn("nav-item", isActive(l.href) && "active")}>
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>
      <div className="col" style={{ gap: 4, marginTop: "auto" }}>
        <Link href={tp("/cuenta")} className={cn("nav-item", isActive("/cuenta") && "active")}>
          <span>⌂</span> Mi cuenta
        </Link>
        <div className="card" style={{ padding: 14, background: "var(--bg-2)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            SIGUIENTE GENERACIÓN
          </div>
          <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>
            04 Mar
          </div>
          <Link href={tp("/programas")}>
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
