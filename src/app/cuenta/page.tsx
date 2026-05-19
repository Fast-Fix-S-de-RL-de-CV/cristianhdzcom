import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LogoutButton, PasswordForm, ProfileForm } from "./AccountForms";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cuenta");

  return (
    <div className="plat">
      <PlatformSidebar activeHref="/cuenta" />

      <main className="plat-main" style={{ gridColumn: "span 2" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <Eyebrow>Ajustes</Eyebrow>
            <h1 className="serif" style={{ fontSize: 40, marginTop: 8 }}>
              Mi cuenta
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
              Información personal, contraseña y sesión.
            </p>
          </div>

          <div className="col" style={{ gap: 20 }}>
            <Card style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 className="serif" style={{ fontSize: 22 }}>
                  Información personal
                </h2>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  TU PERFIL PÚBLICO
                </div>
              </div>
              <ProfileForm user={{ id: user.id, name: user.name, email: user.email }} />
            </Card>

            <Card style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 className="serif" style={{ fontSize: 22 }}>
                  Cambiar contraseña
                </h2>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  SEGURIDAD
                </div>
              </div>
              <PasswordForm />
            </Card>

            <Card style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 className="serif" style={{ fontSize: 22 }}>
                  Sesión
                </h2>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  CIERRA SESIÓN EN ESTE DISPOSITIVO
                </div>
              </div>
              <div className="between" style={{ flexWrap: "wrap", gap: 16 }}>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>
                  Conectado como <strong style={{ color: "var(--ink)" }}>{user.email}</strong>
                </div>
                <LogoutButton />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
