"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Nav } from "@/components/marketing/Nav";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordError = password.length > 0 && password.length < 8 ? "Mínimo 8 caracteres." : null;
  const confirmError = confirm.length > 0 && confirm !== password ? "Las contraseñas no coinciden." : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("El link es inválido. Pide otro desde 'Recuperar contraseña'.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      setLoading(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === "token_invalid_or_expired") {
          setError("Este link ya expiró o fue usado. Pide uno nuevo.");
        } else if (j?.error === "invalid_password") {
          setError("La contraseña no es válida. Mínimo 8 caracteres.");
        } else {
          setError("Algo falló. Inténtalo de nuevo.");
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setLoading(false);
      setError("No hay conexión. Revisa tu internet.");
    }
  }

  if (!token) {
    return (
      <div>
        <Nav />
        <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
          <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
            <Eyebrow>Link inválido</Eyebrow>
            <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 12 }}>Necesitas un link válido.</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
              Pide uno nuevo desde "Recuperar contraseña".
            </p>
            <Link href="/recuperar" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 24 }}>
              Recuperar contraseña
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ padding: 40, width: 460, maxWidth: "100%" }}>
          {done ? (
            <>
              <Eyebrow>Listo</Eyebrow>
              <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 16 }}>
                ¡Contraseña <span className="gold-text">actualizada</span>!
              </h1>
              <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>
                Te llevamos al login en un momento…
              </p>
            </>
          ) : (
            <>
              <Eyebrow>Nueva contraseña</Eyebrow>
              <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 12 }}>Crea una nueva.</h1>
              <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>
                Elige una que no uses en ningún otro lado. Mínimo 8 caracteres.
              </p>
              <form onSubmit={onSubmit} className="col" style={{ gap: 24 }} noValidate>
                <Field
                  label="Nueva contraseña"
                  format="password"
                  required
                  value={password}
                  onChange={setPassword}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  error={passwordError}
                  help="Mín. 8 caracteres"
                />
                <Field
                  label="Confirma la nueva contraseña"
                  format="password"
                  required
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Repítela"
                  autoComplete="new-password"
                  error={confirmError}
                />

                {error && (
                  <div className="tf-error-msg" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {loading ? "Guardando…" : "Guardar contraseña →"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
