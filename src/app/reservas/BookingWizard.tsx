"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Mail, MapPin, Phone, User } from "lucide-react";
import { useTenant } from "@/components/tenant/TenantProvider";
import type { BookingQuestion } from "@/db/schema";

type PublicService = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  hostName: string | null;
  hostAvatarUrl: string | null;
  durationMinutes: number;
  timezone: string;
  locationType: string;
  locationLabel: string | null;
  confirmationText: string | null;
  requirePhone: boolean;
  requireEmail: boolean;
  questions: BookingQuestion[];
  maxDaysAhead: number;
};

type Slot = { time: string; utc: string };

const DAYS = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = first.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: start }, () => null),
    ...Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
}

export function BookingWizard({
  services,
  tenant,
}: {
  services: PublicService[];
  tenant: { siteName: string; logoUrl: string | null; accent: string };
}) {
  const { tp } = useTenant();
  const [serviceSlug, setServiceSlug] = useState(services[0]?.slug ?? "");
  const selectedService = services.find((s) => s.slug === serviceSlug) ?? services[0];
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(ymd(today));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("servicio");
    if (slug && services.some((s) => s.slug === slug)) setServiceSlug(slug);
  }, [services]);

  useEffect(() => {
    if (!selectedService) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    setSelectedSlot(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || selectedService.timezone;
    fetch(tp(`/api/bookings/${selectedService.slug}/slots?date=${selectedDate}&tz=${encodeURIComponent(tz)}`), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSlots(Array.isArray(data.slots) ? data.slots : []))
      .catch(() => {
        if (!controller.signal.aborted) setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [selectedService?.slug, selectedDate, tp]);

  if (!services.length) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", padding: "80px 20px" }}>
        <h1 style={{ fontSize: 44 }}>Reservas no disponibles</h1>
        <p style={{ color: "var(--muted)", marginTop: 12 }}>
          Este sitio aun no tiene servicios de reserva activos.
        </p>
      </div>
    );
  }

  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (selectedService?.maxDaysAhead ?? 30));
  const active = tenant.accent || "var(--gold)";

  async function submit() {
    if (!selectedService || !selectedSlot) return;
    setError("");
    const payloadAnswers = (selectedService.questions || []).map((q) => ({ id: q.id, label: q.label, answer: answers[q.id] || "" }));
    const res = await fetch(tp(`/api/bookings/${selectedService.slug}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        utc: selectedSlot.utc,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || selectedService.timezone,
        answers: payloadAnswers,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "slot_unavailable" ? "Ese horario ya no esta disponible. Elige otro." : "No se pudo completar la reserva.");
      return;
    }
    setDone(true);
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <div
        className="booking-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "330px minmax(0, 1fr) 240px",
          minHeight: 620,
          background: "white",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "0 24px 70px rgba(10,30,58,.10)",
          overflow: "hidden",
        }}
      >
        <aside className="booking-info" style={{ padding: 34, borderRight: "1px solid var(--line)", background: "color-mix(in srgb, var(--bg) 72%, white)" }}>
          {tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.siteName} style={{ maxWidth: 180, maxHeight: 54, objectFit: "contain", marginBottom: 28 }} /> : <strong>{tenant.siteName}</strong>}
          {selectedService.hostAvatarUrl ? (
            <img src={selectedService.hostAvatarUrl} alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: 22 }} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--gold-soft)", color: "var(--ink)", display: "grid", placeItems: "center", fontSize: 34, fontWeight: 700, marginBottom: 22 }}>
              {(selectedService.hostName || tenant.siteName).slice(0, 1)}
            </div>
          )}
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{selectedService.hostName || tenant.siteName}</p>
          <h1 style={{ fontSize: 28, lineHeight: 1.12, margin: "6px 0 18px" }}>{selectedService.title}</h1>
          <div style={{ display: "grid", gap: 10, color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Clock size={16} /> {selectedService.durationMinutes} min</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Calendar size={16} /> {selectedService.timezone}</span>
            {selectedService.locationLabel ? <span style={{ display: "flex", gap: 8, alignItems: "center" }}><MapPin size={16} /> {selectedService.locationLabel}</span> : null}
          </div>
          {services.length > 1 ? (
            <select value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--line-2)", marginBottom: 18 }}>
              {services.map((s) => <option key={s.id} value={s.slug}>{s.title}</option>)}
            </select>
          ) : null}
          <div style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {selectedService.description || selectedService.subtitle}
          </div>
        </aside>

        <section className="booking-calendar" style={{ padding: 34 }}>
          {done ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 520, textAlign: "center" }}>
              <div>
                <CheckCircle2 size={58} color={active} style={{ margin: "0 auto 18px" }} />
                <h2 style={{ fontSize: 30 }}>Reserva confirmada</h2>
                <p style={{ color: "var(--muted)", marginTop: 8 }}>
                  Guardamos tu horario. Si dejaste correo, recibiras la confirmacion ahi.
                </p>
              </div>
            </div>
          ) : selectedSlot ? (
            <div style={{ maxWidth: 560 }}>
              <button onClick={() => setSelectedSlot(null)} className="mono" style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", marginBottom: 18 }}>
                Volver a horarios
              </button>
              <h2 style={{ fontSize: 28, marginBottom: 8 }}>Tus datos</h2>
              <p style={{ color: "var(--muted)", marginBottom: 22 }}>
                {dayLabel(selectedDate)} a las {selectedSlot.time}
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                <Input icon={<User size={16} />} placeholder="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <Input icon={<Mail size={16} />} placeholder={selectedService.requireEmail ? "Email requerido" : "Email"} value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Input icon={<Phone size={16} />} placeholder={selectedService.requirePhone ? "Telefono requerido" : "Telefono"} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                {(selectedService.questions || []).map((q) => (
                  <label key={q.id} style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                    {q.label}{q.required ? " *" : ""}
                    {q.type === "textarea" ? (
                      <textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} style={fieldStyle} />
                    ) : (
                      <input value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} style={fieldStyle} />
                    )}
                  </label>
                ))}
                <textarea placeholder="Notas adicionales" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...fieldStyle, minHeight: 90 }} />
                {error ? <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p> : null}
                <button className="btn btn-primary" onClick={submit} disabled={!form.name || (selectedService.requireEmail && !form.email) || (selectedService.requirePhone && !form.phone)} style={{ justifyContent: "center", padding: "13px 18px" }}>
                  Confirmar reserva
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="between" style={{ marginBottom: 28 }}>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={circleBtn}><ChevronLeft size={18} /></button>
                <h2 style={{ fontSize: 18, textTransform: "capitalize" }}>{monthLabel(month)}</h2>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={circleBtn}><ChevronRight size={18} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {DAYS.map((day) => <div key={day} className="mono" style={{ textAlign: "center", color: "var(--muted)", fontSize: 10 }}>{day}</div>)}
                {monthDays(month).map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />;
                  const dateKey = ymd(date);
                  const disabled = date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || date > maxDate;
                  const isSelected = selectedDate === dateKey;
                  return (
                    <button
                      key={dateKey}
                      disabled={disabled}
                      onClick={() => setSelectedDate(dateKey)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "50%",
                        border: isSelected ? `1px solid ${active}` : "1px solid transparent",
                        background: isSelected ? active : disabled ? "transparent" : "color-mix(in srgb, var(--gold) 10%, white)",
                        color: isSelected ? "white" : disabled ? "var(--line-2)" : "var(--ink)",
                        fontWeight: 700,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="booking-times" style={{ padding: 34, borderLeft: "1px solid var(--line)" }}>
          <h3 style={{ fontSize: 16, marginBottom: 18, textTransform: "capitalize" }}>{dayLabel(selectedDate)}</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {loadingSlots ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Cargando horarios...</p> : null}
            {!loadingSlots && slots.map((slot) => (
              <button key={slot.utc} onClick={() => setSelectedSlot(slot)} style={{ padding: "13px 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${active} 36%, var(--line))`, background: "white", color: active, fontWeight: 700, cursor: "pointer" }}>
                {slot.time}
              </button>
            ))}
            {!loadingSlots && !slots.length ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No hay horarios disponibles para este dia.</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line-2)",
  borderRadius: 9,
  padding: "12px 13px",
  fontSize: 14,
};

const circleBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid var(--line)",
  background: "white",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

function Input({ icon, value, placeholder, onChange }: { icon: React.ReactNode; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label style={{ position: "relative", display: "block" }}>
      <span style={{ position: "absolute", left: 13, top: 13, color: "var(--muted)" }}>{icon}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...fieldStyle, paddingLeft: 40 }} />
    </label>
  );
}
