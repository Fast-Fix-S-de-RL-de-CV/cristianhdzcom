"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { formatRelative } from "@/lib/utils";

/**
 * Dashboard superadmin de la SaaS (realm plataforma — fetch SIN tp():
 * /api/platform/** pasa directo por el middleware en mimarca.app).
 */

export type TenantAdminRow = {
  id: string;
  slug: string;
  name: string;
  customDomain: string | null;
  domainVerified: boolean;
  plan: string;
  planStatus: string;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  orderCount: number;
};

const PLAN_OPTIONS = ["basico", "pro"] as const;
const PLAN_STATUS_OPTIONS = ["trial", "active", "past_due", "suspended"] as const;

const PLAN_STATUS_COLOR: Record<string, string> = {
  trial: "var(--warm)",
  active: "var(--green-strong)",
  past_due: "var(--red)",
  suspended: "var(--red)",
};

function Segmented({
  value,
  options,
  onChange,
  disabled,
  activeColor,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  activeColor?: (v: string) => string;
}) {
  return (
    <span className="row" style={{ gap: 4, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = value === o;
        const color = active ? (activeColor ? activeColor(o) : "var(--ink)") : "var(--muted)";
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => !active && onChange(o)}
            className="mono"
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: active || disabled ? "default" : "pointer",
              border: `1px solid ${active ? color : "var(--line-2)"}`,
              background: active ? "color-mix(in srgb, " + color + " 10%, white)" : "white",
              color,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {o}
          </button>
        );
      })}
    </span>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/superadmin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      setLoading(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401 || j?.error === "invalid_credentials") {
          setError("Correo o contraseña incorrectos.");
        } else {
          setError("No pudimos iniciarte sesión. Inténtalo de nuevo.");
        }
        return;
      }
      router.refresh();
    } catch {
      setLoading(false);
      setError("No hay conexión. Revisa tu internet.");
    }
  }

  return (
    <section
      className="sec"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="card" style={{ padding: 40, width: 440, maxWidth: "100%" }}>
        <Eyebrow>mimarca.app · plataforma</Eyebrow>
        <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 24 }}>Superadmin.</h1>
        <form onSubmit={onSubmit} className="col" style={{ gap: 22 }} noValidate>
          <Field
            label="Correo"
            format="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="tu@correo.com"
            autoComplete="email"
            showValid={false}
          />
          <Field
            label="Contraseña"
            format="password"
            required
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && (
            <div className="tf-error-msg" role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
              {error}
            </div>
          )}
          <Button type="submit" size="lg" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Entrando…" : "Entrar →"}
          </Button>
        </form>
      </div>
    </section>
  );
}

export function SuperadminClient({
  authed,
  tenants,
}: {
  authed: boolean;
  tenants: TenantAdminRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<TenantAdminRow[]>(tenants);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.planStatus === "active").length,
      trial: rows.filter((r) => r.planStatus === "trial").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
    }),
    [rows],
  );

  if (!authed) return <LoginForm />;

  async function patchTenant(id: string, patch: Partial<Pick<TenantAdminRow, "plan" | "planStatus" | "status">>) {
    const prev = rows;
    setPendingId(id);
    setError(null);
    // Optimista: aplica el cambio y revierte si el PATCH falla.
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const res = await fetch(`/api/platform/tenants/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setRows(prev);
        setError("No se pudo guardar el cambio. Inténtalo de nuevo.");
      }
    } catch {
      setRows(prev);
      setError("No hay conexión. Revisa tu internet.");
    } finally {
      setPendingId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="between" style={{ padding: "18px 40px", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 12 }}>
          <span className="serif" style={{ fontSize: 19, fontWeight: 700 }}>
            mimarca<span className="gold-text">.app</span>
          </span>
          <span className="chip chip-ink">SUPERADMIN</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mono row"
          style={{
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            background: "none",
            border: "1px solid var(--line-2)",
            borderRadius: 999,
            padding: "6px 12px",
          }}
        >
          <LogOut size={13} /> SALIR
        </button>
      </header>

      <section className="sec-tight" style={{ paddingTop: 40 }}>
        <Eyebrow>Plataforma</Eyebrow>
        <h1 style={{ fontSize: 40, marginTop: 12 }}>Tenants.</h1>

        <div className="grid-4" style={{ margin: "28px 0", gap: 14 }}>
          {[
            [stats.total, "tenants totales"],
            [stats.active, "planes activos"],
            [stats.trial, "en trial"],
            [stats.suspended, "suspendidos"],
          ].map(([v, l]) => (
            <Card key={l as string} style={{ padding: 18 }}>
              <div className="serif" style={{ fontSize: 30 }}>{v}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                {l}
              </div>
            </Card>
          ))}
        </div>

        {error && (
          <div className="tf-error-msg" role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1080 }}>
              {/* Encabezado */}
              <div
                className="row"
                style={{
                  padding: "14px 24px",
                  background: "var(--bg-2)",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  gap: 12,
                }}
              >
                <span style={{ flex: 1, minWidth: 190 }}>Tenant</span>
                <span style={{ width: 150 }}>Dominio</span>
                <span style={{ width: 130 }}>Plan</span>
                <span style={{ width: 280 }}>Estado del plan</span>
                <span style={{ width: 56, textAlign: "right" }}>Users</span>
                <span style={{ width: 60, textAlign: "right" }}>Orders</span>
                <span style={{ width: 90, textAlign: "right" }}>Creado</span>
                <span style={{ width: 104, textAlign: "right" }}>Sitio</span>
              </div>

              {rows.map((t) => {
                const pending = pendingId === t.id;
                const suspended = t.status === "suspended";
                return (
                  <div
                    key={t.id}
                    className="row"
                    style={{
                      padding: "14px 24px",
                      borderBottom: "1px solid var(--line)",
                      gap: 12,
                      opacity: pending ? 0.6 : 1,
                      background: suspended ? "color-mix(in srgb, var(--red) 4%, white)" : undefined,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{t.name}</div>
                      <a
                        href={`/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "inline-block" }}
                      >
                        mimarca.app/{t.slug}
                      </a>
                    </div>
                    <span style={{ width: 150 }}>
                      {t.customDomain ? (
                        <span className="mono row" style={{ fontSize: 11, gap: 4, color: "var(--ink-2)" }}>
                          {t.customDomain}
                          {t.domainVerified && <BadgeCheck size={13} style={{ color: "var(--green-strong)" }} />}
                        </span>
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>—</span>
                      )}
                    </span>
                    <span style={{ width: 130 }}>
                      <Segmented
                        value={t.plan}
                        options={PLAN_OPTIONS}
                        disabled={pending}
                        onChange={(plan) => patchTenant(t.id, { plan })}
                      />
                    </span>
                    <span style={{ width: 280 }}>
                      <Segmented
                        value={t.planStatus}
                        options={PLAN_STATUS_OPTIONS}
                        disabled={pending}
                        activeColor={(v) => PLAN_STATUS_COLOR[v] ?? "var(--ink)"}
                        onChange={(planStatus) => patchTenant(t.id, { planStatus })}
                      />
                    </span>
                    <span className="mono" style={{ width: 56, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                      {t.userCount.toLocaleString("es-MX")}
                    </span>
                    <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                      {t.orderCount.toLocaleString("es-MX")}
                    </span>
                    <span className="mono" style={{ width: 90, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                      {formatRelative(new Date(t.createdAt))}
                    </span>
                    <span style={{ width: 104, textAlign: "right" }}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => patchTenant(t.id, { status: suspended ? "active" : "suspended" })}
                        className="mono"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          padding: "5px 10px",
                          borderRadius: 6,
                          cursor: pending ? "default" : "pointer",
                          border: `1px solid ${suspended ? "var(--green-strong)" : "var(--red)"}`,
                          background: "white",
                          color: suspended ? "var(--green-strong)" : "var(--red)",
                        }}
                      >
                        {suspended ? "REACTIVAR" : "SUSPENDER"}
                      </button>
                    </span>
                  </div>
                );
              })}

              {rows.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                  Aún no hay tenants. El primero se crea en{" "}
                  <a href="/crear" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    /crear
                  </a>
                  .
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
