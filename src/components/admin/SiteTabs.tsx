"use client";
import { useTenant } from "@/components/tenant/TenantProvider";

/** Sub-navegación del grupo "Sitio web" del admin. */
const TABS: [string, string][] = [
  ["Portada", "/admin/ajustes/slider"],
  ["Secciones", "/admin/ajustes/home"],
  ["Acerca de", "/admin/ajustes/acerca"],
  ["Hero (textos)", "/admin/ajustes/hero"],
  ["Dominio", "/admin/ajustes/dominio"],
];

export function SiteTabs({ current }: { current: string }) {
  const { tp } = useTenant();
  return (
    <div className="row" style={{ gap: 4, marginBottom: 22, flexWrap: "wrap", borderBottom: "1px solid var(--line)" }}>
      {TABS.map(([label, href]) => {
        const active = href === current;
        return (
          <a
            key={href}
            href={tp(href)}
            style={{
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--ink)" : "var(--muted)",
              borderBottom: `2px solid ${active ? "var(--gold-deep)" : "transparent"}`,
              textDecoration: "none",
              marginBottom: -1,
            }}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
