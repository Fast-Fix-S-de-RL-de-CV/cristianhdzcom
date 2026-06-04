"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Nav } from "@/components/marketing/Nav";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      setLoading(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401 || j?.error === "invalid_credentials") {
          setError("Correo o contraseña incorrectos.");
        } else if (res.status === 400 || j?.error === "invalid") {
          setError("Revisa el correo y la contraseña.");
        } else if (res.status === 429) {
          setError("Demasiados intentos. Inténtalo en unos minutos.");
        } else {
          setError("No pudimos iniciarte sesión. Inténtalo de nuevo.");
        }
        return;
      }
      const next = params.get("next") || "/plataforma";
      router.push(next);
      router.refresh();
    } catch {
      setLoading(false);
      setError("No hay conexión. Revisa tu internet.");
    }
  }

  return (
    <div>
      <Nav />
      <section
        className="sec"
        style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}
      >
        <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
          <Eyebrow>Acceso</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 24 }}>Inicia sesión.</h1>
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
            <div>
              <Field
                label="Contraseña"
                format="password"
                required
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <Link
                  href="/recuperar"
                  className="mono"
                  style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 600, textDecoration: "none" }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            {error && (
              <div className="tf-error-msg" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? "Entrando…" : "Entrar →"}
            </Button>
          </form>
          <div style={{ marginTop: 24, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
