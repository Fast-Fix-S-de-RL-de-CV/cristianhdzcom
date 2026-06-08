"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Megaphone } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

type PlanRow = { id: string; title: string; product: string; updatedAt: string; nodeCount: number };

export function PlansList() {
  const router = useRouter();
  const confirm = useConfirm();
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/tools/marketing")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j) => setPlans(j.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  async function create() {
    setCreating(true);
    try {
      const r = await fetch("/api/tools/marketing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await r.json();
      if (r.ok && j.id) router.push(`/plataforma/herramientas/marketing/${j.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function del(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: "¿Eliminar este plan?",
      description: "Se borra el tablero completo. No se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/tools/marketing/${id}`, { method: "DELETE" });
    setPlans((p) => (p ?? []).filter((x) => x.id !== id));
  }

  return (
    <div className="grid-3" style={{ gap: 18 }}>
      {/* Nuevo plan */}
      <button
        type="button"
        onClick={create}
        disabled={creating}
        className="card"
        style={{
          padding: 24,
          minHeight: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 10,
          border: "2px dashed var(--line-2)",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: "var(--accent-soft, #e8edf6)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={20} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{creating ? "Creando…" : "Nuevo plan"}</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Arma un flujo de lanzamiento desde cero.</div>
      </button>

      {plans === null ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)" }}>Cargando…</div>
      ) : (
        plans.map((p) => (
          <a
            key={p.id}
            href={`/plataforma/herramientas/marketing/${p.id}`}
            className="card"
            style={{ padding: 22, minHeight: 150, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", position: "relative" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#2563eb15",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Megaphone size={19} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{p.title}</div>
            {p.product ? (
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{p.product}</div>
            ) : null}
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: "auto", paddingTop: 14 }}>
              {p.nodeCount} {p.nodeCount === 1 ? "paso" : "pasos"}
            </div>
            <button
              type="button"
              onClick={(e) => del(e, p.id)}
              aria-label="Eliminar plan"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "white",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={14} />
            </button>
          </a>
        ))
      )}
    </div>
  );
}
