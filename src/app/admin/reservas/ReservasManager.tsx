"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/components/tenant/TenantProvider";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { DEFAULT_BOOKING_AVAILABILITY, slugifyBookingTitle } from "@/lib/booking-shared";
import { BOOKING_PAGE_DEFAULTS, resolveBookingPageContent, type BookingPageContent } from "@/lib/booking-page";
import { TIMEZONE_OPTIONS } from "@/lib/timezone";
import type { BookingAvailability, BookingQuestion } from "@/db/schema";

export type BookingServiceAdminRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  hostName: string | null;
  hostAvatarUrl: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  timezone: string;
  locationType: string;
  locationLabel: string | null;
  confirmationText: string | null;
  notificationEmail: string | null;
  requirePhone: boolean;
  requireEmail: boolean;
  availability: BookingAvailability;
  questions: BookingQuestion[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BookingReservationAdminRow = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

const DAYS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function emptyService(): BookingServiceAdminRow {
  return {
    id: "",
    slug: "",
    title: "Consultoria inicial",
    subtitle: "Agenda una sesion para revisar tu caso.",
    description: "Selecciona una fecha y horario disponible. Recibiras confirmacion por correo.",
    hostName: "",
    hostAvatarUrl: "",
    durationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    maxDaysAhead: 30,
    timezone: "America/Mazatlan",
    locationType: "virtual",
    locationLabel: "",
    confirmationText: "",
    notificationEmail: "",
    requirePhone: true,
    requireEmail: true,
    availability: DEFAULT_BOOKING_AVAILABILITY,
    questions: [],
    isActive: true,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  background: "white",
  color: "var(--ink)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
      <span className="mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function ReservasManager({
  services,
  reservations,
  bookingPage,
}: {
  services: BookingServiceAdminRow[];
  reservations: BookingReservationAdminRow[];
  bookingPage?: Partial<BookingPageContent> | null;
}) {
  const router = useRouter();
  const { tp } = useTenant();
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string>(services[0]?.id ?? "new");
  const [draft, setDraft] = useState<BookingServiceAdminRow>(services[0] ?? emptyService());
  const [pageDraft, setPageDraft] = useState<BookingPageContent>(resolveBookingPageContent(bookingPage));
  const [savingPage, setSavingPage] = useState(false);
  const selected = useMemo(() => services.find((s) => s.id === selectedId), [services, selectedId]);

  function selectService(row: BookingServiceAdminRow) {
    setSelectedId(row.id);
    setDraft({ ...row, availability: row.availability || DEFAULT_BOOKING_AVAILABILITY, questions: row.questions || [] });
  }

  function newService() {
    const next = emptyService();
    setSelectedId("new");
    setDraft(next);
  }

  function patch<K extends keyof BookingServiceAdminRow>(key: K, value: BookingServiceAdminRow[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !prev.id) next.slug = slugifyBookingTitle(String(value));
      return next;
    });
  }

  function patchAvailability(day: number, field: "enabled" | "startTime" | "endTime", value: boolean | string) {
    setDraft((prev) => {
      const current = prev.availability?.length ? prev.availability : DEFAULT_BOOKING_AVAILABILITY;
      const byDay = new Map(current.map((row) => [row.day, row]));
      const base = byDay.get(day) ?? { day, startTime: "09:00", endTime: "17:00", enabled: false };
      byDay.set(day, { ...base, [field]: value });
      return { ...prev, availability: Array.from(byDay.values()).sort((a, b) => a.day - b.day) };
    });
  }

  function addQuestion() {
    const id = `q_${Date.now().toString(36)}`;
    patch("questions", [...(draft.questions || []), { id, label: "Pregunta", type: "text", required: false }]);
  }

  function patchPage<K extends keyof BookingPageContent>(key: K, value: BookingPageContent[K]) {
    setPageDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function savePage() {
    setSavingPage(true);
    try {
      const res = await fetch(tp("/api/admin/branding"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingPage: {
            eyebrow: pageDraft.eyebrow.trim(),
            title: pageDraft.title.trim(),
            description: pageDraft.description.trim(),
            primaryCtaLabel: pageDraft.primaryCtaLabel.trim(),
            secondaryCtaLabel: pageDraft.secondaryCtaLabel.trim(),
            catalogEyebrow: pageDraft.catalogEyebrow.trim(),
            catalogTitle: pageDraft.catalogTitle.trim(),
          },
        }),
      });
      if (!res.ok) {
        toast.error("No se pudo guardar la pagina publica.");
        return;
      }
      toast.success("Pagina publica de reservas guardada.");
      router.refresh();
    } catch {
      toast.error("Error de red al guardar.");
    } finally {
      setSavingPage(false);
    }
  }

  async function save() {
    const body = {
      ...draft,
      slug: slugifyBookingTitle(draft.slug || draft.title),
      subtitle: draft.subtitle || null,
      description: draft.description || null,
      hostName: draft.hostName || null,
      hostAvatarUrl: draft.hostAvatarUrl || null,
      locationLabel: draft.locationLabel || null,
      confirmationText: draft.confirmationText || null,
      notificationEmail: draft.notificationEmail || null,
      availability: draft.availability,
      questions: draft.questions,
    };
    const url = draft.id ? tp(`/api/admin/bookings/${draft.id}`) : tp("/api/admin/bookings");
    const res = await fetch(url, {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error === "slug_taken" ? "Ese slug ya esta en uso." : "No se pudo guardar.");
      return;
    }
    toast.success("Reserva guardada.");
    router.refresh();
  }

  async function remove() {
    if (!draft.id) return;
    const ok = await confirm({
      title: `Eliminar "${draft.title}"`,
      description: "Se eliminaran tambien sus reservas historicas.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(tp(`/api/admin/bookings/${draft.id}`), { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar.");
      return;
    }
    toast.success("Servicio eliminado.");
    newService();
    router.refresh();
  }

  async function updateReservation(id: string, status: string) {
    const res = await fetch(tp(`/api/admin/bookings/reservations/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 680 }}>
      <aside style={{ borderRight: "1px solid var(--line)", background: "var(--bg-2)" }}>
        <div className="between" style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <strong style={{ fontSize: 14 }}>Servicios</strong>
          <button className="btn btn-primary" onClick={newService} style={{ padding: "7px 10px", fontSize: 11 }}>
            Nuevo
          </button>
        </div>
        <div style={{ display: "grid" }}>
          {services.map((service) => {
            const active = selectedId === service.id;
            return (
              <button
                key={service.id}
                onClick={() => selectService(service)}
                style={{
                  textAlign: "left",
                  padding: 16,
                  border: 0,
                  borderBottom: "1px solid var(--line)",
                  background: active ? "white" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ fontSize: 13 }}>{service.title}</strong>
                  <span className="mono" style={{ fontSize: 10, color: service.isActive ? "var(--green-strong)" : "var(--muted)" }}>
                    {service.isActive ? "ACTIVO" : "OCULTO"}
                  </span>
                </div>
                <div className="mono" style={{ color: "var(--muted)", fontSize: 10, marginTop: 4 }}>
                  /reservas?servicio={service.slug}
                </div>
              </button>
            );
          })}
          {!services.length ? (
            <div style={{ padding: 18, color: "var(--muted)", fontSize: 13 }}>
              Aun no hay servicios de reserva.
            </div>
          ) : null}
        </div>
      </aside>

      <main style={{ padding: 24, display: "grid", gap: 24 }}>
        <section style={{ display: "grid", gap: 14, border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "white" }}>
          <div className="between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 22 }}>Pagina publica de reservas</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Personaliza el encabezado de /reservas segun lo que ofrezca este tenant: servicios, consultorias, clases, visitas, demos o sesiones.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <a href={tp("/reservas")} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>
                Ver pagina publica
              </a>
              <button className="btn btn-primary" onClick={savePage} disabled={savingPage} style={{ fontSize: 12 }}>
                {savingPage ? "Guardando..." : "Guardar pagina"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <Field label="Etiqueta superior">
              <input value={pageDraft.eyebrow} onChange={(e) => patchPage("eyebrow", e.target.value)} maxLength={80} placeholder={BOOKING_PAGE_DEFAULTS.eyebrow} style={inputStyle} />
            </Field>
            <Field label="Titulo principal">
              <input value={pageDraft.title} onChange={(e) => patchPage("title", e.target.value)} maxLength={140} placeholder={BOOKING_PAGE_DEFAULTS.title} style={inputStyle} />
            </Field>
          </div>

          <Field label="Descripcion">
            <textarea value={pageDraft.description} onChange={(e) => patchPage("description", e.target.value)} maxLength={360} placeholder={BOOKING_PAGE_DEFAULTS.description} style={{ ...inputStyle, minHeight: 78 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <Field label="Boton principal">
              <input value={pageDraft.primaryCtaLabel} onChange={(e) => patchPage("primaryCtaLabel", e.target.value)} maxLength={50} placeholder={BOOKING_PAGE_DEFAULTS.primaryCtaLabel} style={inputStyle} />
            </Field>
            <Field label="Boton secundario">
              <input value={pageDraft.secondaryCtaLabel} onChange={(e) => patchPage("secondaryCtaLabel", e.target.value)} maxLength={50} placeholder={BOOKING_PAGE_DEFAULTS.secondaryCtaLabel} style={inputStyle} />
            </Field>
            <Field label="Etiqueta catalogo">
              <input value={pageDraft.catalogEyebrow} onChange={(e) => patchPage("catalogEyebrow", e.target.value)} maxLength={80} placeholder={BOOKING_PAGE_DEFAULTS.catalogEyebrow} style={inputStyle} />
            </Field>
            <Field label="Titulo catalogo">
              <input value={pageDraft.catalogTitle} onChange={(e) => patchPage("catalogTitle", e.target.value)} maxLength={120} placeholder={BOOKING_PAGE_DEFAULTS.catalogTitle} style={inputStyle} />
            </Field>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              background: "color-mix(in srgb, var(--bg) 82%, white)",
            }}
          >
            <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", fontWeight: 700, textTransform: "uppercase" }}>
              {pageDraft.eyebrow || BOOKING_PAGE_DEFAULTS.eyebrow}
            </div>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.08, marginTop: 8, color: "var(--navy)", fontWeight: 700 }}>
              {pageDraft.title || BOOKING_PAGE_DEFAULTS.title}
            </div>
            <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.55, marginTop: 8, maxWidth: 620 }}>
              {pageDraft.description || BOOKING_PAGE_DEFAULTS.description}
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <span className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 12 }}>
                {pageDraft.primaryCtaLabel || BOOKING_PAGE_DEFAULTS.primaryCtaLabel}
              </span>
              <span className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }}>
                {pageDraft.secondaryCtaLabel || BOOKING_PAGE_DEFAULTS.secondaryCtaLabel}
              </span>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 16 }}>
          <div className="between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 24 }}>{selected ? "Editar servicio" : "Nuevo servicio"}</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Configura el servicio que se mostrara en la pagina publica de reservas.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {draft.id ? (
                <a href={tp(`/reservas?servicio=${draft.slug}`)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>
                  Ver publico
                </a>
              ) : null}
              {draft.id ? <button className="btn btn-ghost" onClick={remove} style={{ fontSize: 12 }}>Eliminar</button> : null}
              <button className="btn btn-primary" onClick={save} style={{ fontSize: 12 }}>Guardar</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Titulo">
              <input value={draft.title} onChange={(e) => patch("title", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Slug publico">
              <input value={draft.slug} onChange={(e) => patch("slug", slugifyBookingTitle(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Subtitulo">
              <input value={draft.subtitle ?? ""} onChange={(e) => patch("subtitle", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Persona / anfitrion">
              <input value={draft.hostName ?? ""} onChange={(e) => patch("hostName", e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Descripcion">
            <textarea value={draft.description ?? ""} onChange={(e) => patch("description", e.target.value)} style={{ ...inputStyle, minHeight: 96 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            <Field label="Duracion">
              <input type="number" min={10} max={240} value={draft.durationMinutes} onChange={(e) => patch("durationMinutes", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Buffer min">
              <input type="number" min={0} max={120} value={draft.bufferMinutes} onChange={(e) => patch("bufferMinutes", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Anticipacion horas">
              <input type="number" min={0} max={720} value={draft.minNoticeHours} onChange={(e) => patch("minNoticeHours", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Dias hacia adelante">
              <input type="number" min={1} max={365} value={draft.maxDaysAhead} onChange={(e) => patch("maxDaysAhead", Number(e.target.value))} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Zona horaria">
              <select value={draft.timezone} onChange={(e) => patch("timezone", e.target.value)} style={inputStyle}>
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
            <Field label="Modalidad">
              <select value={draft.locationType} onChange={(e) => patch("locationType", e.target.value)} style={inputStyle}>
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
                <option value="phone_call">Llamada</option>
                <option value="other">Otra</option>
              </select>
            </Field>
            <Field label="Email de aviso">
              <input value={draft.notificationEmail ?? ""} onChange={(e) => patch("notificationEmail", e.target.value)} placeholder="admin@empresa.com" style={inputStyle} />
            </Field>
          </div>

          <Field label="Ubicacion o instrucciones">
            <input value={draft.locationLabel ?? ""} onChange={(e) => patch("locationLabel", e.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <label className="row" style={{ gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={draft.isActive} onChange={(e) => patch("isActive", e.target.checked)} />
              Mostrar en sitio
            </label>
            <label className="row" style={{ gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={draft.requireEmail} onChange={(e) => patch("requireEmail", e.target.checked)} />
              Pedir email
            </label>
            <label className="row" style={{ gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={draft.requirePhone} onChange={(e) => patch("requirePhone", e.target.checked)} />
              Pedir telefono
            </label>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>Disponibilidad semanal</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {DAYS.map((label, day) => {
                const row = (draft.availability || []).find((a) => a.day === day) ?? { day, startTime: "09:00", endTime: "17:00", enabled: false };
                return (
                  <div key={day} className="row" style={{ gap: 10 }}>
                    <label className="row mono" style={{ width: 80, gap: 8, fontSize: 11 }}>
                      <input type="checkbox" checked={row.enabled !== false} onChange={(e) => patchAvailability(day, "enabled", e.target.checked)} />
                      {label}
                    </label>
                    <input type="time" value={row.startTime} onChange={(e) => patchAvailability(day, "startTime", e.target.value)} style={{ ...inputStyle, width: 130 }} />
                    <span style={{ color: "var(--muted)" }}>a</span>
                    <input type="time" value={row.endTime} onChange={(e) => patchAvailability(day, "endTime", e.target.value)} style={{ ...inputStyle, width: 130 }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 18 }}>Preguntas extra</h3>
              <button className="btn btn-ghost" onClick={addQuestion} style={{ fontSize: 12 }}>Agregar pregunta</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(draft.questions || []).map((q, i) => (
                <div key={q.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px 80px", gap: 8 }}>
                  <input value={q.label} onChange={(e) => patch("questions", draft.questions.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} style={inputStyle} />
                  <select value={q.type} onChange={(e) => patch("questions", draft.questions.map((x, idx) => idx === i ? { ...x, type: e.target.value as BookingQuestion["type"] } : x))} style={inputStyle}>
                    <option value="text">Texto</option>
                    <option value="textarea">Parrafo</option>
                    <option value="select">Selector</option>
                  </select>
                  <label className="row" style={{ gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={!!q.required} onChange={(e) => patch("questions", draft.questions.map((x, idx) => idx === i ? { ...x, required: e.target.checked } : x))} />
                    Req.
                  </label>
                  <button className="btn btn-ghost" onClick={() => patch("questions", draft.questions.filter((_, idx) => idx !== i))} style={{ fontSize: 12 }}>Quitar</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Reservas recientes</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {reservations.map((r) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 140px", gap: 12, alignItems: "center", border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{r.customerName}</strong>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{r.customerEmail || r.customerPhone || "sin contacto"}</div>
                </div>
                <div style={{ fontSize: 12 }}>{r.serviceTitle}</div>
                <div className="mono" style={{ fontSize: 11 }}>{new Date(r.startsAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</div>
                <select value={r.status} onChange={(e) => updateReservation(r.id, e.target.value)} style={inputStyle}>
                  <option value="scheduled">Agendada</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="no_show">No asistio</option>
                </select>
              </div>
            ))}
            {!reservations.length ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Todavia no hay reservas.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
