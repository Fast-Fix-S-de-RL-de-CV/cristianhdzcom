"use client";

import { useTenant } from "@/components/tenant/TenantProvider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { adminIcon } from "./adminIcons";
import { ADMIN_NAV_GROUPS } from "./adminNav";

export function AdminSidebar({
  active,
  counts,
  extra,
}: {
  active: string;
  counts?: Record<string, string | number | null | undefined>;
  extra?: React.ReactNode;
}) {
  const { tp } = useTenant();

  return (
    <aside
      style={{
        padding: "24px 16px",
        background: "var(--bg)",
        borderRight: "1px solid var(--line)",
      }}
    >
      <div className="admin-sidebar-groups" style={{ display: "grid", gap: 18 }}>
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <Eyebrow style={{ padding: "0 12px 10px" }}>{group.label}</Eyebrow>
            <div className="col admin-sidebar-items" style={{ gap: 2 }}>
              {group.items.map((item) => {
                const activeKey = item.activeKey ?? item.href;
                const isActive = activeKey === active;
                const count = counts?.[item.label];
                return (
                  <a
                    key={item.href}
                    href={tp(item.href)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: isActive ? "var(--ink)" : "transparent",
                      color: isActive ? "var(--bg)" : "var(--ink-2)",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ width: 18, display: "inline-flex", alignItems: "center" }}>
                      {adminIcon(item.label)}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {count ? (
                      <span
                        className="mono"
                        style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.6)" : "var(--muted)" }}
                      >
                        {count}
                      </span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {extra ? (
        <>
          <div className="rule" style={{ margin: "20px 8px" }} />
          {extra}
        </>
      ) : null}
    </aside>
  );
}
