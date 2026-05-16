"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    const next = params.get("next") || "/comunidad";
    router.push(next);
    router.refresh();
  }

  return (
    <div>
      <Nav />
      <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
          <Eyebrow>Acceso</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 24 }}>Inicia sesión.</h1>
          <form onSubmit={onSubmit} className="col" style={{ gap: 16 }}>
            <div>
              <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                EMAIL
              </label>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                CONTRASEÑA
              </label>
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
            {error && (
              <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>
            )}
            <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center" }}>
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
