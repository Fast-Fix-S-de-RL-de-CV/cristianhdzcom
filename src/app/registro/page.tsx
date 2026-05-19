"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Nav } from "@/components/marketing/Nav";

// Only letters (with accents), spaces, apostrophes, hyphens — no numbers, no symbols.
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean; confirm?: boolean }>({});

  // Live validation (only shows error after user blurs the field)
  const nameError =
    touched.name && name.trim().length < 2
      ? "Tu nombre completo, por favor."
      : touched.name && !NAME_REGEX.test(name)
      ? "Solo letras y espacios — sin números ni símbolos."
      : null;
  const emailError = touched.email && !EMAIL_REGEX.test(email) ? "Email no válido." : null;
  const passwordError =
    touched.password && password.length > 0 && password.length < 8
      ? "Mínimo 8 caracteres."
      : null;
  const confirmError =
    touched.confirm && confirm.length > 0 && confirm !== password ? "Las contraseñas no coinciden." : null;

  const passwordsMatch = password.length >= 8 && password === confirm;

  function handleNameChange(v: string) {
    // Only allow valid chars — strip anything else as you type.
    const cleaned = v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]/g, "");
    setName(cleaned);
  }

  function handleEmailChange(v: string) {
    setEmail(v.toLowerCase().replace(/\s/g, ""));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });

    if (name.trim().length < 2 || !NAME_REGEX.test(name)) {
      setError("Tu nombre debe tener solo letras y espacios.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Revisa tu email.");
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
          setError("Ya existe una cuenta con ese email. Inicia sesión.");
        } else if (j?.error === "invalid" || res.status === 400) {
          setError("Revisa los datos. El nombre solo letras, el email válido, contraseña 8+ caracteres.");
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
      <section className="sec" style={{ paddingTop: 48, paddingBottom: 96, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ padding: 40, width: 480, maxWidth: "100%" }}>
          <Eyebrow>Empieza gratis</Eyebrow>
          <h1 style={{ fontSize: 40, marginTop: 12, marginBottom: 12 }}>Crea tu cuenta.</h1>
          <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>
            Acceso inmediato a la comunidad y al primer taller del mes.
          </p>
          <form onSubmit={onSubmit} className="col" style={{ gap: 20 }} noValidate>
            <div>
              <label htmlFor="name" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                ¿CÓMO TE LLAMAS?
              </label>
              <input
                id="name"
                className={`input input-lg ${nameError ? "input-error" : ""}`}
                type="text"
                required
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                style={{ marginTop: 8 }}
              />
              {nameError && <div className="field-error">{nameError}</div>}
            </div>

            <div>
              <label htmlFor="email" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                TU EMAIL
              </label>
              <input
                id="email"
                className={`input input-lg ${emailError ? "input-error" : ""}`}
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                style={{ marginTop: 8 }}
              />
              {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div>
              <label htmlFor="password" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                CONTRASEÑA · MÍN. 8 CARACTERES
              </label>
              <div className="input-with-toggle" style={{ marginTop: 8 }}>
                <input
                  id="password"
                  className={`input input-lg ${passwordError ? "input-error" : ""}`}
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
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
              {passwordError && <div className="field-error">{passwordError}</div>}
            </div>

            <div>
              <label htmlFor="confirm" className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                CONFIRMA TU CONTRASEÑA
              </label>
              <div className="input-with-toggle" style={{ marginTop: 8 }}>
                <input
                  id="confirm"
                  className={`input input-lg ${confirmError ? "input-error" : ""}`}
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{ color: passwordsMatch ? "var(--green-strong)" : undefined }}
                >
                  {passwordsMatch ? <Check size={18} /> : showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmError && <div className="field-error">{confirmError}</div>}
            </div>

            {error && (
              <div className="field-error" style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
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
