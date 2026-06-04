"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Nav } from "@/components/marketing/Nav";
import { isValidEmail } from "@/lib/format";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Revisa tu correo.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setLoading(false);
      // We always show "sent" to avoid leaking which emails exist.
      if (res.ok || res.status === 400) {
        setSent(true);
      } else {
        setError("Algo falló. Inténtalo de nuevo.");
      }
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
          {sent ? (
            <>
              <Eyebrow>Email enviado</Eyebrow>
              <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 16, lineHeight: 1.15 }}>
                Revisa tu <span className="gold-text">bandeja de entrada</span>.
              </h1>
              <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>
                Si <strong style={{ color: "var(--navy)" }}>{email}</strong> tiene una cuenta con nosotros, le enviamos un link
                para restablecer su contraseña. Es válido por <strong>1 hora</strong>.
              </p>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
                ¿No llegó? Revisa la carpeta de spam. Si tampoco, escríbenos a{" "}
                <a href="mailto:info@cristianhdz.com" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>
                  info@cristianhdz.com
                </a>
                .
              </p>
              <div style={{ marginTop: 24 }}>
                <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Volver a iniciar sesión
                </Link>
              </div>
            </>
          ) : (
            <>
              <Eyebrow>Recuperar acceso</Eyebrow>
              <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 12, lineHeight: 1.15 }}>
                ¿Olvidaste tu contraseña?
              </h1>
              <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>
                Pon tu email y te enviamos un link para crear una nueva.
              </p>
              <form onSubmit={onSubmit} className="col" style={{ gap: 22 }} noValidate>
                <Field
                  label="Tu correo"
                  format="email"
                  required
                  value={email}
                  onChange={setEmail}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
                {error && <div className="tf-error-msg" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>{error}</div>}
                <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {loading ? "Enviando…" : "Enviarme el link →"}
                </Button>
              </form>
              <div style={{ marginTop: 24, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                ¿Recordaste tu contraseña?{" "}
                <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Iniciar sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
