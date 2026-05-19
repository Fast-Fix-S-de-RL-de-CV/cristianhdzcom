"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Nav } from "@/components/marketing/Nav";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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
          setError("Email o contraseña incorrectos.");
        } else if (res.status === 400 || j?.error === "invalid") {
          setError("Revisa el email y la contraseña.");
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
      <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
          <Eyebrow>Acceso</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 24 }}>Inicia sesión.</h1>
          <form onSubmit={onSubmit} className="col" style={{ gap: 20 }} noValidate>
            <div>
              <label htmlFor="email" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                EMAIL
              </label>
              <input
                id="email"
                className="input input-lg"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ""))}
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <div className="between" style={{ alignItems: "baseline", marginBottom: 8 }}>
                <label htmlFor="password" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  CONTRASEÑA
                </label>
                <Link
                  href="/recuperar"
                  className="mono"
                  style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 600, textDecoration: "none" }}
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="input-with-toggle">
                <input
                  id="password"
                  className="input input-lg"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="field-error" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>{error}</div>
            )}
            <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
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
