"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { PLANS, RESERVED_SLUGS, TRIAL_DAYS, type PlanId } from "@/lib/plans";
import { isValidSlug, sanitizeSlugInput, slugify } from "@/lib/slug";

/**
 * Wizard de signup (realm plataforma — links/fetch SIN tp(): aquí no hay
 * tenant y /api/platform/** pasa directo por el middleware).
 *
 * On success: redirect a data.adminUrl ("/{slug}/admin") con navegación
 * completa — cruza de realm plataforma a realm tenant.
 */

const SLUG_MAX = 60;

function slugError(slug: string): string | null {
  if (!slug) return null; // vacío se marca en submit
  if (RESERVED_SLUGS.has(slug)) return "Ese nombre está reservado. Elige otro.";
  if (!isValidSlug(slug)) return "Solo minúsculas, números y guiones (sin empezar ni terminar con guion).";
  return null;
}

export function CrearClient({ initialPlan }: { initialPlan: PlanId }) {
  const [platformName, setPlatformName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugErr = slugError(slug);
  const slugOk = slug.length >= 2 && !slugErr;

  function onNameChange(v: string) {
    setPlatformName(v);
    // Auto-slugifica mientras el usuario no haya editado el slug a mano.
    if (!slugTouched) setSlug(slugify(v).slice(0, SLUG_MAX));
  }

  function onSlugChange(v: string) {
    setSlugTouched(true);
    setSlug(sanitizeSlugInput(v).slice(0, SLUG_MAX));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!platformName.trim() || !slug || !ownerName.trim() || !email || !password) {
      setError("Completa todos los campos para crear tu plataforma.");
      return;
    }
    if (slugErr || !slugOk) {
      setError("Revisa la dirección de tu plataforma (el slug).");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: platformName.trim(),
          slug,
          ownerName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          password,
          plan,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        if (j?.error === "slug_taken") setError("Esa dirección ya está ocupada. Prueba con otra.");
        else if (j?.error === "slug_reserved") setError("Ese nombre está reservado. Elige otro.");
        else if (j?.error === "invalid") setError("Revisa los datos del formulario.");
        else setError("No pudimos crear tu plataforma. Inténtalo de nuevo.");
        return;
      }
      // Cruce de realm (plataforma → tenant): navegación completa.
      window.location.href = j.adminUrl || `/${slug}/admin`;
    } catch {
      setLoading(false);
      setError("No hay conexión. Revisa tu internet.");
    }
  }

  return (
    <section className="sec" style={{ paddingTop: 56, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 640, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Eyebrow>Crear mi plataforma</Eyebrow>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginTop: 14 }}>
            Lanza tu plataforma <span className="gold-text">en 2 minutos</span>.
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 15 }}>
            {TRIAL_DAYS} días gratis · sin tarjeta · cancela cuando quieras.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="col" style={{ gap: 28 }}>
          {/* PASO 1 — Tu plataforma */}
          <div className="card" style={{ padding: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>1 · Tu plataforma</div>
            <div className="col" style={{ gap: 22 }}>
              <Field
                label="Nombre de tu plataforma"
                value={platformName}
                onChange={onNameChange}
                placeholder="Academia Reyna Fit"
                required
                maxLength={120}
                autoFocus
              />
              <Field
                label="Dirección (slug)"
                value={slug}
                onChange={onSlugChange}
                placeholder="reyna-fit"
                required
                maxLength={SLUG_MAX}
                error={slugErr}
                showValid={false}
                help={
                  <span className="mono" style={{ fontSize: 11 }}>
                    mimarca.app/<strong style={{ color: slugOk ? "var(--green-strong)" : "var(--ink)" }}>{slug || "tu-marca"}</strong>
                    {slugOk && (
                      <span style={{ color: "var(--green-strong)", marginLeft: 8, display: "inline-flex", verticalAlign: "middle" }}>
                        <Check size={13} />
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>

          {/* PASO 2 — Tu cuenta */}
          <div className="card" style={{ padding: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>2 · Tu cuenta de administrador</div>
            <div className="col" style={{ gap: 22 }}>
              <Field
                label="Tu nombre"
                value={ownerName}
                onChange={setOwnerName}
                placeholder="Reyna Hernández"
                required
                maxLength={120}
              />
              <Field
                label="Correo"
                format="email"
                value={email}
                onChange={setEmail}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
              />
              <Field
                label="Contraseña"
                format="password"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* PASO 3 — Plan */}
          <div className="card" style={{ padding: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>3 · Tu plan ({TRIAL_DAYS} días gratis en ambos)</div>
            <div className="grid-2" style={{ gap: 16 }}>
              {(Object.keys(PLANS) as PlanId[]).map((id) => {
                const p = PLANS[id];
                const selected = plan === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPlan(id)}
                    aria-pressed={selected}
                    style={{
                      textAlign: "left",
                      padding: 20,
                      borderRadius: 14,
                      border: selected ? "2px solid var(--gold)" : "1px solid var(--line-2)",
                      background: selected ? "var(--gold-soft)" : "white",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div className="between">
                      <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: selected ? "var(--gold-deep)" : "var(--muted)" }}>
                        {p.name.toUpperCase()}
                      </span>
                      {selected && <Check size={16} style={{ color: "var(--gold-deep)" }} />}
                    </div>
                    <div className="serif" style={{ fontSize: 26 }}>
                      ${p.priceMxnMonthly.toLocaleString("es-MX")}
                      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}> MXN/mes</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{p.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="tf-error-msg" role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <Button type="submit" size="lg" shine disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Creando tu plataforma…" : "Crear mi plataforma →"}
          </Button>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", letterSpacing: "0.08em", marginTop: -12 }}>
            AL CREAR TU PLATAFORMA ACEPTAS NUESTROS TÉRMINOS DE SERVICIO
          </div>
        </form>
      </div>
    </section>
  );
}
