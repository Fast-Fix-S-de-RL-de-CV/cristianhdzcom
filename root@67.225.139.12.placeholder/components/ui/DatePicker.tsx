"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Custom date picker premium (sin el calendario nativo feo del browser).
 *
 * Reemplaza `<input type="date" />` y `<input type="datetime-local" />` en
 * toda la plataforma. La regla es la misma que con confirm/alert: cero
 * componentes nativos del navegador en formularios visibles.
 *
 * - Click en CUALQUIER parte del campo abre el calendario (no solo en el
 *   iconito como en Chrome).
 * - Soporta `mode="date"` y `mode="datetime"` — el segundo agrega selector
 *   de hora (incrementos de 5 min) abajo del calendario.
 * - Valor de salida en formato ISO: "YYYY-MM-DD" para date o
 *   "YYYY-MM-DDTHH:mm" para datetime (compatible con el input nativo).
 */
type Mode = "date" | "datetime";

export function DatePicker({
  value,
  onChange,
  mode = "date",
  placeholder,
  min,
  max,
  disabled,
  style,
  required,
}: {
  /** ISO string. "YYYY-MM-DD" para date, "YYYY-MM-DDTHH:mm" para datetime. */
  value: string;
  onChange: (next: string) => void;
  mode?: Mode;
  placeholder?: string;
  /** ISO bounds. */
  min?: string;
  max?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Parse value into Date + hours/minutes
  const parsed = parseIso(value);
  const [viewMonth, setViewMonth] = useState<Date>(() => parsed ?? new Date());

  useEffect(() => {
    if (parsed) setViewMonth(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectDate(d: Date) {
    if (mode === "date") {
      onChange(formatIsoDate(d));
      setOpen(false);
    } else {
      // Keep current hour/minute if any
      const cur = parsed ?? new Date();
      d.setHours(cur.getHours(), cur.getMinutes(), 0, 0);
      onChange(formatIsoDateTime(d));
    }
  }
  function changeTime(h: number, m: number) {
    const base = parsed ?? new Date();
    base.setHours(h, m, 0, 0);
    onChange(formatIsoDateTime(base));
  }

  const label = formatHuman(value, mode);
  const display = label || (placeholder ?? (mode === "date" ? "Seleccionar fecha" : "Seleccionar fecha y hora"));
  const isEmpty = !value;

  return (
    <div ref={rootRef} style={{ position: "relative", ...style }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "9px 36px 9px 12px",
          border: `1px solid ${open ? "var(--gold-deep)" : "var(--line-2)"}`,
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          background: disabled ? "var(--bg-2)" : "white",
          color: isEmpty ? "var(--muted)" : "var(--ink)",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          position: "relative",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(216,168,63,0.15)" : "none",
          transition: "border-color 0.12s, box-shadow 0.12s",
        }}
      >
        {display}
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: open ? "var(--gold-deep)" : "var(--muted)",
            pointerEvents: "none",
            display: "inline-flex",
          }}
        >
          <CalendarIcon />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Seleccionar fecha"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "#FFFDF8",
            border: "1px solid rgba(216,168,63,0.30)",
            borderRadius: 14,
            boxShadow: "0 18px 36px rgba(6,27,54,0.18)",
            padding: 14,
            width: 300,
            animation: "ch-dp-pop 0.15s cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          {/* Header: month + arrows */}
          <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setViewMonth((d) => addMonths(d, -1))}
              style={navBtn()}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <div
              className="serif"
              style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", textTransform: "capitalize" }}
            >
              {monthLabel(viewMonth)}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((d) => addMonths(d, 1))}
              style={navBtn()}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          {/* Weekday header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
              marginBottom: 4,
            }}
          >
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="mono"
                style={{
                  fontSize: 9,
                  color: "var(--muted)",
                  textAlign: "center",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                  padding: 4,
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {buildGrid(viewMonth).map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isSel = parsed ? sameDay(d, parsed) : false;
              const isToday = sameDay(d, new Date());
              const outOfBounds = isOutOfBounds(d, min, max);
              return (
                <button
                  type="button"
                  key={i}
                  disabled={outOfBounds}
                  onClick={() => selectDate(d)}
                  style={{
                    height: 32,
                    border: "none",
                    borderRadius: 8,
                    background: isSel
                      ? "var(--gold)"
                      : isToday
                        ? "rgba(216,168,63,0.18)"
                        : "transparent",
                    color: isSel
                      ? "var(--navy)"
                      : !inMonth
                        ? "rgba(109,120,144,0.45)"
                        : outOfBounds
                          ? "rgba(109,120,144,0.4)"
                          : "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: isSel || isToday ? 700 : 500,
                    cursor: outOfBounds ? "not-allowed" : "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSel && !outOfBounds) e.currentTarget.style.background = "rgba(216,168,63,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSel) {
                      e.currentTarget.style.background = isToday ? "rgba(216,168,63,0.18)" : "transparent";
                    }
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time picker when mode=datetime */}
          {mode === "datetime" && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px dashed rgba(216,168,63,0.30)",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  color: "var(--muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                HORA
              </div>
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <select
                  value={parsed?.getHours() ?? 9}
                  onChange={(e) => changeTime(parseInt(e.target.value, 10), parsed?.getMinutes() ?? 0)}
                  style={timeSelect()}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--muted)" }}>:</span>
                <select
                  value={parsed?.getMinutes() ?? 0}
                  onChange={(e) => changeTime(parsed?.getHours() ?? 9, parseInt(e.target.value, 10))}
                  style={timeSelect()}
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                  24h
                </span>
              </div>
            </div>
          )}

          {/* Action row */}
          <div
            className="row"
            style={{
              gap: 8,
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                padding: "4px 8px",
                letterSpacing: "0.04em",
                fontWeight: 600,
              }}
              disabled={required && !value}
            >
              Limpiar
            </button>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  selectDate(new Date());
                }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: 6,
                  color: "var(--ink)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "5px 10px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "linear-gradient(180deg, #F2C65A 0%, #D8A83F 100%)",
                  border: "none",
                  borderRadius: 6,
                  color: "var(--navy)",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: "5px 12px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                  boxShadow: "0 2px 0 #B88523",
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ch-dp-pop {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────── helpers ───────────────── */
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function parseIso(v: string): Date | null {
  if (!v) return null;
  // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  // IMPORTANT: use local time to avoid TZ shift one-day-back issues.
  return new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), h ? parseInt(h, 10) : 0, mi ? parseInt(mi, 10) : 0);
}
function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatIsoDateTime(d: Date): string {
  const base = formatIsoDate(d);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${base}T${h}:${m}`;
}
function formatHuman(v: string, mode: Mode): string {
  const d = parseIso(v);
  if (!d) return "";
  const date = d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  if (mode === "date") return date;
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isOutOfBounds(d: Date, min?: string, max?: string): boolean {
  if (min) {
    const mn = parseIso(min);
    if (mn && d < new Date(mn.getFullYear(), mn.getMonth(), mn.getDate())) return true;
  }
  if (max) {
    const mx = parseIso(max);
    if (mx && d > new Date(mx.getFullYear(), mx.getMonth(), mx.getDate())) return true;
  }
  return false;
}
function buildGrid(month: Date): Date[] {
  // Mon-first 6-row grid (42 days), spilling into prev/next month.
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = (first.getDay() + 6) % 7; // 0=Mon
  const start = new Date(first);
  start.setDate(first.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
function navBtn(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    border: "none",
    background: "rgba(216,168,63,0.10)",
    color: "var(--gold-deep)",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  };
}
function timeSelect(): React.CSSProperties {
  return {
    padding: "5px 8px",
    border: "1px solid var(--line-2)",
    borderRadius: 6,
    background: "white",
    fontSize: 13,
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    color: "var(--ink)",
    cursor: "pointer",
  };
}
function CalendarIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </svg>
  );
}
