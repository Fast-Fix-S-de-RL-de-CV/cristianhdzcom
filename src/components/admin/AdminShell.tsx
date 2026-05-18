"use client";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

export function AdminShell({
  user,
  children,
}: {
  user: { email: string; name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--bg-2)", minHeight: "100vh" }}>
      <div style={{ background: "white", borderBottom: "1px solid var(--line)" }}>
        <div
          className="admin-header-grid"
          style={{
            padding: "18px 40px",
            display: "grid",
            gridTemplateColumns: "52px 1fr auto",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div>
            <div className="row" style={{ gap: 10 }}>
              <h2 className="serif" style={{ fontSize: 22 }}>
                CH · Negocios con IA
              </h2>
              <Chip variant="ink">ADMIN</Chip>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              SUPER ADMIN · {user.email} · {user.role.toUpperCase()}
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Button variant="ghost" size="sm">
              ⌕ Buscar
            </Button>
            <Button variant="ghost" size="sm">
              🔔 3
            </Button>
            <Button size="sm">+ Crear</Button>
          </div>
        </div>
        <div style={{ padding: "0 40px", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            ["Comunidad", "/comunidad"],
            ["Aulas", "/plataforma"],
            ["Calendario", "/comunidad/calendario"],
            ["Miembros", "/comunidad/miembros"],
            ["Ranking", "/comunidad/ranking"],
            ["Admin", "/admin"],
          ].map(([t, href], i) => {
            const isAdmin = href === "/admin";
            return (
              <Link
                key={String(href)}
                href={String(href)}
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: isAdmin ? 600 : 500,
                  color: isAdmin ? "var(--ink)" : "var(--muted)",
                  borderBottom: isAdmin ? "2px solid var(--ink)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {String(t)}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
