"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { channel, status, type MarketingNodeData } from "@/lib/marketing";
import { Video, Image as ImageIcon, Clock, User, CheckSquare, Infinity as InfinityIcon } from "lucide-react";

/** Card de un paso del plan (nodo del canvas). */
export function MarketingNode({ data, selected }: NodeProps) {
  const d = data as MarketingNodeData;
  const ch = channel(d.channel);
  const st = status(d.status);
  const Icon = ch.icon;
  const done = d.checklist?.filter((c) => c.done).length ?? 0;
  const total = d.checklist?.length ?? 0;

  return (
    <div
      className="mk-node"
      style={{
        borderColor: selected ? ch.color : "var(--line)",
        boxShadow: selected
          ? `0 0 0 2px ${ch.color}40, 0 10px 26px rgba(15,17,21,0.12)`
          : "0 6px 18px rgba(15,17,21,0.07)",
      }}
    >
      <Handle type="target" position={Position.Top} className="mk-handle" />

      <div className="mk-node-head" style={{ background: ch.color }}>
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

        {d.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.imageUrl} alt="" className="mk-node-img" />
        ) : null}

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
          {d.videoUrl ? (
            <span className="mk-chip">
              <Video size={11} />
            </span>
          ) : null}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="mk-handle" />
    </div>
  );
}
