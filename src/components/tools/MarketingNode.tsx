"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { channel, status, linkHost, linkHref, parseVideo, type MarketingNodeData } from "@/lib/marketing";
import { Image as ImageIcon, Clock, User, CheckSquare, Infinity as InfinityIcon, Link2 } from "lucide-react";
import { VideoThumb } from "./VideoThumb";

/** Los 4 lados de la card, cada uno con salida (source) y entrada (target). */
const HANDLE_SIDES = [
  { pos: Position.Top, key: "top" },
  { pos: Position.Right, key: "right" },
  { pos: Position.Bottom, key: "bottom" },
  { pos: Position.Left, key: "left" },
] as const;

/** Card de un paso del plan (nodo del canvas). */
export function MarketingNode({ data, selected }: NodeProps) {
  const d = data as MarketingNodeData;
  const ch = channel(d.channel);
  const st = status(d.status);
  const Icon = ch.icon;
  const cardColor = d.color || ch.color; // identidad editable de la card
  const stageColor = d.stageColor || "#0b1b34";
  const done = d.checklist?.filter((c) => c.done).length ?? 0;
  const total = d.checklist?.length ?? 0;

  return (
    <div
      className="mk-node"
      style={{
        borderColor: selected ? cardColor : "var(--line)",
        boxShadow: selected
          ? `0 0 0 2px ${cardColor}40, 0 10px 26px rgba(15,17,21,0.12)`
          : "0 6px 18px rgba(15,17,21,0.07)",
      }}
    >
      {/* Zona de entrada (target) — invisible y amplia — detrás del punto */}
      {HANDLE_SIDES.map((s) => (
        <Handle key={`t-${s.key}`} type="target" id={`t-${s.key}`} position={s.pos} className="mk-handle mk-handle-target" />
      ))}
      {/* Punto visible de salida (source) — se jala para sacar la flecha */}
      {HANDLE_SIDES.map((s) => (
        <Handle key={`s-${s.key}`} type="source" id={`s-${s.key}`} position={s.pos} className="mk-handle mk-handle-source" />
      ))}

      {/* ETAPA: punto identificador (NO toma el color de la card) */}
      {d.stageTitle ? (
        <div className="mk-node-stage">
          <span className="mk-node-stage-dot" style={{ background: stageColor }} />
          <span className="mk-node-stage-t">{d.stageTitle}</span>
          {d.stageSubtitle ? <span className="mk-node-stage-s">· {d.stageSubtitle}</span> : null}
        </div>
      ) : null}

      <div className="mk-node-head" style={{ background: cardColor }}>
        <span className="mk-node-ch">
          <Icon size={13} strokeWidth={2.2} /> {ch.short}
        </span>
        <span className="mk-node-status" style={{ background: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>

      <div className="mk-node-body">
        <div className="mk-node-title">{d.title || ch.label}</div>
        {d.subtitle ? <div className="mk-node-sub">{d.subtitle}</div> : null}
        {d.text ? <div className="mk-node-text">{d.text}</div> : null}

        {d.linkUrl ? (
          <a
            className="mk-node-link"
            href={linkHref(d.linkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={d.linkUrl}
          >
            <Link2 size={12} /> {linkHost(d.linkUrl)}
          </a>
        ) : null}

        {d.imageUrl ? (
          parseVideo(d.imageUrl).kind !== "other" ? (
            <VideoThumb url={d.imageUrl} height={92} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={d.imageUrl}
              src={d.imageUrl}
              alt=""
              className="mk-node-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )
        ) : null}

        {d.videoUrl ? <VideoThumb url={d.videoUrl} height={92} /> : null}

        <div className="mk-node-meta">
          {d.evergreen ? (
            <span className="mk-chip">
              <InfinityIcon size={11} /> Evergreen
            </span>
          ) : d.when || d.time ? (
            <span className="mk-chip">
              <Clock size={11} /> {[d.when, d.time].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {d.assignee ? (
            <span className="mk-chip">
              <User size={11} /> {d.assignee}
            </span>
          ) : null}
          {total > 0 ? (
            <span className="mk-chip" style={{ color: done === total ? "var(--green-strong)" : undefined }}>
              <CheckSquare size={11} /> {done}/{total}
            </span>
          ) : null}
          {d.imageUrl ? (
            <span className="mk-chip">
              <ImageIcon size={11} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
