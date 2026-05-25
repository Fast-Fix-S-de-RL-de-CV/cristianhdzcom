"use client";
import { useState } from "react";
import { ProspectosTable, type ProspectoRow } from "./ProspectosTable";
import { LeadsTab, type LeadRow } from "./LeadsTab";

type Tab = "prospects" | "leads";

/**
 * Shell con 2 sub-tabs que viven bajo /admin/prospectos.
 *
 *   - "Prospectos"  → usuarios con cuenta registrada pero sin pago (table users).
 *   - "Leads"       → solo emails capturados (newsletter, popups; table leads).
 *
 * El tab inicial puede venir por URL (?tab=leads) para soportar deep-links
 * desde el sidebar legacy o desde campañas.
 */
export function ProspectosShell({
  prospects,
  leads,
  currentUserId,
  initialTab = "prospects",
}: {
  prospects: ProspectoRow[];
  leads: LeadRow[];
  currentUserId: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabs: { value: Tab; label: string; count: number; hint: string }[] = [
    {
      value: "prospects",
      label: "Prospectos",
      count: prospects.length,
      hint: "Cuenta registrada, sin compra aún",
    },
    {
      value: "leads",
      label: "Leads",
      count: leads.length,
      hint: "Solo email capturado (newsletter, popups)",
    },
  ];
  const activeTab = tabs.find((t) => t.value === tab) ?? tabs[0];

  return (
    <>
      <div
        style={{
          padding: "14px 24px 0",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className="mono"
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px 8px 0 0",
                  border: "1px solid var(--line)",
                  borderBottom: active ? "1px solid white" : "1px solid var(--line)",
                  background: active ? "white" : "var(--bg-2)",
                  color: active ? "var(--ink)" : "var(--muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: -1,
                  position: "relative",
                  zIndex: active ? 2 : 1,
                }}
              >
                {t.label} · {t.count}
              </button>
            );
          })}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--muted)",
            letterSpacing: "0.06em",
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          {activeTab.hint}
        </div>
      </div>

      {tab === "prospects" ? (
        <ProspectosTable rows={prospects} currentUserId={currentUserId} />
      ) : (
        <LeadsTab rows={leads} />
      )}
    </>
  );
}
