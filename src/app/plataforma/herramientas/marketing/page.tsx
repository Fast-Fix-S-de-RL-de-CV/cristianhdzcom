import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PlansList } from "@/components/tools/PlansList";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketingPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/herramientas/marketing");

  return (
    <AlumnoShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        xp: user.xp,
        streakDays: user.streakDays,
        hearts: user.hearts,
        tier: user.tier,
        tierScore: user.tierScore,
      }}
      active="herramientas"
    >
      <div style={{ marginBottom: 26 }}>
        <Link
          href="/plataforma/herramientas"
          className="mono"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}
        >
          <ArrowLeft size={13} /> Herramientas
        </Link>
        <Eyebrow>Plan de Marketing</Eyebrow>
        <h1 className="serif" style={{ fontSize: 34, marginTop: 8 }}>
          Tus planes
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6, maxWidth: 600 }}>
          Cada plan es un canvas de lanzamiento. Crea uno por producto, servicio o campaña.
        </p>
      </div>
      <PlansList />
    </AlumnoShell>
  );
}
