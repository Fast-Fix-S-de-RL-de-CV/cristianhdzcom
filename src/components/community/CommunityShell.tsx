"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type CommunityStats = {
  members: number;
  online: number;
  countries: number;
  founder: { id: string; name: string } | null;
};

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
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = "https://cristianhdz.com/registro";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
      const el = document.getElementById("invite-link-input") as HTMLInputElement | null;
      el?.select();
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CommunityStats | null) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const membersLabel =
    stats?.members != null ? stats.members.toLocaleString("es-MX") : "—";
  const onlineLabel = stats?.online != null ? String(stats.online) : "—";
  const founderName = stats?.founder?.name ?? "—";

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
                <strong style={{ color: "var(--ink)" }}>{membersLabel}</strong> miembros
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: "var(--green)" }}>{onlineLabel}</strong> en línea
              </span>
              <span>·</span>
              <span>
                Fundada por <strong style={{ color: "var(--ink)" }}>{founderName}</strong>
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {user ? (
              <>
                <Button variant="ghost" onClick={() => setInviteOpen(true)}>Invitar</Button>
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

      {/* Invite modal */}
      {inviteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setInviteOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 30, 58, 0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              border: "1px solid var(--line)",
              borderRadius: 18,
              padding: 28,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 18px 40px rgba(10,30,58,0.2)",
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 8 }}>Invita a la comunidad</div>
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 8, color: "var(--navy)" }}>
              Comparte este link.
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
              Cualquiera con el link puede registrarse y unirse a la comunidad gratis.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <input
                id="invite-link-input"
                className="input"
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 13 }}
              />
              <Button type="button" variant="primary" onClick={copyInvite}>
                {copied ? "✓ Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <a
                className="btn btn-ghost"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(`Te recomiendo esta comunidad de programación con IA: ${inviteUrl}`)}`}
              >
                WhatsApp
              </a>
              <a
                className="btn btn-ghost"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Comunidad de programación con IA: ${inviteUrl}`)}`}
              >
                Twitter / X
              </a>
              <a
                className="btn btn-ghost"
                target="_blank"
                rel="noopener noreferrer"
                href={`mailto:?subject=${encodeURIComponent("Comunidad CH · Negocios con IA")}&body=${encodeURIComponent(`Te recomiendo esta comunidad: ${inviteUrl}`)}`}
              >
                Email
              </a>
              <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(false)} style={{ marginLeft: "auto" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
