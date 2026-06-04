"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Nav } from "@/components/marketing/Nav";
import { isValidEmail } from "@/lib/format";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validación de password/confirm a nivel formulario (Field ya valida nombre y
  // correo por su `format`). Se muestra tras el primer intento de envío.
  const passwordError =
    submitted && password.length > 0 && password.length < 8 ? "Mínimo 8 caracteres." : null;
  const confirmError =
    submitted && confirm.length > 0 && confirm !== password ? "Las contraseñas no coinciden." : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (name.trim().length < 2) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Revisa tu correo.");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      setLoading(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === "email_in_use" || res.status === 409) {
          setError("Ya existe una cuenta con ese correo. Inicia sesión.");
        } else if (j?.error === "invalid" || res.status === 400) {
          setError("Revisa los datos: nombre solo letras, correo válido, contraseña de 8+ caracteres.");
        } else {
          setError("No pudimos crear tu cuenta. Inténtalo de nuevo.");
        }
        return;
      }
      router.push("/plataforma");
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
        <div className="card" style={{ padding: 40, width: 480, maxWidth: "100%" }}>
          <Eyebrow>Empieza gratis</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 12 }}>Crea tu cuenta.</h1>
          <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14, lineHeight: 1.5 }}>
            Acceso inmediato a la comunidad y al primer taller del mes.
          </p>
          <form onSubmit={onSubmit} className="col" style={{ gap: 26 }} noValidate>
            <Field
              label="¿Cómo te llamas?"
              format="name"
              required
              value={name}
              onChange={setName}
              placeholder="Tu nombre completo"
              autoComplete="name"
            />
            <Field
              label="Tu correo"
              format="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
            <Field
              label="Contraseña"
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
              label="Confirma tu contraseña"
              format="password"
              required
              value={confirm}
              onChange={setConfirm}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              error={confirmError}
            />

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
