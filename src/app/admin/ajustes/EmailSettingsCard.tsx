"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ConfirmProvider";
import { useTenant } from "@/components/tenant/TenantProvider";

type EmailSettings = {
  fromName: string | null;
  fromEmail: string | null;
  replyToEmail: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string | null;
  enableSmtp: boolean;
  enableBookingReminders: boolean;
};

const EMPTY: EmailSettings = {
  fromName: "",
  fromEmail: "",
  replyToEmail: "",
  smtpHost: "",
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: "",
  smtpPass: "",
  enableSmtp: false,
  enableBookingReminders: true,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  background: "white",
  color: "var(--ink)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmailSettingsCard() {
  const { tp } = useTenant();
  const toast = useToast();
  const [form, setForm] = useState<EmailSettings>(EMPTY);
  const [globalConfigured, setGlobalConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(tp("/api/admin/email-settings"))
      .then((r) => r.json())
      .then((j) => {
        setForm({ ...EMPTY, ...(j.settings ?? {}) });
        setGlobalConfigured(!!j.globalConfigured);
      })
      .catch(() => toast.error("No se pudo cargar la configuración de email."))
      .finally(() => setLoading(false));
  }, [tp]);

  function patch<K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(tp("/api/admin/email-settings"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error === "invalid" ? "Revisa los datos del SMTP." : "No se pudo guardar.");
        return;
      }
      setForm({ ...EMPTY, ...j.settings });
      toast.success("Configuración de email guardada.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo.includes("@")) {
      toast.error("Escribe un correo válido para la prueba.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(tp("/api/admin/email-settings"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      if (!res.ok) {
        toast.error("No se pudo enviar la prueba. Revisa host, puerto, usuario y contraseña.");
        return;
      }
      toast.success("Correo de prueba enviado.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <div style={{ color: "var(--muted)", fontSize: 13 }}>Cargando email…</div>;

  return (
    <div className="col" style={{ gap: 16 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
        {globalConfigured
          ? "Hay un proveedor global configurado. Si activas SMTP aquí, este tenant usará su propio remitente."
          : "No hay proveedor global detectado. Activa SMTP del tenant para que salgan correos reales."}
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.enableSmtp} onChange={(e) => patch("enableSmtp", e.target.checked)} />
          Usar SMTP propio del tenant
        </label>
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.enableBookingReminders} onChange={(e) => patch("enableBookingReminders", e.target.checked)} />
          Enviar recordatorio 1 hora antes de reservas
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nombre remitente">
          <input value={form.fromName ?? ""} onChange={(e) => patch("fromName", e.target.value)} placeholder="Mi Marca" style={inputStyle} />
        </Field>
        <Field label="Correo remitente">
          <input value={form.fromEmail ?? ""} onChange={(e) => patch("fromEmail", e.target.value)} placeholder="hola@tudominio.com" style={inputStyle} />
        </Field>
        <Field label="Reply-to">
          <input value={form.replyToEmail ?? ""} onChange={(e) => patch("replyToEmail", e.target.value)} placeholder="soporte@tudominio.com" style={inputStyle} />
        </Field>
        <Field label="SMTP Host">
          <input value={form.smtpHost ?? ""} onChange={(e) => patch("smtpHost", e.target.value)} placeholder="mail.tudominio.com" style={inputStyle} />
        </Field>
        <Field label="SMTP User">
          <input value={form.smtpUser ?? ""} onChange={(e) => patch("smtpUser", e.target.value)} placeholder="hola@tudominio.com" style={inputStyle} />
        </Field>
        <Field label="SMTP Password">
          <input type="password" value={form.smtpPass ?? ""} onChange={(e) => patch("smtpPass", e.target.value)} placeholder="********" style={inputStyle} />
        </Field>
        <Field label="Puerto">
          <input type="number" value={form.smtpPort} onChange={(e) => patch("smtpPort", Number(e.target.value))} style={inputStyle} />
        </Field>
        <Field label="Seguridad">
          <select value={form.smtpSecure ? "true" : "false"} onChange={(e) => patch("smtpSecure", e.target.value === "true")} style={inputStyle}>
            <option value="true">SSL/TLS (465)</option>
            <option value="false">STARTTLS / sin SSL (587)</option>
          </select>
        </Field>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: "10px 16px", fontSize: 13 }}>
          {saving ? "Guardando…" : "Guardar email"}
        </button>
        <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="correo@prueba.com" style={{ ...inputStyle, width: 240 }} />
        <button className="btn btn-ghost" onClick={sendTest} disabled={testing} style={{ padding: "10px 16px", fontSize: 13 }}>
          {testing ? "Enviando…" : "Enviar prueba"}
        </button>
      </div>
    </div>
  );
}
