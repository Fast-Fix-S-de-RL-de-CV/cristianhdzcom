"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const TABS: [string, string][] = [
  ["Comunidad", "/comunidad"],
  ["Aulas", "/plataforma"],
  ["Calendario", "/comunidad/calendario"],
  ["Miembros", "/comunidad/miembros"],
  ["Ranking", "/comunidad/ranking"],
  ["Sobre CH", "/comunidad/sobre"],
];

export function CommunityShell({
  user,
  children,
  admin,
}: {
  user: { name: string; role: string; level: number } | null;
  children: React.ReactNode;
  admin?: boolean;
}) {
  const pathname = usePathname() || "/comunidad";
  return (
    <div style={{ background: "var(--bg-2)", minHeight: "100vh" }}>
      <div style={{ background: "white", borderBottom: "1px solid var(--line)" }}>
        <div
          className="community-header-grid"
          style={{
            padding: "24px 56px 0",
            display: "grid",
            gridTemplateColumns: "64px 1fr auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif)",
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            C
          </div>
          <div>
            <div className="row" style={{ gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
              <h1 className="serif community-title" style={{ fontSize: 32 }}>
                CH · Negocios con IA
              </h1>
              <Chip variant="accent">PRIVADA</Chip>
              <Chip>★ 4.9</Chip>
              {admin && <Chip variant="ink">ADMIN</Chip>}
            </div>
            <div className="row" style={{ gap: 16, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
              <span>
                <strong style={{ color: "var(--ink)" }}>2.847</strong> miembros
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: "var(--green)" }}>184</strong> en línea
              </span>
              <span>·</span>
              <span>
                Fundada por <strong style={{ color: "var(--ink)" }}>Cristian Hernández</strong>
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {user ? (
              <>
                <Button variant="ghost">Invitar</Button>
                <span className="chip mono">
                  Lv.{user.level} · {user.name.split(" ")[0]}
                </span>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Iniciar sesión</Button>
                </Link>
                <Link href="/registro">
                  <Button>Entrar gratis →</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: "20px 56px 0", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map(([l, href]) => {
            const active = pathname === href || (href !== "/comunidad" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--ink)" : "var(--muted)",
                  borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {l}
              </Link>
            );
          })}
          {(user?.role === "admin" || user?.role === "superadmin") && (
            <Link
              href="/admin"
              style={{
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: pathname.startsWith("/admin") ? 600 : 500,
                color: pathname.startsWith("/admin") ? "var(--ink)" : "var(--muted)",
                borderBottom: pathname.startsWith("/admin") ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              Admin
            </Link>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
