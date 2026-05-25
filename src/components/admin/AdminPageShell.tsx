import { AdminShell } from "./AdminShell";
import { Eyebrow } from "@/components/ui/Eyebrow";

const ITEMS = [
  ["◎", "Dashboard", "/admin"],
  ["🎯", "Prospectos", "/admin/prospectos"],
  ["👥", "Alumnos", "/admin/alumnos"],
  ["💼", "Clientes", "/admin/clientes"],
  ["✨", "Membresías", "/admin/membresias"],
  ["💳", "Suscripciones", "/admin/suscripciones"],
  ["💰", "Pagos", "/admin/pagos"],
  ["📚", "Cursos", "/admin/cursos"],
  ["📖", "Libros", "/admin/libros"],
  ["✍️", "Blog", "/admin/blog"],
  ["🎙️", "Talleres", "/admin/talleres"],
  ["💬", "Comunidad", "/admin/comunidad"],
  ["📞", "Soporte", "/admin/soporte"],
  ["⚙️", "Ajustes", "/admin/ajustes"],
] as const;

export function AdminPageShell({
  user,
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  user: { email: string; name: string; role: string };
  active: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AdminShell user={user}>
      <div
        className="admin-layout"
        style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 130px)" }}
      >
        <aside
          style={{
            padding: "24px 16px",
            background: "var(--bg)",
            borderRight: "1px solid var(--line)",
          }}
        >
          <Eyebrow style={{ padding: "0 12px 12px" }}>Operación</Eyebrow>
          <div className="col" style={{ gap: 2 }}>
            {ITEMS.map(([icon, label, href]) => {
              const isActive = href === active;
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: isActive ? "var(--ink)" : "transparent",
                    color: isActive ? "var(--bg)" : "var(--ink-2)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ width: 18 }}>{icon}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                </a>
              );
            })}
          </div>
        </aside>

        <main style={{ padding: "28px 32px" }}>
          <div className="between" style={{ marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36 }}>{title}</h1>
              {subtitle && (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>{subtitle}</p>
              )}
            </div>
            {actions ? <div className="row" style={{ gap: 8 }}>{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </AdminShell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    succeeded: { bg: "var(--green-soft)", color: "var(--green-strong)" },
    pending: { bg: "var(--warm-soft)", color: "var(--warm)" },
    failed: { bg: "color-mix(in srgb, var(--red) 12%, white)", color: "var(--red)" },
    cancelled: { bg: "var(--bg-3)", color: "var(--muted)" },
    refunded: { bg: "var(--bg-3)", color: "var(--muted)" },
  };
  const s = map[status] || { bg: "var(--bg-2)", color: "var(--muted)" };
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        fontWeight: 600,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (role === "superadmin") {
    return (
      <span
        className="mono"
        style={{
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 4,
          background: "var(--warm-soft)",
          color: "var(--warm)",
          fontWeight: 700,
        }}
      >
        FUNDADOR
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span
        className="mono"
        style={{
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 4,
          background: "var(--accent-soft)",
          color: "var(--accent)",
          fontWeight: 700,
        }}
      >
        ADMIN
      </span>
    );
  }
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        background: "var(--bg-2)",
        color: "var(--muted)",
      }}
    >
      MEMBER
    </span>
  );
}
