import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Megaphone, FileText, Calculator, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    key: "marketing",
    title: "Plan de Marketing",
    desc: "Aterriza toda tu estrategia de lanzamiento en un canvas visual tipo n8n: SMS, ads, emails, WhatsApp, landing… con tiempos, responsables, checklist y flujo. Exportable e imprimible.",
    href: "/plataforma/herramientas/marketing",
    icon: Megaphone,
    color: "#2563eb",
    ready: true,
  },
  {
    key: "negocio",
    title: "Plan de Negocios",
    desc: "Arma tu modelo de negocio paso a paso: propuesta de valor, clientes, canales, costos e ingresos.",
    href: "#",
    icon: FileText,
    color: "#7c3aed",
    ready: false,
  },
  {
    key: "valuador",
    title: "Valuador de Producto",
    desc: "Calcula el precio ideal de tu producto o servicio según costos, mercado y margen objetivo.",
    href: "#",
    icon: Calculator,
    color: "#16a34a",
    ready: false,
  },
];

export default async function HerramientasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plataforma/herramientas");

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
      <div style={{ marginBottom: 28 }}>
        <Eyebrow>Plataforma · Gratis para todos</Eyebrow>
        <h1 className="serif" style={{ fontSize: 38, marginTop: 10 }}>
          Herramientas
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 6, maxWidth: 640 }}>
          Utilidades para aterrizar tus ideas de emprendedor. Empieza por el constructor visual de plan de marketing.
        </p>
      </div>

      <div className="grid-3" style={{ gap: 20 }}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const card = (
            <div
              className="card"
              style={{
                padding: 24,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                opacity: t.ready ? 1 : 0.62,
                cursor: t.ready ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: `${t.color}15`,
                  color: t.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Icon size={22} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t.title}</div>
              <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{t.desc}</p>
              <div
                className="mono"
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.ready ? "var(--accent)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {t.ready ? (
                  <>
                    Abrir <ArrowRight size={14} />
                  </>
                ) : (
                  "Próximamente"
                )}
              </div>
            </div>
          );
          return t.ready ? (
            <Link key={t.key} href={t.href} style={{ textDecoration: "none", color: "inherit" }}>
              {card}
            </Link>
          ) : (
            <div key={t.key}>{card}</div>
          );
        })}
      </div>
    </AlumnoShell>
  );
}
