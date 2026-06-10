"use client";
import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { SelectField } from "@/components/ui/SelectField";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Tarjeta de configuración de métodos de pago para /admin/ajustes.
 *
 * Soporta 4 métodos. Cada uno tiene un toggle de "habilitado" y sus
 * credenciales. Las cuentas bancarias son una lista (puedes tener varias —
 * una por moneda, una para empresas, etc.).
 *
 * - Carga inicial: GET /api/admin/payment-settings
 * - Guardar: PUT /api/admin/payment-settings con el objeto completo
 *
 * Los secretos están enmascarados en el render (••••••) pero al editar
 * se muestran. Toggle 👁 para ver/ocultar.
 */
type BankAccount = {
  bankName: string;
  accountHolder: string;
  accountNumber?: string | null;
  clabe?: string | null;
  swift?: string | null;
  currency?: string | null;
  instructions?: string | null;
};

type Settings = {
  id: number;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  stripeMode: "test" | "live" | null;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
  paypalMode: "sandbox" | "live" | null;
  mpAccessToken: string | null;
  mpPublicKey: string | null;
  bankAccounts: BankAccount[];
  enableStripe: boolean;
  enablePaypal: boolean;
  enableMercadopago: boolean;
  enableTransfer: boolean;
};

const EMPTY: Settings = {
  id: 0,
  stripePublishableKey: "",
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  stripeMode: "test",
  paypalClientId: "",
  paypalClientSecret: "",
  paypalMode: "sandbox",
  mpAccessToken: "",
  mpPublicKey: "",
  bankAccounts: [],
  enableStripe: false,
  enablePaypal: false,
  enableMercadopago: false,
  enableTransfer: false,
};

export function PaymentMethodsCard() {
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});

  function load() {
    setLoading(true);
    setLoadFailed(false);
    fetch("/api/admin/payment-settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) setState({ ...EMPTY, ...j.settings, bankAccounts: j.settings.bankAccounts ?? [] });
        else setLoadFailed(true);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setState((p) => ({ ...p, [key]: value }));
  }

  function addBank() {
    setState((p) => ({
      ...p,
      bankAccounts: [
        ...p.bankAccounts,
        { bankName: "", accountHolder: "", accountNumber: "", clabe: "", currency: "MXN", instructions: "" },
      ],
    }));
  }
  function updateBank(i: number, patch: Partial<BankAccount>) {
    setState((p) => ({
      ...p,
      bankAccounts: p.bankAccounts.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    }));
  }
  async function removeBank(i: number) {
    const ok = await confirm({
      title: "¿Quitar esta cuenta bancaria?",
      description: "Ya no aparecerá como opción de pago al alumno.",
      confirmLabel: "Quitar",
      tone: "danger",
    });
    if (!ok) return;
    setState((p) => ({ ...p, bankAccounts: p.bankAccounts.filter((_, j) => j !== i) }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...state,
          // La API exige banco y titular: descarta cuentas a medio llenar
          bankAccounts: state.bankAccounts.filter((b) => b.bankName.trim() && b.accountHolder.trim()),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiErrorMessage(j, "No se pudo guardar"));
        return;
      }
      if (j.settings) setState({ ...EMPTY, ...j.settings, bankAccounts: j.settings.bankAccounts ?? [] });
      toast.success("Métodos de pago guardados");
    } catch {
      toast.error("Error de red — intenta de nuevo");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        Cargando configuración…
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {loadFailed && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--red) 35%, white)",
            background: "color-mix(in srgb, var(--red) 8%, white)",
            color: "var(--red)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>
            No se pudo cargar la configuración de pagos. El guardado está deshabilitado para no
            sobrescribir tus credenciales con valores vacíos.
          </span>
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: 12, flexShrink: 0 }}
          >
            Reintentar
          </button>
        </div>
      )}
      {/* Stripe */}
      <MethodCard
        title="Stripe"
        desc="Tarjetas (Visa/Mastercard/Amex), Apple Pay, Google Pay. Recomendado para internacional."
        icon="💳"
        enabled={state.enableStripe}
        onToggle={(v) => set("enableStripe", v)}
        color="#635BFF"
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div style={{ width: 170 }}>
            <SelectField
              label="Modo"
              size="md"
              value={state.stripeMode || "test"}
              onChange={(v) => set("stripeMode", v as "test" | "live")}
              options={[
                { value: "test", label: "Test" },
                { value: "live", label: "Live (producción)" },
              ]}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Publishable key</Label>
            <input
              value={state.stripePublishableKey ?? ""}
              onChange={(e) => set("stripePublishableKey", e.target.value)}
              placeholder="pk_test_… o pk_live_…"
              style={inputStyle()}
            />
          </div>
        </div>
        <SecretInput
          label="Secret key"
          value={state.stripeSecretKey ?? ""}
          onChange={(v) => set("stripeSecretKey", v)}
          show={!!show.stripeSecret}
          onToggleShow={() => setShow((p) => ({ ...p, stripeSecret: !p.stripeSecret }))}
          placeholder="sk_test_… o sk_live_…"
        />
        <SecretInput
          label="Webhook secret"
          value={state.stripeWebhookSecret ?? ""}
          onChange={(v) => set("stripeWebhookSecret", v)}
          show={!!show.stripeWebhook}
          onToggleShow={() => setShow((p) => ({ ...p, stripeWebhook: !p.stripeWebhook }))}
          placeholder="whsec_…"
        />
      </MethodCard>

      {/* PayPal */}
      <MethodCard
        title="PayPal"
        desc="Pago con cuenta PayPal o tarjeta vía PayPal. Bueno para LATAM y EU."
        icon="🅿️"
        enabled={state.enablePaypal}
        onToggle={(v) => set("enablePaypal", v)}
        color="#003087"
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div style={{ width: 170 }}>
            <SelectField
              label="Modo"
              size="md"
              value={state.paypalMode || "sandbox"}
              onChange={(v) => set("paypalMode", v as "sandbox" | "live")}
              options={[
                { value: "sandbox", label: "Sandbox" },
                { value: "live", label: "Live" },
              ]}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Client ID</Label>
            <input
              value={state.paypalClientId ?? ""}
              onChange={(e) => set("paypalClientId", e.target.value)}
              placeholder="Ax… (Client ID de PayPal Developer)"
              style={inputStyle()}
            />
          </div>
        </div>
        <SecretInput
          label="Client secret"
          value={state.paypalClientSecret ?? ""}
          onChange={(v) => set("paypalClientSecret", v)}
          show={!!show.paypalSecret}
          onToggleShow={() => setShow((p) => ({ ...p, paypalSecret: !p.paypalSecret }))}
        />
      </MethodCard>

      {/* MercadoPago */}
      <MethodCard
        title="MercadoPago"
        desc="Pago en pesos mexicanos / argentinos / colombianos / etc. Ideal para LATAM."
        icon="🇲🇽"
        enabled={state.enableMercadopago}
        onToggle={(v) => set("enableMercadopago", v)}
        color="#009EE3"
      >
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Label>Public key</Label>
            <input
              value={state.mpPublicKey ?? ""}
              onChange={(e) => set("mpPublicKey", e.target.value)}
              placeholder="APP_USR-…"
              style={inputStyle()}
            />
          </div>
        </div>
        <SecretInput
          label="Access token"
          value={state.mpAccessToken ?? ""}
          onChange={(v) => set("mpAccessToken", v)}
          show={!!show.mpToken}
          onToggleShow={() => setShow((p) => ({ ...p, mpToken: !p.mpToken }))}
          placeholder="APP_USR-… (private)"
        />
      </MethodCard>

      {/* Transferencias bancarias */}
      <MethodCard
        title="Transferencia / Depósito"
        desc="Cuentas bancarias que el alumno puede usar para transferir. Aparecen en checkout con instrucciones."
        icon="🏦"
        enabled={state.enableTransfer}
        onToggle={(v) => set("enableTransfer", v)}
        color="#2BB8A7"
      >
        {state.bankAccounts.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 12, padding: "6px 0" }}>
            Sin cuentas registradas. Agrega una abajo.
          </div>
        )}
        {state.bankAccounts.map((b, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 14,
              background: "var(--bg-2)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div className="row" style={{ gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  fontWeight: 800,
                  color: "var(--gold-deep)",
                }}
              >
                CUENTA #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeBank(i)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--red)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Quitar
              </button>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Label>Banco</Label>
                <input
                  value={b.bankName}
                  onChange={(e) => updateBank(i, { bankName: e.target.value })}
                  placeholder="BBVA / Banamex / Santander…"
                  style={inputStyle()}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Titular</Label>
                <input
                  value={b.accountHolder}
                  onChange={(e) => updateBank(i, { accountHolder: e.target.value })}
                  placeholder="Nombre o razón social"
                  style={inputStyle()}
                />
              </div>
              <div style={{ width: 110 }}>
                <SelectField
                  label="Moneda"
                  size="md"
                  value={b.currency || "MXN"}
                  onChange={(v) => updateBank(i, { currency: v })}
                  options={["MXN", "USD", "EUR"]}
                />
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Label>No. de cuenta</Label>
                <input
                  value={b.accountNumber ?? ""}
                  onChange={(e) => updateBank(i, { accountNumber: e.target.value })}
                  placeholder="Opcional"
                  style={inputStyle()}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label>CLABE</Label>
                <input
                  value={b.clabe ?? ""}
                  onChange={(e) => updateBank(i, { clabe: e.target.value })}
                  placeholder="18 dígitos (MX)"
                  style={inputStyle()}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label>SWIFT / BIC</Label>
                <input
                  value={b.swift ?? ""}
                  onChange={(e) => updateBank(i, { swift: e.target.value })}
                  placeholder="Para internacional"
                  style={inputStyle()}
                />
              </div>
            </div>
            <div>
              <Label>Instrucciones para el alumno</Label>
              <textarea
                value={b.instructions ?? ""}
                onChange={(e) => updateBank(i, { instructions: e.target.value })}
                placeholder="Ej: Manda comprobante a info@cristianhdz.com con tu nombre y curso. Activamos en 24h."
                style={{ ...inputStyle(), minHeight: 60 }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addBank}
          style={{
            padding: "8px 14px",
            background: "transparent",
            border: "1px dashed var(--gold-deep)",
            color: "var(--gold-deep)",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            alignSelf: "flex-start",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          + Agregar cuenta bancaria
        </button>
      </MethodCard>

      {/* Save */}
      <div
        style={{
          position: "sticky",
          bottom: 16,
          padding: 16,
          background: "white",
          borderRadius: 12,
          border: "1px solid var(--line)",
          boxShadow: "0 6px 18px rgba(10,30,58,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>
          Los secretos se guardan en la base. Solo admins pueden verlos.
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || loadFailed}
          className="btn btn-primary"
          style={{ padding: "10px 18px", fontSize: 13 }}
        >
          {saving ? "Guardando…" : "Guardar métodos de pago"}
        </button>
      </div>
    </div>
  );
}

function MethodCard({
  title,
  desc,
  icon,
  enabled,
  onToggle,
  color,
  children,
}: {
  title: string;
  desc: string;
  icon: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        border: `1.5px solid ${enabled ? color : "var(--line)"}`,
        borderRadius: 14,
        padding: 18,
        opacity: enabled ? 1 : 0.92,
      }}
    >
      <div className="row" style={{ gap: 14, alignItems: "flex-start", marginBottom: enabled ? 16 : 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `color-mix(in srgb, ${color} 16%, white)`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>
              {title}
            </div>
            {enabled && (
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 7px",
                  background: color,
                  color: "white",
                  borderRadius: 4,
                  letterSpacing: "0.06em",
                }}
              >
                ACTIVO
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
        </div>
        <label
          className="row"
          style={{
            gap: 8,
            alignItems: "center",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--ink-2)",
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ accentColor: color, width: 16, height: 16, cursor: "pointer" }}
          />
          Habilitar
        </label>
      </div>
      {enabled && <div className="col" style={{ gap: 12 }}>{children}</div>}
    </div>
  );
}

function SecretInput({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle(), paddingRight: 44, fontFamily: show ? "var(--font-mono)" : "inherit" }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Ocultar" : "Mostrar"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
            padding: "4px 6px",
          }}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
    </div>
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
