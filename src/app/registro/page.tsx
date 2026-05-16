"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Nav } from "@/components/marketing/Nav";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error === "email_in_use" ? "Ese email ya está registrado." : "No pudimos crear tu cuenta.");
      return;
    }
    router.push("/comunidad");
    router.refresh();
  }

  return (
    <div>
      <Nav />
      <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
          <Eyebrow>Empieza gratis</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 12 }}>Crea tu cuenta.</h1>
          <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
            Acceso inmediato a la comunidad y al primer taller del mes.
          </p>
          <form onSubmit={onSubmit} className="col" style={{ gap: 16 }}>
            <div>
              <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>NOMBRE COMPLETO</label>
              <input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 6 }} />
            </div>
            <div>
              <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>EMAIL</label>
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 6 }} />
            </div>
            <div>
              <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>CONTRASEÑA · MÍN. 8</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
            <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Creando cuenta…" : "Crear cuenta →"}
            </Button>
          </form>
          <div style={{ marginTop: 24, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Inicia sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
