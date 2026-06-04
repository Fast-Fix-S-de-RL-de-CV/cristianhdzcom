"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function AdminLogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          } catch {}
          router.push("/");
          router.refresh();
        });
      }}
      style={{
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 999,
        background: "transparent",
        color: "rgba(255,255,255,0.85)",
        cursor: pending ? "wait" : "pointer",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}

/**
 * AdminShell — Top bar for ALL /admin pages.
 *
 * Previously this rendered tabs that linked into alumno-area routes
 * (/comunidad, /plataforma, /comunidad/calendario, ...). That mixed the
 * staff workspace with student content and made it unclear when an
 * admin was "looking at student stuff" vs. "doing admin work". This bar
 * now reads clearly as the admin workspace and offers a single,
 * unmistakable "Ver como alumno" escape hatch.
 */
export function AdminShell({
  user,
  children,
}: {
  user: { email: string; name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--bg-2)", minHeight: "100vh" }}>
      <div style={{ background: "var(--navy)", color: "white", borderBottom: "1px solid var(--line)" }}>
        <div
          className="admin-header-grid"
          style={{
            padding: "14px 40px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 18,
            alignItems: "center",
          }}
        >
          {/* Logo dorado (mismo asset que el sidebar alumno) */}
          <Link
            href="/admin"
            className="ch-logo"
            aria-label="CH · Panel de administración"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            <img
              src="/logo.png"
              alt="Cristian Hernández"
              style={{
                height: 44,
                width: "auto",
                display: "block",
                /* Sombra negra suave + halo dorado para que la firma dorada
                 * se lea bien sobre el navy oscuro del panel admin (mismo
                 * filtro que aplicamos al logo del nav público). */
                filter:
                  "drop-shadow(0 1px 3px rgba(0,0,0,0.30)) drop-shadow(0 0 8px rgba(216,168,63,0.20))",
              }}
            />
          </Link>
          <div>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <h2 className="serif" style={{ fontSize: 20, color: "white", margin: 0 }}>
                Panel de administración
              </h2>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--gold)",
                  color: "var(--navy)",
                }}
              >
                MODO ADMIN
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4 }}
            >
              {user.email} · {user.role.toUpperCase()}
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Link
              href="/plataforma"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                color: "white",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              title="Salir del panel y ver el sitio como un alumno"
            >
              <span aria-hidden>👁</span> Ver como alumno
            </Link>
            <AdminLogoutButton />
            <Link
              href="/cuenta"
              aria-label="Mi cuenta"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Mi cuenta
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
