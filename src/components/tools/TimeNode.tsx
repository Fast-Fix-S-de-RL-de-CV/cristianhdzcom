"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { timeUnit, type TimeNodeData } from "@/lib/marketing";

/** Los 4 lados, con salida (source) y entrada (target) — igual que las cards. */
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;
const KEYS = ["top", "right", "bottom", "left"] as const;

/** Nodo circular de espera/tiempo entre pasos (ej. 1D, 5HR). */
export function TimeNode({ data, selected }: NodeProps) {
  const d = data as TimeNodeData;
  const u = timeUnit(d.unit);

  return (
    <div className="mk-time-wrap">
      {KEYS.map((k, i) => (
        <Handle key={`t-${k}`} type="target" id={`t-${k}`} position={SIDES[i]} className="mk-handle mk-handle-target" />
      ))}
      {KEYS.map((k, i) => (
        <Handle key={`s-${k}`} type="source" id={`s-${k}`} position={SIDES[i]} className="mk-handle mk-handle-source" />
      ))}

      <div className={`mk-time-circle${selected ? " on" : ""}`}>
        <span className="mk-time-num">{d.amount}</span>
        <span className="mk-time-unit">{u.abbr}</span>
      </div>
      {d.note ? <div className="mk-time-caption">{d.note}</div> : null}
    </div>
  );
}
