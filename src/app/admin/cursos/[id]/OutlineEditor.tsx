"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage } from "@/lib/apiError";
import type { ModuleRow, LessonRow, Program } from "./CursoEditorClient";

/**
 * Outline editor — vista unificada de la estructura del curso.
 *
 * Reemplaza los tabs separados "Módulos" y "Lecciones" por un solo árbol
 * jerárquico estilo Notion/Teachable: el creator ve TODO el menú del curso
 * de un vistazo, expande módulos para revelar lecciones, arrastra para
 * reordenar (o mover lecciones entre módulos), y agrega contenido inline
 * sin abrir modales.
 *
 * Drag & drop: nativo HTML5. Los items son draggables; los containers
 * (módulos para lecciones, root para módulos) escuchan drop. Mientras
 * arrastras, mostramos guías visuales (línea dorada antes/después del
 * target).
 *
 * Quick-add inline: cada módulo expandido tiene un input "+ Agregar
 * lección" al final que crea con título mínimo y abre el dialog detallado
 * solo si el admin lo decide. Igual al nivel raíz para módulos.
 *
 * Edición detallada: click en un item abre el dialog que ya existe
 * (ModuleDialog / LessonDialog). No reescribimos el editor — lo reusamos.
 */

export type OutlineItem = ModuleRow & { lessons: LessonRow[] };

export function OutlineEditor({
  program,
  modules,
  lessons,
  onEditModule,
  onEditLesson,
  onAddModule,
  onAddLessonToModule,
  onChanged,
}: {
  program: Program;
  modules: ModuleRow[];
  lessons: LessonRow[];
  onEditModule: (m: ModuleRow) => void;
  onEditLesson: (l: LessonRow) => void;
  onAddModule: () => void;
  onAddLessonToModule: (moduleId: string) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  // Build local tree from props, but also allow optimistic reorders.
  const initialTree = useMemo(() => buildTree(modules, lessons), [modules, lessons]);
  const [tree, setTree] = useState<OutlineItem[]>(initialTree);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand all by default — creator wants to SEE the whole outline.
    return new Set(modules.map((m) => m.id));
  });
  // Re-sync local tree if props change (after a save/refresh).
  useEffect(() => {
    setTree(buildTree(modules, lessons));
  }, [modules, lessons]);

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [quickModuleTitle, setQuickModuleTitle] = useState("");
  const [quickLessonByModule, setQuickLessonByModule] = useState<Record<string, string>>({});

  /* ─────────── Toggle expand ─────────── */
  function toggleExpand(mid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid);
      else next.add(mid);
      return next;
    });
  }
  function expandAll() {
    setExpanded(new Set(tree.map((m) => m.id)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  /* ─────────── Drag & drop ─────────── */
  function onDragStart(e: React.DragEvent, info: DragInfo) {
    setDragInfo(info);
    e.dataTransfer.effectAllowed = "move";
    // Set drag image to be the item itself.
    e.dataTransfer.setData("text/plain", info.type === "module" ? info.moduleId : info.lessonId);
  }
  function onDragOver(e: React.DragEvent, target: DropTarget) {
    e.preventDefault();
    if (!dragInfo) return;
    // Validate: can't drop module on lesson, can't drop lesson on root.
    if (dragInfo.type === "module" && target.kind !== "module") return;
    if (dragInfo.type === "lesson" && target.kind !== "lesson" && target.kind !== "module-end") return;
    setDropTarget(target);
  }
  function onDragLeave() {
    // Don't clear too eagerly; let dragover re-trigger.
  }
  async function onDrop() {
    if (!dragInfo || !dropTarget) {
      setDragInfo(null);
      setDropTarget(null);
      return;
    }
    const next = applyDrop(tree, dragInfo, dropTarget);
    // Si movimos una lección a otro módulo, expándelo para ver el resultado.
    if (dragInfo.type === "lesson" && "moduleId" in dropTarget && dropTarget.moduleId) {
      const destMod = dropTarget.moduleId;
      setExpanded((prev) => new Set(prev).add(destMod));
    }
    setDragInfo(null);
    setDropTarget(null);
    if (!next) return;
    setTree(next);
    // Persist
    setPersisting(true);
    try {
      const res = await fetch(`/api/admin/programs/${program.id}/reorder`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modules: next.map((m, i) => ({
            id: m.id,
            sortOrder: i,
            lessonIds: m.lessons.map((l) => l.id),
          })),
        }),
      });
      if (!res.ok) throw new Error("Error al guardar el orden");
      toast.success("Orden actualizado");
      onChanged(); // server-refresh to sync IDs
    } catch (e) {
      toast.error((e as Error).message || "No se pudo guardar el orden");
      // Revert
      setTree(initialTree);
    } finally {
      setPersisting(false);
    }
  }
  function onDragEnd() {
    setDragInfo(null);
    setDropTarget(null);
  }

  /* ─────────── Quick add ─────────── */
  // Convierte el JSON de error de Zod en un mensaje legible (campo: motivo).
  function humanize(j: { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> }): string {
    return apiErrorMessage(j, "No se pudo guardar");
  }

  async function quickAddModule() {
    const title = quickModuleTitle.trim();
    if (!title) return;
    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          code: `M${String(tree.length + 1).padStart(2, "0")}`,
          title,
          sortOrder: tree.length,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(humanize(j));
      }
      setQuickModuleTitle("");
      toast.success("Módulo agregado");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function quickAddLesson(mid: string) {
    const title = (quickLessonByModule[mid] || "").trim();
    if (!title) return;
    const mod = tree.find((m) => m.id === mid);
    const order = mod?.lessons.length ?? 0;
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moduleId: mid,
          code: `L${order + 1}`,
          title,
          kind: "video", // por default video, admin puede cambiar después
          sortOrder: order,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(humanize(j));
      }
      setQuickLessonByModule((p) => ({ ...p, [mid]: "" }));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  /* ─────────── Delete ─────────── */
  async function deleteModule(m: ModuleRow) {
    const ok = await confirm({
      title: `¿Eliminar "${m.title}"?`,
      description: "Se borrarán también sus lecciones. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/modules/${m.id}`, { method: "DELETE" });
    if (res.ok) onChanged();
    else toast.error("No se pudo eliminar el módulo");
  }
  async function deleteLesson(l: LessonRow) {
    const ok = await confirm({
      title: `¿Eliminar "${l.title}"?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/lessons/${l.id}`, { method: "DELETE" });
    if (res.ok) onChanged();
    else toast.error("No se pudo eliminar la lección");
  }

  /* ─────────── Render ─────────── */
  const totalLessons = tree.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Header */}
      <div className="between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", fontWeight: 700 }}>
            ESTRUCTURA DEL CURSO
          </div>
          <h2
            className="serif"
            style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--navy)" }}
          >
            {tree.length} {tree.length === 1 ? "módulo" : "módulos"} · {totalLessons} lecciones
          </h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Arrastra para reordenar. Click para editar detalles. Las lecciones se mueven entre módulos arrastrándolas.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={collapseAll}
            className="mono"
            style={miniBtn()}
          >
            ↑ Contraer
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="mono"
            style={miniBtn()}
          >
            ↓ Expandir
          </button>
          {persisting && (
            <span className="mono" style={{ fontSize: 11, color: "var(--gold-deep)", padding: "6px 8px" }}>
              ⟳ guardando…
            </span>
          )}
        </div>
      </div>

      {/* Tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} onDragEnd={onDragEnd}>
        {tree.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              border: "1px dashed rgba(216,168,63,0.30)",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--gold) 4%, white)",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Tu curso está vacío. Agrega el primer módulo abajo o usa los botones ✨ de generación con IA.
          </div>
        )}

        {tree.map((m, mi) => {
          const isExpanded = expanded.has(m.id);
          const dragTargetHere =
            dropTarget?.kind === "module" && dropTarget.moduleId === m.id;
          // Una lección se está soltando dentro de este módulo (header o zona final).
          const lessonDropHere =
            dragInfo?.type === "lesson" && dropTarget?.kind === "module-end" && dropTarget.moduleId === m.id;
          return (
            <div key={m.id} style={{ position: "relative" }}>
              {/* Drop guide above module */}
              {dragTargetHere && dropTarget.position === "before" && <DropLine />}

              {/* MODULE row */}
              <div
                draggable={dragInfo?.type !== "lesson"}
                onDragStart={(e) => onDragStart(e, { type: "module", moduleId: m.id })}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!dragInfo) return;
                  // Arrastrar una lección sobre el módulo = moverla a ese módulo.
                  if (dragInfo.type === "lesson") {
                    onDragOver(e, { kind: "module-end", moduleId: m.id });
                    return;
                  }
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const pos: "before" | "after" =
                    e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                  onDragOver(e, { kind: "module", moduleId: m.id, position: pos });
                }}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 32px auto 1fr auto auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: lessonDropHere ? "color-mix(in srgb, var(--gold) 12%, white)" : "white",
                  border: `1.5px solid ${
                    lessonDropHere ? "var(--gold)" : isExpanded ? "rgba(216,168,63,0.35)" : "var(--line)"
                  }`,
                  borderRadius: 12,
                  cursor: dragInfo?.type === "module" && dragInfo.moduleId === m.id ? "grabbing" : "grab",
                  boxShadow:
                    dragInfo?.type === "module" && dragInfo.moduleId === m.id
                      ? "0 12px 24px rgba(10,30,58,0.18)"
                      : "0 2px 6px rgba(10,30,58,0.04)",
                  opacity: dragInfo?.type === "module" && dragInfo.moduleId === m.id ? 0.6 : 1,
                  transition: "border-color 0.12s",
                }}
              >
                <DragHandle />
                <button
                  type="button"
                  onClick={() => toggleExpand(m.id)}
                  style={chevronBtn(isExpanded)}
                  aria-label={isExpanded ? "Contraer" : "Expandir"}
                  aria-expanded={isExpanded}
                >
                  ▸
                </button>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 7px",
                    borderRadius: 4,
                    background: m.isBig ? "color-mix(in srgb, #8067D8 18%, white)" : "color-mix(in srgb, var(--gold) 18%, white)",
                    color: m.isBig ? "#8067D8" : "var(--gold-deep)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {m.code}
                </span>
                <button
                  type="button"
                  onClick={() => onEditModule(m)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--navy)",
                    textAlign: "left",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title="Editar módulo"
                >
                  {m.title}
                </button>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {m.lessons.length} {m.lessons.length === 1 ? "lección" : "lecciones"}
                  {m.weekLabel ? ` · ${m.weekLabel}` : ""}
                </span>
                <div className="row" style={{ gap: 4 }}>
                  <IconButton title="Editar" onClick={() => onEditModule(m)}>
                    ✎
                  </IconButton>
                  <IconButton title="Eliminar" tone="danger" onClick={() => deleteModule(m)}>
                    🗑
                  </IconButton>
                </div>
              </div>

              {/* Drop guide after module (if drag is happening over the gap) */}
              {dragTargetHere && dropTarget.position === "after" && <DropLine />}

              {/* LESSONS (expanded) */}
              {isExpanded && (
                <div
                  style={{
                    paddingLeft: 32,
                    marginTop: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {m.lessons.length === 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        padding: "8px 12px",
                        fontStyle: "italic",
                      }}
                    >
                      Aún no hay lecciones. Agrega una abajo.
                    </div>
                  )}

                  {m.lessons.map((l, li) => {
                    const isThisDragged = dragInfo?.type === "lesson" && dragInfo.lessonId === l.id;
                    const dropOnThisLesson =
                      dropTarget?.kind === "lesson" &&
                      dropTarget.moduleId === m.id &&
                      dropTarget.lessonId === l.id;
                    return (
                      <div key={l.id} style={{ position: "relative" }}>
                        {dropOnThisLesson && dropTarget.position === "before" && <DropLine inset />}
                        <div
                          draggable
                          onDragStart={(e) =>
                            onDragStart(e, { type: "lesson", lessonId: l.id, fromModuleId: m.id })
                          }
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!dragInfo || dragInfo.type !== "lesson") return;
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const pos: "before" | "after" =
                              e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                            onDragOver(e, { kind: "lesson", moduleId: m.id, lessonId: l.id, position: pos });
                          }}
                          onDragLeave={onDragLeave}
                          onDrop={onDrop}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px 22px auto 1fr auto auto",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            background: "var(--bg-2)",
                            borderRadius: 8,
                            border: "1px solid transparent",
                            cursor: isThisDragged ? "grabbing" : "grab",
                            opacity: isThisDragged ? 0.4 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(216,168,63,0.40)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <DragHandle small />
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              background:
                                l.kind === "video"
                                  ? "color-mix(in srgb, #6366f1 18%, white)"
                                  : "color-mix(in srgb, #2BB8A7 18%, white)",
                              color: l.kind === "video" ? "#4f46e5" : "#0f766e",
                              fontSize: 9,
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "var(--font-mono)",
                            }}
                            title={l.kind === "video" ? "Video" : "Quiz"}
                          >
                            {l.kind === "video" ? "▶" : "?"}
                          </span>
                          <span
                            className="mono"
                            style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}
                          >
                            {l.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEditLesson(l)}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                              textAlign: "left",
                              cursor: "pointer",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title="Editar lección"
                          >
                            {l.title}
                          </button>
                          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                            +{l.xpReward} XP
                          </span>
                          <div className="row" style={{ gap: 4 }}>
                            <IconButton title="Editar" onClick={() => onEditLesson(l)}>
                              ✎
                            </IconButton>
                            <IconButton title="Eliminar" tone="danger" onClick={() => deleteLesson(l)}>
                              🗑
                            </IconButton>
                          </div>
                        </div>
                        {dropOnThisLesson && dropTarget.position === "after" && <DropLine inset />}
                      </div>
                    );
                  })}

                  {/* Drop zone "module-end" so you can drop a lesson at the bottom of an empty/short module */}
                  {dragInfo?.type === "lesson" ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        onDragOver(e, { kind: "module-end", moduleId: m.id });
                      }}
                      onDrop={onDrop}
                      style={{
                        minHeight: 32,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: lessonDropHere ? "var(--gold-deep)" : "var(--muted)",
                        border: `1.5px dashed ${lessonDropHere ? "var(--gold)" : "rgba(216,168,63,0.35)"}`,
                        background: lessonDropHere ? "color-mix(in srgb, var(--gold) 14%, white)" : "transparent",
                        transition: "all 0.12s",
                      }}
                    >
                      Soltar aquí para mover a este módulo
                    </div>
                  ) : null}

                  {/* Quick add lesson */}
                  <div className="row" style={{ gap: 8, marginTop: 2, padding: "4px 0" }}>
                    <input
                      value={quickLessonByModule[m.id] ?? ""}
                      onChange={(e) =>
                        setQuickLessonByModule((p) => ({ ...p, [m.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          quickAddLesson(m.id);
                        }
                      }}
                      placeholder="+ Agregar lección (Enter para guardar)"
                      style={quickInput()}
                    />
                    <button
                      type="button"
                      onClick={() => onAddLessonToModule(m.id)}
                      style={editorBtn()}
                      title="Crear lección con editor completo"
                    >
                      ⚙ Detalles
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Quick add module at the bottom */}
        <div
          style={{
            marginTop: 12,
            padding: 14,
            border: "1px dashed rgba(216,168,63,0.40)",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--gold) 4%, white)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            value={quickModuleTitle}
            onChange={(e) => setQuickModuleTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                quickAddModule();
              }
            }}
            placeholder="+ Agregar módulo (escribe el título y pulsa Enter)"
            style={quickInput()}
          />
          <button type="button" onClick={onAddModule} style={editorBtn()}>
            ⚙ Detalles
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Helpers de drag tree ─────────── */
type DragInfo =
  | { type: "module"; moduleId: string }
  | { type: "lesson"; lessonId: string; fromModuleId: string };

type DropTarget =
  | { kind: "module"; moduleId: string; position: "before" | "after" }
  | { kind: "lesson"; moduleId: string; lessonId: string; position: "before" | "after" }
  | { kind: "module-end"; moduleId: string };

function buildTree(modules: ModuleRow[], lessons: LessonRow[]): OutlineItem[] {
  const byModule = new Map<string, LessonRow[]>();
  for (const l of [...lessons].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const arr = byModule.get(l.moduleId) ?? [];
    arr.push(l);
    byModule.set(l.moduleId, arr);
  }
  return [...modules]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({ ...m, lessons: byModule.get(m.id) ?? [] }));
}

function applyDrop(tree: OutlineItem[], drag: DragInfo, target: DropTarget): OutlineItem[] | null {
  const clone = tree.map((m) => ({ ...m, lessons: [...m.lessons] }));
  if (drag.type === "module" && target.kind === "module") {
    const fromIdx = clone.findIndex((m) => m.id === drag.moduleId);
    let toIdx = clone.findIndex((m) => m.id === target.moduleId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null;
    const [moved] = clone.splice(fromIdx, 1);
    if (!moved) return null;
    if (fromIdx < toIdx) toIdx -= 1;
    const insertAt = target.position === "before" ? toIdx : toIdx + 1;
    clone.splice(insertAt, 0, moved);
    return clone;
  }
  if (drag.type === "lesson" && (target.kind === "lesson" || target.kind === "module-end")) {
    const fromMod = clone.find((m) => m.id === drag.fromModuleId);
    if (!fromMod) return null;
    const lessonIdx = fromMod.lessons.findIndex((l) => l.id === drag.lessonId);
    if (lessonIdx < 0) return null;
    const [moved] = fromMod.lessons.splice(lessonIdx, 1);
    if (!moved) return null;

    if (target.kind === "module-end") {
      const toMod = clone.find((m) => m.id === target.moduleId);
      if (!toMod) return null;
      toMod.lessons.push({ ...moved, moduleId: toMod.id });
      return clone;
    }
    // target is "lesson"
    const toMod = clone.find((m) => m.id === target.moduleId);
    if (!toMod) return null;
    let idx = toMod.lessons.findIndex((l) => l.id === target.lessonId);
    if (idx < 0) return null;
    if (target.position === "after") idx += 1;
    toMod.lessons.splice(idx, 0, { ...moved, moduleId: toMod.id });
    return clone;
  }
  return null;
}

/* ─────────── Small UI helpers ─────────── */
function DragHandle({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        color: "var(--muted)",
        fontSize: small ? 12 : 14,
        cursor: "grab",
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      ⋮⋮
    </span>
  );
}

function DropLine({ inset }: { inset?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        height: 3,
        background: "linear-gradient(90deg, var(--gold-deep) 0%, #F2C65A 50%, var(--gold-deep) 100%)",
        borderRadius: 2,
        margin: inset ? "1px 8px" : "2px 0",
        boxShadow: "0 0 8px rgba(216,168,63,0.5)",
      }}
    />
  );
}

function IconButton({
  children,
  onClick,
  title,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid transparent",
        background: "transparent",
        color: tone === "danger" ? "var(--red)" : "var(--muted)",
        cursor: "pointer",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.12s, border-color 0.12s",
      }}
      onMouseEnter={(e) => {
        if (tone === "danger") {
          e.currentTarget.style.background = "color-mix(in srgb, var(--red) 10%, white)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--red) 30%, white)";
        } else {
          e.currentTarget.style.background = "var(--bg-2)";
          e.currentTarget.style.borderColor = "var(--line)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function chevronBtn(open: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    border: "none",
    background: "transparent",
    color: "var(--muted)",
    fontSize: 11,
    cursor: "pointer",
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function miniBtn(): React.CSSProperties {
  return {
    padding: "5px 10px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    background: "white",
    border: "1px solid var(--line-2)",
    color: "var(--ink-2)",
    borderRadius: 6,
    cursor: "pointer",
  };
}

function quickInput(): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "white",
  };
}

function editorBtn(): React.CSSProperties {
  return {
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    background: "var(--navy)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
  };
}
