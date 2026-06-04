"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type UserLite = {
  id: string;
  name: string;
  email: string;
};

export function ProfileForm({ user }: { user: UserLite }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: data.error === "invalid" ? "Nombre inválido." : "No se pudo guardar." });
      } else {
        setMsg({ kind: "ok", text: "Cambios guardados." });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="col" style={{ gap: 16 }}>
      <div>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          NOMBRE
        </label>
        <input
          className="input"
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginTop: 6 }}
        />
      </div>
      <div>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          EMAIL
        </label>
        <input
          className="input"
          type="email"
          value={user.email}
          readOnly
          disabled
          style={{ marginTop: 6, background: "var(--bg-2)", cursor: "not-allowed" }}
        />
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
          El email no se puede cambiar por ahora.
        </div>
      </div>
      {msg && (
        <div
          style={{
            fontSize: 13,
            color: msg.kind === "ok" ? "var(--green-strong)" : "var(--red)",
          }}
        >
          {msg.text}
        </div>
      )}
      <Button type="submit" disabled={saving || name.trim() === user.name} style={{ alignSelf: "flex-start" }}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 8) {
      setMsg({ kind: "err", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ kind: "err", text: "Las contraseñas no coinciden." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const text =
          data.error === "invalid_current_password"
            ? "La contraseña actual es incorrecta."
            : data.error === "invalid"
              ? "Datos inválidos."
              : "No se pudo cambiar la contraseña.";
        setMsg({ kind: "err", text });
      } else {
        setMsg({ kind: "ok", text: "Contraseña actualizada." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="col" style={{ gap: 16 }}>
      <div>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          CONTRASEÑA ACTUAL
        </label>
        <input
          className="input"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{ marginTop: 6 }}
        />
      </div>
      <div>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          NUEVA CONTRASEÑA
        </label>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ marginTop: 6 }}
        />
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
          Mínimo 8 caracteres.
        </div>
      </div>
      <div>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          CONFIRMAR NUEVA CONTRASEÑA
        </label>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ marginTop: 6 }}
        />
      </div>
      {msg && (
        <div style={{ fontSize: 13, color: msg.kind === "ok" ? "var(--green-strong)" : "var(--red)" }}>
          {msg.text}
        </div>
      )}
      <Button type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" onClick={onClick} disabled={loading}>
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
