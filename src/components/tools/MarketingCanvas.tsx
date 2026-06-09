"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CHANNELS,
  channel,
  status as statusMeta,
  STATUSES,
  STAGE_COLORS,
  CARD_COLORS,
  makeNodeData,
  type MarketingNodeData,
} from "@/lib/marketing";
import { MarketingNode } from "./MarketingNode";
import { VideoThumb } from "./VideoThumb";
import { Plus, Trash2, X, Download, Printer, ArrowLeft, Check, Upload } from "lucide-react";

const nodeTypes = { marketing: MarketingNode };

type Plan = {
  id: string;
  title: string;
  product: string;
  data: { nodes: Node[]; edges: Edge[] };
};

export function MarketingCanvas({ plan }: { plan: Plan }) {
  return (
    <ReactFlowProvider>
      <Inner plan={plan} />
    </ReactFlowProvider>
  );
}

function Inner({ plan }: { plan: Plan }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>((plan.data?.nodes as Node[]) ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((plan.data?.edges as Edge[]) ?? []);
  const [title, setTitle] = useState(plan.title);
  const [product, setProduct] = useState(plan.product ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const d = selected ? (selected.data as MarketingNodeData) : null;

  // Etapas ya usadas en el plan (para reusar en otras cards).
  const existingStages = useMemo(() => {
    const seen = new Map<string, { title: string; subtitle: string; color: string }>();
    for (const n of nodes) {
      const x = n.data as MarketingNodeData;
      if (x.stageTitle && !seen.has(x.stageTitle.toLowerCase())) {
        seen.set(x.stageTitle.toLowerCase(), {
          title: x.stageTitle,
          subtitle: x.stageSubtitle || "",
          color: x.stageColor || "#0b1b34",
        });
      }
    }
    return Array.from(seen.values());
  }, [nodes]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges],
  );

  const addNode = useCallback(
    (chKey: string) => {
      const id = crypto.randomUUID();
      setNodes((nds) => {
        const i = nds.length;
        const position = { x: 40 + (i % 5) * 300, y: 40 + Math.floor(i / 5) * 240 };
        return nds.concat({ id, type: "marketing", position, data: makeNodeData(chKey) } as Node);
      });
      setSelectedId(id);
    },
    [setNodes],
  );

  const patch = useCallback(
    (patchData: Partial<MarketingNodeData>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...(n.data as MarketingNodeData), ...patchData } } : n)),
      );
    },
    [selectedId, setNodes],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }, [selectedId, setNodes, setEdges]);

  // ── Auto-guardado (debounced) ──
  const snapshot = JSON.stringify({ title, product, nodes, edges });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch(`/api/tools/marketing/${plan.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, product, data: { nodes, edges } }),
      })
        .then((r) => setSaveState(r.ok ? "saved" : "idle"))
        .catch(() => setSaveState("idle"));
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, plan.id]);

  function exportJson() {
    const blob = new Blob([JSON.stringify({ title, product, nodes, edges }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "plan-marketing").replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // checklist helpers
  const addCheck = () => patch({ checklist: [...(d?.checklist ?? []), { id: crypto.randomUUID(), text: "", done: false }] });
  const setCheck = (id: string, p: Partial<{ text: string; done: boolean }>) =>
    patch({ checklist: (d?.checklist ?? []).map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const delCheck = (id: string) => patch({ checklist: (d?.checklist ?? []).filter((c) => c.id !== id) });

  return (
    <div className="mk-root">
      {/* ── Top bar ── */}
      <header className="mk-topbar">
        <Link href="/plataforma/herramientas" className="mk-back" aria-label="Volver a herramientas">
          <ArrowLeft size={18} />
        </Link>
        <div className="mk-titlewrap">
          <input
            className="mk-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del plan"
            aria-label="Nombre del plan"
          />
          <input
            className="mk-product-input"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Producto / servicio / negocio…"
            aria-label="Producto"
          />
        </div>
        <span className={`mk-save mk-save-${saveState}`}>
          {saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado ✓" : "Auto-guardado"}
        </span>
        <button type="button" className="mk-btn" onClick={exportJson}>
          <Download size={15} /> Exportar
        </button>
        <button type="button" className="mk-btn" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir
        </button>
      </header>

      {/* ── Canvas + editor ── */}
      <div className="mk-main">
        <div className="mk-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#dfe5ee" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={(n) => channel((n.data as MarketingNodeData)?.channel)?.color || "#cbd5e1"} />

            {/* Paleta para agregar cards */}
            <Panel position="top-left">
              <div className="mk-palette">
                <div className="mk-palette-title">Agregar paso</div>
                <div className="mk-palette-grid">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.key}
                        type="button"
                        className="mk-palette-btn"
                        title={`${ch.label} — ${ch.hint}`}
                        onClick={() => addNode(ch.key)}
                        style={{ borderColor: `${ch.color}55` }}
                      >
                        <span className="mk-palette-ico" style={{ background: `${ch.color}1a`, color: ch.color }}>
                          <Icon size={15} />
                        </span>
                        <span>{ch.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mk-empty">
                  ← Elige un canal para agregar tu primer paso. Conecta las cards arrastrando de un punto a otro
                  para armar el flujo de lanzamiento.
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ── Panel de edición ── */}
        {selected && d ? (
          <aside className="mk-editor">
            <div className="mk-editor-head">
              <span style={{ fontWeight: 700, fontSize: 14 }}>Editar card</span>
              <button type="button" className="mk-icon-btn" onClick={() => setSelectedId(null)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <Lbl>Canal</Lbl>
            <div className="mk-ch-grid">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const on = d.channel === ch.key;
                return (
                  <button
                    key={ch.key}
                    type="button"
                    className={`mk-ch-pick${on ? " on" : ""}`}
                    title={ch.label}
                    onClick={() => patch({ channel: ch.key })}
                    style={on ? { borderColor: ch.color, background: `${ch.color}14`, color: ch.color } : undefined}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>

            <Lbl>Color de la card</Lbl>
            <div className="mk-swatches">
              <button
                type="button"
                className={`mk-swatch-auto${!d.color ? " on" : ""}`}
                onClick={() => patch({ color: "" })}
                title="Usar el color del canal"
              >
                <span className="mk-swatch-auto-dot" style={{ background: channel(d.channel).color }} />
                Auto
              </button>
              {CARD_COLORS.map((c) => {
                const on = d.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`mk-swatch${on ? " on" : ""}`}
                    style={{ background: c }}
                    onClick={() => patch({ color: c })}
                    aria-label="Color de la card"
                  />
                );
              })}
            </div>

            <Lbl>Etapa del embudo (independiente del ad)</Lbl>
            <input
              style={ed}
              value={d.stageTitle}
              onChange={(e) => patch({ stageTitle: e.target.value })}
              placeholder="Ej. Principal · Calentamiento · Cierre"
            />
            <input
              style={{ ...ed, marginTop: 6 }}
              value={d.stageSubtitle}
              onChange={(e) => patch({ stageSubtitle: e.target.value })}
              placeholder="Subtítulo de la etapa (ej. antes del registro)"
            />
            <div className="mk-swatches">
              {STAGE_COLORS.map((c) => {
                const on = (d.stageColor || "#0b1b34") === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`mk-swatch${on ? " on" : ""}`}
                    style={{ background: c }}
                    onClick={() => patch({ stageColor: c })}
                    aria-label="Color de etapa"
                  />
                );
              })}
              {d.stageTitle ? (
                <button
                  type="button"
                  className="mk-swatch-clear"
                  onClick={() => patch({ stageTitle: "", stageSubtitle: "", stageColor: "" })}
                >
                  Quitar etapa
                </button>
              ) : null}
            </div>
            {existingStages.length > 0 ? (
              <div className="mk-stage-reuse">
                <span className="mk-stage-reuse-lbl">Reusar:</span>
                {existingStages.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="mk-stage-chip"
                    style={{ borderColor: s.color, color: s.color }}
                    onClick={() => patch({ stageTitle: s.title, stageSubtitle: s.subtitle, stageColor: s.color })}
                    title={s.subtitle ? `${s.title} · ${s.subtitle}` : s.title}
                  >
                    <span className="mk-stage-chip-dot" style={{ background: s.color }} />
                    {s.title}
                  </button>
                ))}
              </div>
            ) : null}

            <Lbl>Título</Lbl>
            <input style={ed} value={d.title} onChange={(e) => patch({ title: e.target.value })} placeholder={channel(d.channel).label} />

            <Lbl>Subtítulo</Lbl>
            <input style={ed} value={d.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} placeholder="Una línea de contexto" />

            <Lbl>Descripción</Lbl>
            <textarea style={{ ...ed, minHeight: 64, resize: "vertical" }} value={d.text} onChange={(e) => patch({ text: e.target.value })} placeholder="Qué dice / qué hace este paso" />

            <Lbl>Link / referencia (evento, formulario, checkout, página…)</Lbl>
            <input
              style={ed}
              value={d.linkUrl}
              onChange={(e) => patch({ linkUrl: e.target.value })}
              placeholder="https://… (link de referencia del paso)"
            />

            <Lbl>Estatus</Lbl>
            <div className="mk-status-row">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="mk-status-btn"
                  onClick={() => patch({ status: s.key })}
                  style={
                    d.status === s.key
                      ? { background: s.bg, color: s.color, borderColor: s.color }
                      : undefined
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Lbl>Responsable (quién trabaja)</Lbl>
            <input style={ed} value={d.assignee} onChange={(e) => patch({ assignee: e.target.value })} placeholder="Ej. Diseño · Ana" />

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Lbl>Cuándo</Lbl>
                <input style={ed} value={d.when} onChange={(e) => patch({ when: e.target.value })} placeholder="Día 1 · Lun-Vie" disabled={d.evergreen} />
              </div>
              <div style={{ width: 96 }}>
                <Lbl>Hora</Lbl>
                <input style={ed} value={d.time} onChange={(e) => patch({ time: e.target.value })} placeholder="09:00" disabled={d.evergreen} />
              </div>
            </div>
            <label className="mk-checkrow" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={d.evergreen} onChange={(e) => patch({ evergreen: e.target.checked })} />
              <span>Evergreen (siempre activo)</span>
            </label>

            <Lbl>Checklist</Lbl>
            <div className="mk-checklist">
              {(d.checklist ?? []).map((c) => (
                <div key={c.id} className="mk-checkitem">
                  <input type="checkbox" checked={c.done} onChange={(e) => setCheck(c.id, { done: e.target.checked })} />
                  <input
                    className="mk-check-input"
                    value={c.text}
                    onChange={(e) => setCheck(c.id, { text: e.target.value })}
                    placeholder="Pendiente…"
                    style={c.done ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}
                  />
                  <button type="button" className="mk-icon-btn" onClick={() => delCheck(c.id)} aria-label="Quitar">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="mk-add-check" onClick={addCheck}>
                <Plus size={13} /> Agregar pendiente
              </button>
            </div>

            <Lbl>Imagen (ads, correo…)</Lbl>
            <input style={ed} value={d.imageUrl} onChange={(e) => patch({ imageUrl: e.target.value })} placeholder="https://… o sube un archivo" />
            <MediaUpload onDone={(url) => patch({ imageUrl: url })} />
            {d.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.imageUrl} alt="" className="mk-ed-preview" />
            ) : null}

            <Lbl>Video (YouTube o Vimeo)</Lbl>
            <input style={ed} value={d.videoUrl} onChange={(e) => patch({ videoUrl: e.target.value })} placeholder="https://… (URL de video)" />
            {d.videoUrl ? (
              <div className="mk-ed-preview-video">
                <VideoThumb url={d.videoUrl} height={120} />
              </div>
            ) : null}

            <button type="button" className="mk-delete" onClick={removeSelected}>
              <Trash2 size={15} /> Eliminar card
            </button>
          </aside>
        ) : null}
      </div>

      {/* ── Vista imprimible (solo @media print) ── */}
      <div className="mk-print">
        <h1>{title}</h1>
        {product ? <p className="mk-print-product">Producto / negocio: {product}</p> : null}
        <ol>
          {nodes.map((n) => {
            const x = n.data as MarketingNodeData;
            const ch = channel(x.channel);
            const st = statusMeta(x.status);
            return (
              <li key={n.id} className="mk-print-item">
                <div className="mk-print-h">
                  <strong>{x.title || ch.label}</strong> · {ch.label} · [{st.label}]
                  {x.assignee ? ` · ${x.assignee}` : ""}
                  {x.evergreen ? " · Evergreen" : x.when || x.time ? ` · ${[x.when, x.time].filter(Boolean).join(" ")}` : ""}
                </div>
                {x.subtitle ? <div className="mk-print-sub">{x.subtitle}</div> : null}
                {x.text ? <div>{x.text}</div> : null}
                {x.linkUrl ? <div className="mk-print-link">🔗 {x.linkUrl}</div> : null}
                {(x.checklist ?? []).length > 0 ? (
                  <ul>
                    {x.checklist.map((c) => (
                      <li key={c.id}>{c.done ? "☑" : "☐"} {c.text}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

const ed: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13.5,
  fontFamily: "var(--font-sans)",
  background: "white",
  color: "var(--ink)",
  outline: "none",
};

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--muted)", margin: "14px 0 5px", textTransform: "uppercase" }}
    >
      {children}
    </div>
  );
}

/** Botón para subir una imagen a R2 y devolver su URL pública. */
function MediaUpload({ onDone }: { onDone: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tools/upload", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error || "No se pudo subir");
      onDone(j.url);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mk-upload">
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={pick} />
      <button type="button" className="mk-upload-btn" onClick={() => ref.current?.click()} disabled={busy}>
        <Upload size={13} /> {busy ? "Subiendo…" : "Subir imagen"}
      </button>
      {err ? <span className="mk-upload-err">{err}</span> : null}
    </div>
  );
}
