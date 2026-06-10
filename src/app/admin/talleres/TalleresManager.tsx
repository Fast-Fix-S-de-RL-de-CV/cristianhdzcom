"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  BulkActionBar,
  BulkCheckbox,
  selectedRowBg,
  useBulkDelete,
  useBulkSelection,
} from "@/components/admin/BulkActions";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { apiErrorMessage } from "@/lib/apiError";

type BadgeColorOpt = "" | "red" | "navy" | "warm" | "green" | "gold" | "muted" | "accent";
const BADGE_COLORS: { value: BadgeColorOpt; label: string }[] = [
  { value: "", label: "Auto (según estado)" },
  { value: "red", label: "🔴 Rojo · LIVE" },
  { value: "navy", label: "🟦 Navy + Dorado · EVERGREEN" },
  { value: "warm", label: "🟧 Naranja suave" },
  { value: "green", label: "🟢 Verde · OK / Free" },
  { value: "gold", label: "🟡 Dorado claro" },
  { value: "muted", label: "⚪ Gris neutro" },
  { value: "accent", label: "🟨 Dorado sólido" },
];

type Row = {
  id: string;
  title: string;
  description: string;
  host: string;
  startsAt: string;
  durationMinutes: number;
  isLive: boolean;
  capacity: number;
  attending: number;
  hot: boolean;
  link: string;
  priceUsd: number | null;
  recordingUrl: string | null;
  includedInMembership: "silver" | "gold" | "black" | null;
  coverUrl: string | null;
  isEvergreen: boolean;
  evergreenScheduleHint: string | null;
  tagline: string | null;
  isActive: boolean;
  badge1Text: string | null;
  badge1Color: string | null;
  badge2Text: string | null;
  badge2Color: string | null;
};

export function TalleresManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bulk = useBulkSelection<string>();
  const visibleIds = rows.map((e) => e.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.isSelected(id));
  const someSelected = !allSelected && visibleIds.some((id) => bulk.isSelected(id));

  const bulkDelete = useBulkDelete<string>({
    url: "/api/admin/events/bulk-delete",
    entityLabel: { singular: "evento", plural: "eventos" },
    description:
      "Se borran también las asistencias registradas. Esta acción no se puede deshacer.",
    onSuccess: bulk.clear,
  });

  async function save(method: "POST" | "PUT", url: string, data: Partial<Row>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === "attending_exceeds_capacity"
            ? "La asistencia no puede superar la capacidad"
            : apiErrorMessage(j, "No se pudo guardar"),
        );
      }
      setEditing(null);
      setCreating(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar el estado");
      throw new Error("toggle_failed");
    }
    router.refresh();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "¿Eliminar evento?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el evento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => setCreating(true)}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          + Nuevo evento
        </button>
      </div>

      <div
        className="row"
        style={{
          padding: "14px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          gap: 12,
        }}
      >
        <span style={{ width: 24, display: "flex", alignItems: "center" }}>
          <BulkCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(c) => bulk.toggleAllVisible(c, visibleIds)}
            disabled={visibleIds.length === 0}
            ariaLabel="Seleccionar todos los eventos"
          />
        </span>
        <span style={{ flex: 1.5 }}>Evento</span>
        <span style={{ flex: 1 }}>Host</span>
        <span style={{ width: 160 }}>Fecha</span>
        <span style={{ width: 80, textAlign: "right" }}>Duración</span>
        <span style={{ width: 100, textAlign: "right" }}>Asistencia</span>
        <span style={{ width: 60 }}>Live</span>
        <span style={{ width: 70, textAlign: "center" }}>Activo</span>
        <span style={{ width: 160, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {rows.map((e) => {
          const isChecked = bulk.isSelected(e.id);
          return (
            <div
              key={e.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                gap: 12,
                ...selectedRowBg(isChecked),
              }}
            >
              <span style={{ width: 24, display: "flex", alignItems: "center" }}>
                <BulkCheckbox
                  checked={isChecked}
                  onChange={(c) => bulk.toggleOne(e.id, c)}
                  ariaLabel={`Seleccionar ${e.title}`}
                />
              </span>
              <div style={{ flex: 1.5, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                {e.hot && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      background: "var(--warm-soft)",
                      color: "var(--warm)",
                      borderRadius: 4,
                      fontWeight: 700,
                      marginTop: 4,
                      display: "inline-block",
                    }}
                  >
                    🔥 HOT
                  </span>
                )}
              </div>
              <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>{e.host || "—"}</span>
              <span className="mono" style={{ width: 160, fontSize: 11, color: "var(--muted)" }}>
                {new Date(e.startsAt).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12 }}>
                {e.durationMinutes}m
              </span>
              <span className="mono" style={{ width: 100, textAlign: "right", fontSize: 12 }}>
                {e.attending}/{e.capacity}
              </span>
              <span style={{ width: 60 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: e.isLive ? "var(--green-soft)" : "var(--bg-3)",
                    color: e.isLive ? "var(--green-strong)" : "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  {e.isLive ? "● LIVE" : "—"}
                </span>
              </span>
              <span style={{ width: 70, display: "flex", justifyContent: "center" }}>
                <ActiveToggle
                  value={e.isActive}
                  onToggle={(next) => toggleActive(e.id, next)}
                  ariaLabel={`Activar/desactivar ${e.title}`}
                />
              </span>
              <span className="row" style={{ width: 160, justifyContent: "flex-end", gap: 6 }}>
                <button
                  onClick={() => setEditing(e)}
                  className="mono"
                  style={btnStyle("ghost")}
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(e.id)}
                  disabled={busy}
                  className="mono"
                  style={btnStyle("danger")}
                >
                  Borrar
                </button>
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Aún no hay eventos.
          </div>
        )}
      </div>

      {(creating || editing) && (
        <EventDialog
          event={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            setErr(null);
          }}
          onSave={(data) =>
            editing
              ? save("PUT", `/api/admin/events/${editing.id}`, data)
              : save("POST", `/api/admin/events`, data)
          }
          busy={busy}
          err={err}
        />
      )}

      <BulkActionBar
        selectedCount={bulk.size}
        entityLabel={{ singular: "evento", plural: "eventos" }}
        onCancel={bulk.clear}
        onDelete={() => bulkDelete.run([...bulk.allSelected])}
        pending={bulkDelete.pending}
      />
    </>
  );
}

function EventDialog({
  event,
  onClose,
  onSave,
  busy,
  err,
}: {
  event: Row | null;
  onClose: () => void;
  onSave: (data: Partial<Row>) => void;
  busy: boolean;
  err: string | null;
}) {
  const [form, setForm] = useState({
    title: event?.title || "",
    description: event?.description || "",
    host: event?.host || "",
    startsAt: toLocalDatetimeInput(event?.startsAt ? new Date(event.startsAt) : new Date()),
    durationMinutes: event?.durationMinutes ?? 60,
    capacity: event?.capacity ?? 300,
    isLive: event?.isLive ?? false,
    hot: event?.hot ?? false,
    link: event?.link || "",
    priceUsd: event?.priceUsd ?? null,
    recordingUrl: event?.recordingUrl || "",
    includedInMembership: (event?.includedInMembership ?? null) as
      | "silver"
      | "gold"
      | "black"
      | null,
    coverUrl: event?.coverUrl || "",
    tagline: event?.tagline || "",
    isEvergreen: event?.isEvergreen ?? false,
    evergreenScheduleHint: event?.evergreenScheduleHint || "",
    badge1Text: event?.badge1Text || "",
    badge1Color: (event?.badge1Color as BadgeColorOpt) || "",
    badge2Text: event?.badge2Text || "",
    badge2Color: (event?.badge2Color as BadgeColorOpt) || "",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 30, 58, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          maxWidth: 600,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 18 }}>
          {event ? "Editar evento" : "Nuevo evento"}
        </h2>

        <div className="col" style={{ gap: 14 }}>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle()}
            />
          </Field>
          <Field label="Host">
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              style={inputStyle()}
            />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle(), minHeight: 80 }}
            />
          </Field>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Fecha y hora">
                <DatePicker
                  mode="datetime"
                  value={form.startsAt}
                  onChange={(v) => setForm({ ...form, startsAt: v })}
                  placeholder="Selecciona fecha y hora"
                />
              </Field>
            </div>
            <div style={{ width: 130 }}>
              <Field label="Duración (min)">
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: parseInt(e.target.value || "0", 10) })
                  }
                  style={inputStyle()}
                />
              </Field>
            </div>
            <div style={{ width: 130 }}>
              <Field label="Capacidad">
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "0", 10) })}
                  style={inputStyle()}
                />
              </Field>
            </div>
          </div>
          <Field label="Link (Zoom, etc.)">
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              style={inputStyle()}
            />
          </Field>
          <Field label="Precio del taller (USD)">
            <input
              type="number"
              min={0}
              max={99999}
              value={form.priceUsd ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setForm({ ...form, priceUsd: null });
                } else {
                  const n = parseInt(raw, 10);
                  setForm({ ...form, priceUsd: Number.isFinite(n) ? n : null });
                }
              }}
              placeholder="Vacío = solo membresía"
              style={inputStyle()}
            />
          </Field>
          <Field label="URL de grabación (post-evento)">
            <input
              value={form.recordingUrl}
              onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
              placeholder="https://vimeo.com/..."
              style={inputStyle()}
            />
          </Field>
          <MediaUploadField
            label="Imagen banner del taller"
            url={form.coverUrl}
            kind={form.coverUrl ? "image" : null}
            onChange={(url) => setForm({ ...form, coverUrl: url })}
            mode="image"
            aspectRatio="3 / 1"
            hint="OBLIGATORIO: 1500 × 500 px (relación 3:1). La imagen llena el banner exacto, sin paddings ni recortes."
          />

          {/* Badges custom del banner público */}
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 14,
              background: "var(--bg-2)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                letterSpacing: "0.08em",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Badges del banner público
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Badge 1 · texto">
                  <input
                    value={form.badge1Text}
                    onChange={(e) => setForm({ ...form, badge1Text: e.target.value })}
                    placeholder='Ej: "● EN VIVO" — vacío = auto'
                    maxLength={80}
                    style={inputStyle()}
                  />
                </Field>
              </div>
              <div style={{ width: 220 }}>
                <Field label="Badge 1 · color">
                  <select
                    value={form.badge1Color}
                    onChange={(e) =>
                      setForm({ ...form, badge1Color: e.target.value as BadgeColorOpt })
                    }
                    style={inputStyle()}
                  >
                    {BADGE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Badge 2 · texto">
                  <input
                    value={form.badge2Text}
                    onChange={(e) => setForm({ ...form, badge2Text: e.target.value })}
                    placeholder='Ej: "157 suscritos" — vacío = auto'
                    maxLength={80}
                    style={inputStyle()}
                  />
                </Field>
              </div>
              <div style={{ width: 220 }}>
                <Field label="Badge 2 · color">
                  <select
                    value={form.badge2Color}
                    onChange={(e) =>
                      setForm({ ...form, badge2Color: e.target.value as BadgeColorOpt })
                    }
                    style={inputStyle()}
                  >
                    {BADGE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.55 }}>
              Vacíos = el banner pinta los defaults según los toggles (EN VIVO / EVERGREEN / HOT).
              Si pones texto custom, ese texto aparece. Emojis bienvenidos (🔴 ● ✦ 🔥 💎).
            </div>
          </div>

          <Field label="Tagline corto">
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="MASTERCLASS · ABIERTA"
              maxLength={120}
              style={inputStyle()}
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Eyebrow encima del título en el banner. Ej: &apos;MASTERCLASS · ABIERTA&apos;
            </div>
          </Field>
          <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isEvergreen}
              onChange={(e) => setForm({ ...form, isEvergreen: e.target.checked })}
            />
            Es taller evergreen (siempre disponible)
          </label>
          <Field label="Horario evergreen">
            <input
              value={form.evergreenScheduleHint}
              onChange={(e) => setForm({ ...form, evergreenScheduleHint: e.target.value })}
              placeholder="Cada miércoles 7pm CDMX"
              maxLength={120}
              style={inputStyle()}
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Ej: &apos;Cada miércoles 7pm CDMX&apos; o &apos;Disponible al inscribirte&apos;. Solo aplica si el toggle anterior está activo.
            </div>
          </Field>
          <Field label="Incluido en membresía">
            <select
              value={form.includedInMembership ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm({
                  ...form,
                  includedInMembership:
                    v === "silver" || v === "gold" || v === "black" ? v : null,
                });
              }}
              style={inputStyle()}
            >
              <option value="">No incluido (solo compra)</option>
              <option value="silver">🥈 Plata o superior</option>
              <option value="gold">🥇 Oro o superior</option>
              <option value="black">🖤 Solo Black</option>
            </select>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Si está marcado, los miembros del plan elegido (o superior) acceden gratis MIENTRAS la membresía esté activa. No afecta compras one-shot — sigue siendo comprable también.
            </div>
          </Field>
          <div className="row" style={{ gap: 18 }}>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.isLive}
                onChange={(e) => setForm({ ...form, isLive: e.target.checked })}
              />
              En vivo
            </label>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.hot}
                onChange={(e) => setForm({ ...form, hot: e.target.checked })}
              />
              Hot
            </label>
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: "color-mix(in srgb, var(--red) 10%, white)",
              color: "var(--red)",
              fontSize: 12,
              marginTop: 14,
            }}
          >
            {err}
          </div>
        )}

        <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave({
                ...form,
                startsAt: new Date(form.startsAt).toISOString(),
                recordingUrl: form.recordingUrl ? form.recordingUrl : null,
                coverUrl: form.coverUrl ? form.coverUrl : null,
                tagline: form.tagline ? form.tagline : null,
                evergreenScheduleHint: form.evergreenScheduleHint
                  ? form.evergreenScheduleHint
                  : null,
                badge1Text: form.badge1Text ? form.badge1Text : null,
                badge1Color: form.badge1Color ? form.badge1Color : null,
                badge2Text: form.badge2Text ? form.badge2Text : null,
                badge2Color: form.badge2Color ? form.badge2Color : null,
              } as Partial<Row>)
            }
            disabled={busy || !form.title}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {busy ? "Guardando…" : event ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "YYYY-MM-DDTHH:mm" en hora LOCAL — el DatePicker interpreta y edita el valor
 * como hora local, así que NO usar toISOString() (hora UTC) para precargarlo:
 * eso desplazaba startsAt por el offset del navegador en cada guardado.
 */
function toLocalDatetimeInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    background: "white",
  };
}

function btnStyle(kind: "ghost" | "danger"): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 6,
    background: kind === "danger" ? "white" : "var(--bg-2)",
    color: kind === "danger" ? "var(--red)" : "var(--ink)",
    border: "1px solid var(--line)",
    cursor: "pointer",
  };
}
