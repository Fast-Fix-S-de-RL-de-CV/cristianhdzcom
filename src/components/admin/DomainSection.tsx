"use client";
import { useEffect, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Globe,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Sección "Dominio propio" del admin del tenant (plan Pro).
 *
 * - Carga inicial / verificar: GET  /api/admin/domain
 * - Conectar dominio:          POST /api/admin/domain {domain}
 * - Quitar dominio:            DELETE /api/admin/domain
 *
 * El flujo del cliente: escribe su dominio → le mostramos los nameservers de
 * Cloudflare → los cambia en su registrador → "Verificar ahora" hasta que la
 * zona esté activa (badge VERIFICADO).
 */

type DomainState = {
  domain: string | null;
  verified: boolean;
  nameservers: string[];
};

export function DomainSection() {
  const { tp, slug } = useTenant();
  const toast = useToast();
  const confirm = useConfirm();

  const [state, setState] = useState<DomainState>({ domain: null, verified: false, nameservers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [input, setInput] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [copiedNs, setCopiedNs] = useState<string | null>(null);

  useEffect(() => {
    fetch(tp("/api/admin/domain"))
      .then((r) => r.json())
      .then((j) => {
        if (j && typeof j === "object" && "domain" in j) {
          setState({ domain: j.domain ?? null, verified: !!j.verified, nameservers: j.nameservers ?? [] });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addDomain() {
    const domain = input.trim();
    if (!domain) return;
    setSaving(true);
    setUpgradeRequired(false);
    try {
      const res = await fetch(tp("/api/admin/domain"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.error === "plan_upgrade_required") {
          setUpgradeRequired(true);
          return;
        }
        toast.error(apiErrorMessage(j, "No se pudo conectar el dominio"));
        return;
      }
      setState({ domain: j.domain, verified: false, nameservers: j.nameservers ?? [] });
      setInput("");
      toast.success("Dominio conectado — ahora configura los nameservers en tu registrador");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setSaving(false);
    }
  }

  async function verifyNow() {
    setVerifying(true);
    try {
      const res = await fetch(tp("/api/admin/domain"));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo verificar"));
        return;
      }
      setState({ domain: j.domain ?? null, verified: !!j.verified, nameservers: j.nameservers ?? [] });
      if (j.verified) {
        toast.success("Dominio verificado — tu plataforma ya responde en tu dominio");
      } else {
        toast.info("Aún pendiente: los nameservers pueden tardar hasta 24–48 h en propagar");
      }
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setVerifying(false);
    }
  }

  async function removeDomain() {
    const ok = await confirm({
      title: "¿Quitar el dominio personalizado?",
      description: `Tu plataforma seguirá disponible en mimarca.app/${slug}. Podrás volver a conectar el dominio cuando quieras.`,
      confirmLabel: "Quitar dominio",
      tone: "danger",
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const res = await fetch(tp("/api/admin/domain"), { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo quitar el dominio"));
        return;
      }
      setState({ domain: null, verified: false, nameservers: [] });
      toast.success("Dominio desvinculado");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setRemoving(false);
    }
  }

  async function copyNs(ns: string) {
    try {
      await navigator.clipboard.writeText(ns);
      setCopiedNs(ns);
      setTimeout(() => setCopiedNs((p) => (p === ns ? null : p)), 2000);
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div style={{ background: "white", border: "1.5px solid var(--line)", borderRadius: 14, padding: 18 }}>
      {/* Header */}
      <div className="row" style={{ gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "color-mix(in srgb, var(--gold) 16%, white)",
            color: "var(--gold-deep)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Globe size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>
              Dominio propio
            </div>
            {state.domain && <StatusBadge verified={state.verified} />}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Conecta tu dominio (tumarca.com) para que tu plataforma viva ahí en lugar de
            mimarca.app/{slug}. Disponible en el plan Pro.
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "14px 0", color: "var(--muted)", fontSize: 13 }}>Cargando dominio…</div>
      ) : state.domain ? (
        <div className="col" style={{ gap: 14 }}>
          {/* Dominio actual */}
          <div
            className="row"
            style={{
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "12px 14px",
              background: "var(--bg-2)",
            }}
          >
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
              {state.domain}
            </span>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={verifyNow}
                disabled={verifying}
                className="btn btn-ghost"
                style={{ padding: "7px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={13} style={verifying ? { animation: "spin 1s linear infinite" } : undefined} />
                {verifying ? "Verificando…" : "Verificar ahora"}
              </button>
              <button
                type="button"
                onClick={removeDomain}
                disabled={removing}
                aria-label="Quitar dominio"
                style={{
                  background: "transparent",
                  border: "1px solid color-mix(in srgb, var(--red) 35%, white)",
                  color: "var(--red)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Trash2 size={13} />
                Quitar
              </button>
            </div>
          </div>

          {/* Nameservers pendientes */}
          {!state.verified && (
            <div className="col" style={{ gap: 8 }}>
              <Label>Nameservers a configurar en tu registrador</Label>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                Entra a tu registrador (GoDaddy, Namecheap, Squarespace…) y reemplaza los
                nameservers de <strong>{state.domain}</strong> por estos. La propagación puede
                tardar hasta 24–48 horas; usa &quot;Verificar ahora&quot; para revisar.
              </div>
              {state.nameservers.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Sin nameservers registrados — quita el dominio y vuelve a conectarlo.
                </div>
              ) : (
                state.nameservers.map((ns) => (
                  <div
                    key={ns}
                    className="row"
                    style={{
                      gap: 10,
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px dashed var(--gold-deep)",
                      borderRadius: 8,
                      padding: "9px 12px",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>
                      {ns}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyNs(ns)}
                      aria-label={`Copiar ${ns}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: copiedNs === ns ? "#1B7849" : "var(--gold-deep)",
                        cursor: "pointer",
                        padding: "4px 6px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {copiedNs === ns ? <Check size={14} /> : <Copy size={14} />}
                      {copiedNs === ns ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {state.verified && (
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Tu dominio está activo: la plataforma responde en{" "}
              <strong>https://{state.domain}</strong> con SSL incluido.
            </div>
          )}
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {upgradeRequired && (
            <div
              className="row"
              style={{
                gap: 10,
                alignItems: "flex-start",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, #E89B3D 45%, white)",
                background: "color-mix(in srgb, #E89B3D 10%, white)",
                color: "#a86a1f",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Los dominios propios están disponibles en el <strong>plan Pro</strong>. Actualiza tu
                plan para conectar tu dominio.
              </span>
            </div>
          )}
          <div className="row" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Label>Tu dominio</Label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addDomain();
                }}
                placeholder="tumarca.com"
                autoComplete="off"
                spellCheck={false}
                style={inputStyle()}
              />
            </div>
            <button
              type="button"
              onClick={addDomain}
              disabled={saving || !input.trim()}
              className="btn btn-primary"
              style={{ padding: "9px 16px", fontSize: 13 }}
            >
              {saving ? "Conectando…" : "Conectar dominio"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            El dominio debe estar comprado en tu registrador. Al conectarlo te daremos 2
            nameservers para configurarlo — nosotros nos encargamos del SSL y del enrutamiento.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ verified }: { verified: boolean }) {
  const palette = verified
    ? { bg: "#1B7849", label: "VERIFICADO", icon: <ShieldCheck size={11} /> }
    : { bg: "#a86a1f", label: "PENDIENTE", icon: <Clock3 size={11} /> };
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        fontWeight: 800,
        padding: "3px 8px",
        background: palette.bg,
        color: "white",
        borderRadius: 4,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {palette.icon}
      {palette.label}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        color: "var(--muted)",
        letterSpacing: "0.08em",
        fontWeight: 700,
        marginBottom: 4,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "white",
  };
}
