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
  currency: string;
  priceUsd: number;
  requiresPayment: boolean;
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
    currency: "USD",
    priceUsd: 0,
    requiresPayment: false,
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

type ReservasTab = "pagina" | "servicios" | "reservas";

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 18,
  background: "white",
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
  const [tab, setTab] = useState<ReservasTab>(services.length ? "servicios" : "pagina");
  const selected = useMemo(() => services.find((s) => s.id === selectedId), [services, selectedId]);
  const activeServices = useMemo(() => services.filter((service) => service.isActive).length, [services]);
  const openReservations = useMemo(
    () => reservations.filter((reservation) => ["scheduled", "confirmed"].includes(reservation.status)).length,
    [reservations],
  );

  function tabStyle(active: boolean): React.CSSProperties {
    return {
      border: 0,
      borderBottom: active ? "2px solid var(--gold)" : "2px solid transparent",
      background: "transparent",
      color: active ? "var(--ink)" : "var(--muted)",
      padding: "12px 2px",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
    };
  }

  function selectService(row: BookingServiceAdminRow) {
    setSelectedId(row.id);
    setDraft({ ...row, availability: row.availability || DEFAULT_BOOKING_AVAILABILITY, questions: row.questions || [] });
  }

  function newService() {
    const next = emptyService();
    setSelectedId("new");
    setDraft(next);
    setTab("servicios");
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
    <div style={{ minHeight: 680, background: "white" }}>
      <header style={{ padding: 22, borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <div className="between" style={{ alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div>
            <p className="mono" style={{ color: "var(--gold-deep)", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
              Sistema de citas
            </p>
            <h2 style={{ fontSize: 26, marginTop: 4 }}>Configura reservas y servicios</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, maxWidth: 680 }}>
              Edita el contenido de la pagina publica, administra los servicios disponibles y revisa las reservas que llegan al tenant.
            </p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <a href={tp("/reservas")} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>
              Ver pagina publica
            </a>
            <button className="btn btn-primary" onClick={newService} style={{ fontSize: 12 }}>
              Nuevo servicio
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 18 }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "white" }}>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>SERVICIOS</div>
            <strong style={{ fontSize: 24 }}>{services.length}</strong>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "white" }}>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>VISIBLES EN SITIO</div>
            <strong style={{ fontSize: 24 }}>{activeServices}</strong>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "white" }}>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>POR ATENDER</div>
            <strong style={{ fontSize: 24 }}>{openReservations}</strong>
          </div>
        </div>

        <nav className="row" role="tablist" aria-label="Secciones de reservas" style={{ gap: 24, marginTop: 18, overflowX: "auto" }}>
          <button type="button" role="tab" aria-selected={tab === "pagina"} onClick={() => setTab("pagina")} style={tabStyle(tab === "pagina")}>
            Pagina publica
          </button>
          <button type="button" role="tab" aria-selected={tab === "servicios"} onClick={() => setTab("servicios")} style={tabStyle(tab === "servicios")}>
            Servicios
          </button>
          <button type="button" role="tab" aria-selected={tab === "reservas"} onClick={() => setTab("reservas")} style={tabStyle(tab === "reservas")}>
            Reservas recibidas
          </button>
        </nav>
      </header>

      {tab === "pagina" ? (
        <main style={{ padding: 24, display: "grid", gap: 18 }}>
          <section style={{ ...panelStyle, display: "grid", gap: 14 }}>
            <div className="between" style={{ gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontSize: 22 }}>Contenido de la pagina publica</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Estos textos aparecen en /reservas antes del catalogo de servicios. Sirven para adaptar el lenguaje a consultorias, clases, visitas, demos o sesiones.
                </p>
              </div>
              <button className="btn btn-primary" onClick={savePage} disabled={savingPage} style={{ fontSize: 12 }}>
                {savingPage ? "Guardando..." : "Guardar pagina"}
              </button>
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
              <textarea value={pageDraft.description} onChange={(e) => patchPage("description", e.target.value)} maxLength={360} placeholder={BOOKING_PAGE_DEFAULTS.description} style={{ ...inputStyle, minHeight: 92 }} />
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
          </section>

          <section style={{ ...panelStyle, background: "color-mix(in srgb, var(--bg) 82%, white)" }}>
            <p className="mono" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
              Vista previa
            </p>
            <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", fontWeight: 700, textTransform: "uppercase", marginTop: 16 }}>
              {pageDraft.eyebrow || BOOKING_PAGE_DEFAULTS.eyebrow}
            </div>
            <div className="serif" style={{ fontSize: 32, lineHeight: 1.08, marginTop: 8, color: "var(--navy)", fontWeight: 700 }}>
              {pageDraft.title || BOOKING_PAGE_DEFAULTS.title}
            </div>
            <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.55, marginTop: 8, maxWidth: 720 }}>
              {pageDraft.description || BOOKING_PAGE_DEFAULTS.description}
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <span className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 12 }}>
                {pageDraft.primaryCtaLabel || BOOKING_PAGE_DEFAULTS.primaryCtaLabel}
              </span>
              <span className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }}>
                {pageDraft.secondaryCtaLabel || BOOKING_PAGE_DEFAULTS.secondaryCtaLabel}
              </span>
            </div>
          </section>
        </main>
      ) : null}

      {tab === "servicios" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", minHeight: 560 }}>
          <aside style={{ borderRight: "1px solid var(--line)", background: "var(--bg-2)" }}>
            <div className="between" style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
              <div>
                <strong style={{ fontSize: 14 }}>Catalogo de servicios</strong>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>Elige uno para editarlo.</p>
              </div>
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
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                      {service.durationMinutes} min · {service.locationType}
                      {service.requiresPayment && service.priceUsd > 0 ? ` · $${service.priceUsd} ${service.currency}` : ""}
                    </div>
                    <div className="mono" style={{ color: "var(--muted)", fontSize: 10, marginTop: 4 }}>
                      /reservas?servicio={service.slug}
                    </div>
                  </button>
                );
              })}
              {!services.length ? (
                <div style={{ padding: 18, color: "var(--muted)", fontSize: 13 }}>
                  Aun no hay servicios de reserva. Crea el primero para mostrarlo en la pagina publica.
                </div>
              ) : null}
            </div>
          </aside>

          <main style={{ padding: 24, display: "grid", gap: 18 }}>
            <section style={{ display: "grid", gap: 16 }}>
              <div className="between" style={{ gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: 24 }}>{selected ? "Editar servicio" : "Nuevo servicio"}</h2>
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    Estos datos controlan la ficha publica, el calendario y las preguntas del formulario de reserva.
                  </p>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {draft.id ? (
                    <a href={tp(`/reservas?servicio=${draft.slug}`)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>
                      Ver servicio publico
                    </a>
                  ) : null}
                  {draft.id ? <button className="btn btn-ghost" onClick={remove} style={{ fontSize: 12 }}>Eliminar</button> : null}
                  <button className="btn btn-primary" onClick={save} style={{ fontSize: 12 }}>Guardar servicio</button>
                </div>
              </div>

              <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>Informacion visible del servicio</h3>
                  <p style={{ color: "var(--muted)", fontSize: 12 }}>Lo que el visitante lee antes de elegir un horario.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
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
              </div>

              <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>Cobro del servicio</h3>
                  <p style={{ color: "var(--muted)", fontSize: 12 }}>
                    Si activas pago, el visitante elige horario, deja sus datos y pasa a Stripe antes de confirmar la reserva.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                  <Field label="Precio">
                    <input type="number" min={0} max={100000} value={draft.priceUsd} onChange={(e) => patch("priceUsd", Number(e.target.value))} style={inputStyle} />
                  </Field>
                  <Field label="Moneda">
                    <select value={draft.currency} onChange={(e) => patch("currency", e.target.value)} style={inputStyle}>
                      <option value="USD">USD</option>
                    </select>
                  </Field>
                  <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
                    <input type="checkbox" checked={draft.requiresPayment} onChange={(e) => patch("requiresPayment", e.target.checked)} />
                    Requiere pago para confirmar
                  </label>
                </div>
              </div>

              <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>Reglas de reserva</h3>
                  <p style={{ color: "var(--muted)", fontSize: 12 }}>Duracion, modalidad, avisos y datos requeridos al usuario.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
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
              </div>

              <div style={{ ...panelStyle }}>
                <h3 style={{ fontSize: 17, marginBottom: 12 }}>Disponibilidad semanal</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {DAYS.map((label, day) => {
                    const row = (draft.availability || []).find((a) => a.day === day) ?? { day, startTime: "09:00", endTime: "17:00", enabled: false };
                    return (
                      <div key={day} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
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

              <div style={{ ...panelStyle }}>
                <div className="between" style={{ marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontSize: 17 }}>Preguntas extra</h3>
                    <p style={{ color: "var(--muted)", fontSize: 12 }}>Campos adicionales que se agregan al formulario de reserva.</p>
                  </div>
                  <button className="btn btn-ghost" onClick={addQuestion} style={{ fontSize: 12 }}>Agregar pregunta</button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(draft.questions || []).map((q, i) => (
                    <div key={q.id} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 130px 90px 80px", gap: 8, alignItems: "center" }}>
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
                  {!draft.questions?.length ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>No hay preguntas extra configuradas para este servicio.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </main>
        </div>
      ) : null}

      {tab === "reservas" ? (
        <main style={{ padding: 24, display: "grid", gap: 18 }}>
          <section style={panelStyle}>
            <div className="between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 22 }}>Reservas recibidas</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Consulta las solicitudes recientes y actualiza su estado.</p>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {reservations.map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1.2fr) minmax(150px, 1fr) minmax(180px, 1fr) 150px", gap: 12, alignItems: "center", border: "1px solid var(--line)", borderRadius: 8, padding: 12, overflowX: "auto" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{r.customerName}</strong>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{r.customerEmail || r.customerPhone || "sin contacto"}</div>
                  </div>
                  <div style={{ fontSize: 12 }}>{r.serviceTitle}</div>
                  <div className="mono" style={{ fontSize: 11 }}>{new Date(r.startsAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</div>
                  <select value={r.status} onChange={(e) => updateReservation(r.id, e.target.value)} style={inputStyle}>
                    <option value="pending_payment">Pendiente de pago</option>
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
      ) : null}
    </div>
  );
}
