"use client";
import { AdminShell } from "./AdminShell";
import { AdminSidebar } from "./AdminSidebar";

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
        <AdminSidebar active={active} />

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
