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
  useReactFlow,
  addEdge,
  reconnectEdge,
  MarkerType,
  SelectionMode,
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
  makeTimeData,
  parseVideo,
  TIME_UNITS,
  timeUnit,
  timeLabel,
  type MarketingNodeData,
  type TimeNodeData,
} from "@/lib/marketing";
import { apiErrorMessage } from "@/lib/apiError";
import { MarketingNode } from "./MarketingNode";
import { TimeNode } from "./TimeNode";
import { VideoThumb } from "./VideoThumb";
import { Plus, Trash2, X, Download, Printer, ArrowLeft, Check, Upload, Clock, Hand, BoxSelect, Copy } from "lucide-react";

const nodeTypes = { marketing: MarketingNode, tiempo: TimeNode };

/** Estilo de las conexiones: animadas (origen → destino) + flecha al final. */
const EDGE_OPTS = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 2 },
};

/** Mapea handles de versiones anteriores al esquema actual (s-/t- por lado). */
function normHandle(h: string | null | undefined, kind: "source" | "target"): string {
  if (h && /^[st]-(top|right|bottom|left)$/.test(h)) return h;
  const side = h && /^(top|right|bottom|left)$/.test(h) ? h : kind === "source" ? "bottom" : "top";
  return `${kind === "source" ? "s" : "t"}-${side}`;
}

/** Normaliza una edge guardada: estilo + handles válidos. */
function normEdge(e: Edge): Edge {
  return {
    ...e,
    ...EDGE_OPTS,
    sourceHandle: normHandle(e.sourceHandle, "source"),
    targetHandle: normHandle(e.targetHandle, "target"),
  };
}

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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    (((plan.data?.edges as Edge[]) ?? []).map(normEdge)) as Edge[]
  );
  const [title, setTitle] = useState(plan.title);
  const [product, setProduct] = useState(plan.product ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");
  const [selectMode, setSelectMode] = useState(false);

  const rf = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const addSeq = useRef(0);

  /** Posición para un paso nuevo: centro de lo que el usuario está viendo. */
  const spawnPos = useCallback(
    (w: number, h: number) => {
      let cx = 0;
      let cy = 0;
      const el = canvasRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const p = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        cx = p.x;
        cy = p.y;
      }
      const k = addSeq.current++ % 6; // pequeño cascadeo para que no se encimen
      return { x: cx - w / 2 + k * 26, y: cy - h / 2 + k * 26 };
    },
    [rf],
  );

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const isTime = selected?.type === "tiempo";
  const d = selected && !isTime ? (selected.data as MarketingNodeData) : null;
  const td = selected && isTime ? (selected.data as TimeNodeData) : null;

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
    (c: Connection) => setEdges((eds) => addEdge({ ...c, ...EDGE_OPTS }, eds)),
    [setEdges],
  );

  // Re-rutear una conexión: arrastra un extremo a otro nodo.
  // Si se suelta en el vacío, se elimina.
  const reconnectOk = useRef(true);
  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false;
  }, []);
  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) => {
      reconnectOk.current = true;
      setEdges((els) => reconnectEdge({ ...oldEdge, ...EDGE_OPTS }, newConn, els));
    },
    [setEdges],
  );
  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      if (!reconnectOk.current) setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      reconnectOk.current = true;
    },
    [setEdges],
  );

  const removeSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges]);

  const addNode = useCallback(
    (chKey: string) => {
      const id = crypto.randomUUID();
      const position = spawnPos(244, 140);
      setNodes((nds) => nds.concat({ id, type: "marketing", position, data: makeNodeData(chKey) } as Node));
      setSelectedId(id);
    },
    [setNodes, spawnPos],
  );

  const addTime = useCallback(() => {
    const id = crypto.randomUUID();
    const position = spawnPos(78, 78);
    setNodes((nds) => nds.concat({ id, type: "tiempo", position, data: makeTimeData() } as Node));
    setSelectedId(id);
  }, [setNodes, spawnPos]);

  const patch = useCallback(
    (patchData: Partial<MarketingNodeData>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...(n.data as MarketingNodeData), ...patchData } } : n)),
      );
    },
    [selectedId, setNodes],
  );

  const patchTime = useCallback(
    (patchData: Partial<TimeNodeData>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...(n.data as TimeNodeData), ...patchData } } : n)),
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

  // Duplicar la card/tiempo seleccionada (mismo contenido, junto a la original).
  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((nds) => {
      const src = nds.find((n) => n.id === selectedId);
      if (!src) return nds;
      const id = crypto.randomUUID();
      const data = JSON.parse(JSON.stringify(src.data ?? {}));
      // Regenerar ids del checklist para no duplicarlos.
      if (Array.isArray(data.checklist)) {
        data.checklist = data.checklist.map((c: { text: string; done: boolean }) => ({
          id: crypto.randomUUID(),
          text: c.text,
          done: c.done,
        }));
      }
      const position = { x: (src.position?.x ?? 0) + 36, y: (src.position?.y ?? 0) + 36 };
      const copy = { ...src, id, position, selected: false, data } as Node;
      // Marcar el nuevo como seleccionado tras crearlo.
      queueMicrotask(() => setSelectedId(id));
      return nds.concat(copy);
    });
  }, [selectedId, setNodes]);

  // ── Auto-guardado (debounced) ──
  const snapshot = JSON.stringify({ title, product, nodes, edges });
  const first = useRef(true);
  const pendingBody = useRef<string | null>(null); // último payload sin confirmar en el server
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Título vacío se omite: el server pone "Plan de marketing" por default.
    const body = JSON.stringify({ title: title.trim() || undefined, product, data: { nodes, edges } });
    pendingBody.current = body;
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch(`/api/tools/marketing/${plan.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body,
      })
        .then(async (r) => {
          if (r.ok) {
            if (pendingBody.current === body) pendingBody.current = null;
            setSaveState("saved");
            return;
          }
          const j = await r.json().catch(() => null);
          setSaveState("error");
          setSaveErr(
            r.status === 401 ? "Tu sesión expiró — vuelve a iniciar sesión" : apiErrorMessage(j, "No se pudo guardar"),
          );
        })
        .catch(() => {
          setSaveState("error");
          setSaveErr("Sin conexión — no se pudo guardar");
        });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, plan.id]);

  // Flush al desmontar (← Volver, navegación): manda el guardado pendiente que el debounce canceló.
  useEffect(() => {
    return () => {
      if (!pendingBody.current) return;
      fetch(`/api/tools/marketing/${plan.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: pendingBody.current,
        keepalive: true,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            maxLength={160}
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
        <span
          className={`mk-save mk-save-${saveState}`}
          style={saveState === "error" ? { color: "#dc2626", fontWeight: 700 } : undefined}
          role={saveState === "error" ? "alert" : undefined}
        >
          {saveState === "saving"
            ? "Guardando…"
            : saveState === "saved"
              ? "Guardado ✓"
              : saveState === "error"
                ? `⚠ ${saveErr}`
                : "Auto-guardado"}
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
        <div className="mk-canvas" ref={canvasRef}>
          <ReactFlow
            className={selectMode ? "mk-rf-select" : undefined}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onNodeClick={(_, n) => {
              setSelectedId(n.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, e) => {
              setSelectedEdgeId(e.id);
              setSelectedId(null);
            }}
            onPaneClick={() => {
              setSelectedId(null);
              setSelectedEdgeId(null);
            }}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={EDGE_OPTS}
            edgesReconnectable
            deleteKeyCode={["Delete", "Backspace"]}
            selectionOnDrag={selectMode}
            panOnDrag={selectMode ? [1, 2] : true}
            selectionMode={SelectionMode.Partial}
            selectNodesOnDrag={false}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#dfe5ee" />
            <Controls showInteractive={false} />

            {/* Herramienta: mover lienzo vs seleccionar varias */}
            <Panel position="top-right">
              <div className="mk-tools">
                <button
                  type="button"
                  className={`mk-tool${!selectMode ? " on" : ""}`}
                  onClick={() => setSelectMode(false)}
                  title="Mover: arrastra para desplazar el lienzo"
                >
                  <Hand size={15} /> Mover
                </button>
                <button
                  type="button"
                  className={`mk-tool${selectMode ? " on" : ""}`}
                  onClick={() => setSelectMode(true)}
                  title="Seleccionar: arrastra un recuadro para elegir varias cards y moverlas juntas"
                >
                  <BoxSelect size={15} /> Seleccionar
                </button>
              </div>
            </Panel>
            <MiniMap
              pannable
              zoomable
              className="mk-minimap"
              nodeClassName="mk-minimap-node"
              nodeColor={(n) => {
                if (n.type === "tiempo") return "#475569";
                const d = n.data as MarketingNodeData;
                return d?.color || channel(d?.channel)?.color || "#cbd5e1";
              }}
              nodeStrokeColor="#ffffff"
              nodeStrokeWidth={3}
              nodeBorderRadius={6}
              maskColor="rgba(15,27,52,0.10)"
              maskStrokeColor="#94a3b8"
              maskStrokeWidth={1.5}
              bgColor="#f8fafc"
            />

            {/* Estado de la conexión seleccionada */}
            {selectedEdgeId ? (
              <Panel position="top-center">
                <div className="mk-edge-bar">
                  <span className="mk-edge-bar-dot" />
                  <span className="mk-edge-bar-txt">Conexión seleccionada</span>
                  <span className="mk-edge-bar-hint">Arrastra un extremo a otro nodo para cambiar el rumbo</span>
                  <button type="button" className="mk-edge-bar-del" onClick={removeSelectedEdge}>
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </Panel>
            ) : null}

            {/* Paleta para agregar cards */}
            <Panel position="top-left">
              <div className="mk-palette">
                <div className="mk-palette-title">Agregar paso</div>
                <button type="button" className="mk-palette-time" onClick={addTime} title="Tiempo de espera entre pasos (ej. 1D, 5HR)">
                  <span className="mk-palette-time-ico">
                    <Clock size={15} />
                  </span>
                  <span>Tiempo de espera</span>
                </button>
                <div className="mk-palette-sep" />
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

        {/* ── Panel de edición: TIEMPO ── */}
        {selected && td ? (
          <aside className="mk-editor">
            <div className="mk-editor-head">
              <span style={{ fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Clock size={15} /> Tiempo de espera
              </span>
              <button type="button" className="mk-icon-btn" onClick={() => setSelectedId(null)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <Lbl>Cantidad</Lbl>
            <input
              style={ed}
              type="number"
              min={1}
              value={td.amount}
              onChange={(e) => patchTime({ amount: Math.max(1, parseInt(e.target.value || "1", 10) || 1) })}
            />

            <Lbl>Unidad</Lbl>
            <div className="mk-status-row">
              {TIME_UNITS.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  className="mk-status-btn"
                  onClick={() => patchTime({ unit: u.key })}
                  style={td.unit === u.key ? { background: "#e2e8f0", color: "#0b1b34", borderColor: "#475569" } : undefined}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <Lbl>Nota (opcional)</Lbl>
            <input
              style={ed}
              value={td.note}
              onChange={(e) => patchTime({ note: e.target.value })}
              placeholder="Ej. antes del webinar · recordatorio"
            />

            <div className="mk-time-preview">
              Se verá: <strong>{td.amount}{timeUnit(td.unit).abbr}</strong> de espera
            </div>

            <div className="mk-ed-actions">
              <button type="button" className="mk-dup" onClick={duplicateSelected}>
                <Copy size={14} /> Duplicar
              </button>
              <button type="button" className="mk-delete" onClick={removeSelected}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </aside>
        ) : null}

        {/* ── Panel de edición: CARD ── */}
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
                  <textarea
                    className="mk-check-input"
                    rows={1}
                    value={c.text}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    onChange={(e) => {
                      setCheck(c.id, { text: e.target.value });
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
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
              parseVideo(d.imageUrl).kind !== "other" ? (
                <div className="mk-ed-preview-video">
                  <VideoThumb url={d.imageUrl} height={120} />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={d.imageUrl}
                  src={d.imageUrl}
                  alt=""
                  className="mk-ed-preview"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )
            ) : null}

            <Lbl>Video (YouTube o Vimeo)</Lbl>
            <input style={ed} value={d.videoUrl} onChange={(e) => patch({ videoUrl: e.target.value })} placeholder="https://… (URL de video)" />
            {d.videoUrl ? (
              <div className="mk-ed-preview-video">
                <VideoThumb url={d.videoUrl} height={120} />
              </div>
            ) : null}

            <div className="mk-ed-actions">
              <button type="button" className="mk-dup" onClick={duplicateSelected}>
                <Copy size={14} /> Duplicar card
              </button>
              <button type="button" className="mk-delete" onClick={removeSelected}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {/* ── Vista imprimible (solo @media print) ── */}
      <div className="mk-print">
        <h1>{title}</h1>
        {product ? <p className="mk-print-product">Producto / negocio: {product}</p> : null}
        <ol>
          {nodes.map((n) => {
            if (n.type === "tiempo") {
              const t = n.data as TimeNodeData;
              return (
                <li key={n.id} className="mk-print-item">
                  <div className="mk-print-h">
                    ⏱ {timeLabel(t)} de espera{t.note ? ` · ${t.note}` : ""}
                  </div>
                </li>
              );
            }
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
