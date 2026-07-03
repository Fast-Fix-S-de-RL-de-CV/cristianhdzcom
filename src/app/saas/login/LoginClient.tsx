"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Form del login central de mimarca.app. POST /api/platform/login resuelve
 * el destino (superadmin / admin de tenant / miembro) y regresa redirectTo.
 */
export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          json.error === "invalid_credentials"
            ? "Correo o contraseña incorrectos."
            : "No se pudo iniciar sesión. Intenta de nuevo.",
        );
        return;
      }
      window.location.href = json.redirectTo || "/";
    } catch {
      setErr("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ padding: 40, width: "100%", maxWidth: 440 }}>
      <Eyebrow>Bienvenido de vuelta</Eyebrow>
      <h1 className="serif" style={{ fontSize: 32, marginTop: 10, marginBottom: 6 }}>
        Iniciar sesión
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
        Entra con tu correo y te llevamos a tu plataforma — o a tu panel si eres administrador.
      </p>

      <form onSubmit={submit} className="col" style={{ gap: 14 }}>
        <label className="col" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            CORREO
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            style={inputStyle()}
          />
        </label>
        <label className="col" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            CONTRASEÑA
          </span>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputStyle(), width: "100%", paddingRight: 74 }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="mono"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                fontSize: 11,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {showPass ? "OCULTAR" : "VER"}
            </button>
          </div>
        </label>

        {err && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--red, #dc2626) 10%, white)",
              color: "var(--red, #dc2626)",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <Button size="lg" shine disabled={busy || !email || !password} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Entrando…" : "Entrar →"}
        </Button>
      </form>

      <div className="rule" style={{ margin: "22px 0" }} />
      <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
        ¿Aún no tienes plataforma?{" "}
        <Link href="/crear" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>
          Crea la tuya gratis
        </Link>
        <br />
        <span style={{ fontSize: 12 }}>
          ¿Eres alumno? También puedes entrar directo en el sitio de tu academia.
        </span>
      </p>
    </Card>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "12px 14px",
    border: "1px solid var(--line-2)",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "var(--font-sans)",
    background: "white",
    outline: "none",
  };
}
