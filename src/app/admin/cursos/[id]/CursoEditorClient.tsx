"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/ui/ConfirmProvider";
import { DatePicker } from "@/components/ui/DatePicker";
import { SelectField } from "@/components/ui/SelectField";
import { apiErrorMessage } from "@/lib/apiError";
import { parseVideoUrl } from "@/lib/video";
import { DEFAULT_WHO_FOR, DEFAULT_FAQS } from "@/lib/courseDefaults";
import { isValidSlug, sanitizeSlugInput } from "@/lib/slug";
import { AIGenerateModal } from "./AIGenerateModal";
import { OutlineEditor } from "./OutlineEditor";

/* ───────────────── types ───────────────── */

type Accent = "accent" | "warm" | "green" | "navy" | "gold";

export type Program = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  type: string;
  durationLabel: string;
  priceUsd: number;
  priceCompareUsd: number | null;
  installmentPriceUsd: number | null;
  installmentCount: number | null;
  accent: Accent;
  description: string;
  bullets: string[];
  whoFor?: { t: string; d: string }[];
  faqs?: { q: string; a: string }[];
  modulesCount: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type ModuleRow = {
  id: string;
  programId: string;
  code: string;
  title: string;
  description: string;
  weekLabel: string;
  isBig: boolean;
  xpReward: number;
  sortOrder: number;
  lessonsCount: number;
};

export type LessonRow = {
  id: string;
  moduleId: string;
  code: string;
  title: string;
  kind: string;
  question: string | null;
  body: string;
  options: { key: string; text: string }[];
  correctKey: string;
  hint: string;
  explanation: string;
  xpReward: number;
  sortOrder: number;
  videoProvider?: string | null;
  videoId?: string | null;
  videoUrl?: string | null;
};

export type CohortRow = {
  id: string;
  programId: string;
  code: string;
  startsOn: string;
  endsOn: string;
  seatsTotal: number;
  seatsTaken: number;
  isOpen: boolean;
};

export type EnrollmentRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userLevel: number;
  cohortId: string | null;
  cohortCode: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
};

const TABS = [
  ["info", "Información"],
  ["structure", "Estructura"],
  ["cohorts", "Generaciones"],
  ["enrollments", "Inscritos"],
] as const;
type TabKey = (typeof TABS)[number][0];

const TYPES = ["taller", "curso", "certificacion", "consultoria", "agencia"];
const ACCENTS: Accent[] = ["accent", "warm", "green", "navy", "gold"];

/* ───────────────── root ───────────────── */

export function CursoEditorClient({
  program,
  modules,
  lessons,
  cohorts,
  enrollments,
  initialTab,
}: {
  program: Program;
  modules: ModuleRow[];
  lessons: LessonRow[];
  cohorts: CohortRow[];
  enrollments: EnrollmentRow[];
  initialTab: string;
}) {
  const router = useRouter();
  // Migración suave: links viejos a ?tab=modules o ?tab=lessons ahora abren "structure".
  const normalizedInitial =
    initialTab === "modules" || initialTab === "lessons" ? "structure" : initialTab;
  const startTab = (TABS.find(([k]) => k === normalizedInitial)?.[0] ?? "info") as TabKey;
  const [tab, setTab] = useState<TabKey>(startTab);

  // Lecciones de video sin link válido: bloquean activar el curso.
  const incompleteVideos = lessons.filter(
    (l) => l.kind === "video" && (!l.videoProvider || !l.videoId),
  ).length;

  function changeTab(t: TabKey) {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          background: "var(--bg)",
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <a
            href="/admin/cursos"
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "6px 10px",
              borderRadius: 6,
              background: "white",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              textDecoration: "none",
            }}
          >
            ← Cursos
          </a>
          <span
            className="mono"
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              background: program.isActive ? "var(--green-soft)" : "var(--bg-3)",
              color: program.isActive ? "var(--green-strong)" : "var(--muted)",
              fontWeight: 600,
            }}
          >
            {program.isActive ? "ACTIVE" : "DRAFT"}
          </span>
          {incompleteVideos > 0 && (
            <span
              className="mono"
              title="El curso no puede activarse hasta que todas las lecciones de video tengan su link."
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: "color-mix(in srgb, #d97706 16%, white)",
                color: "#b45309",
                fontWeight: 700,
              }}
            >
              ⚠️ {incompleteVideos} {incompleteVideos === 1 ? "VIDEO PENDIENTE" : "VIDEOS PENDIENTES"}
            </span>
          )}
          {program.isFeatured && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: "var(--gold-soft)",
                color: "var(--gold-deep)",
                border: "1px solid var(--gold-line)",
                fontWeight: 700,
              }}
            >
              FEATURED
            </span>
          )}
        </div>
        <a
          href={`/programas/${program.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          Ver en sitio →
        </a>
      </div>

      <div
        className="row"
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "0 24px",
          gap: 0,
          background: "white",
        }}
      >
        {TABS.map(([k, label]) => {
          const active = k === tab;
          return (
            <button
              key={k}
              onClick={() => changeTab(k)}
              className="mono"
              style={{
                background: "transparent",
                border: "none",
                padding: "14px 16px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: active ? "var(--ink)" : "var(--muted)",
                borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "info" && <InfoTab program={program} onSaved={() => router.refresh()} />}
      {tab === "structure" && (
        <StructureTab
          program={program}
          modules={modules}
          lessons={lessons}
          onChanged={() => router.refresh()}
        />
      )}
      {tab === "cohorts" && (
        <CohortsTab program={program} cohorts={cohorts} onChanged={() => router.refresh()} />
      )}
      {tab === "enrollments" && <EnrollmentsTab program={program} enrollments={enrollments} />}
    </>
  );
}

/* ───────────────── INFO TAB ───────────────── */

function InfoTab({ program, onSaved }: { program: Program; onSaved: () => void }) {
  // Precarga con los mismos textos por defecto que muestra la página pública
  // cuando el curso aún no tiene los suyos, para que admin y web coincidan.
  const initWhoFor = program.whoFor && program.whoFor.length > 0 ? program.whoFor : DEFAULT_WHO_FOR;
  const initFaqs = program.faqs && program.faqs.length > 0 ? program.faqs : DEFAULT_FAQS;
  const [form, setForm] = useState({
    ...program,
    whoFor: initWhoFor,
    faqs: initFaqs,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = useMemo(() => {
    const normalizedProgram = {
      ...program,
      whoFor: program.whoFor && program.whoFor.length > 0 ? program.whoFor : DEFAULT_WHO_FOR,
      faqs: program.faqs && program.faqs.length > 0 ? program.faqs : DEFAULT_FAQS,
    };
    return JSON.stringify(form) !== JSON.stringify(normalizedProgram);
  }, [form, program]);
  const slugValid = form.slug.length === 0 || isValidSlug(form.slug);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle || null,
        type: form.type,
        durationLabel: form.durationLabel || null,
        priceUsd: form.priceUsd,
        priceCompareUsd: form.priceCompareUsd,
        installmentPriceUsd: form.installmentPriceUsd,
        installmentCount: form.installmentCount,
        accent: form.accent,
        description: form.description || null,
        bullets: form.bullets.filter((b) => b.trim().length > 0),
        whoFor: (form.whoFor ?? [])
          .map((w) => ({ t: w.t.trim(), d: w.d.trim() }))
          .filter((w) => w.t.length > 0 || w.d.length > 0),
        faqs: (form.faqs ?? [])
          .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
          .filter((f) => f.q.length > 0 || f.a.length > 0),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      };
      const res = await fetch(`/api/admin/programs/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, "Error al guardar"));
      }
      setSavedAt(Date.now());
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "24px 32px" }}>
      <div
        className="between"
        style={{ marginBottom: 18, alignItems: "center", flexWrap: "wrap", gap: 10 }}
      >
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          {dirty ? (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: "var(--warm-soft)",
                color: "var(--gold-deep)",
                border: "1px solid var(--gold-line)",
                fontWeight: 700,
              }}
            >
              CAMBIOS SIN GUARDAR
            </span>
          ) : savedAt ? (
            <span
              className="mono"
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: "var(--green-soft)",
                color: "var(--green-strong)",
                fontWeight: 700,
              }}
            >
              GUARDADO ✓
            </span>
          ) : null}
        </div>
        <button
          onClick={save}
          disabled={busy || !dirty || !form.title || !form.slug || !slugValid}
          className="btn btn-primary"
          style={{ padding: "8px 16px", fontSize: 12 }}
        >
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px 24px",
          alignItems: "start",
          maxWidth: 1180,
        }}
      >
        {/* Fila: Título | Slug */}
        <Field label="Título">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={input()}
          />
        </Field>
        <Field label="Slug">
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: sanitizeSlugInput(e.target.value) })}
            style={{ ...input(), borderColor: slugValid ? undefined : "var(--red)" }}
            placeholder="curso-ia"
            spellCheck={false}
            autoCapitalize="off"
          />
          {!slugValid && (
            <div className="mono" style={{ fontSize: 10, color: "var(--red)", marginTop: 4 }}>
              Solo a-z, 0-9 y guiones simples. Ej: curso-ia
            </div>
          )}
        </Field>

        {/* Subtítulo a todo lo ancho */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Subtítulo (max 240)">
            <textarea
              value={form.subtitle}
              maxLength={240}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              style={{ ...input(), minHeight: 56 }}
            />
          </Field>
        </div>

        {/* Tipo | Duración */}
        <SelectField label="Tipo" size="md" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
        <Field label="Duración">
          <input
            value={form.durationLabel}
            onChange={(e) => setForm({ ...form, durationLabel: e.target.value })}
            placeholder="6 semanas"
            style={input()}
          />
        </Field>

        {/* Color acento | Visibilidad */}
        <SelectField label="Color acento" size="md" value={form.accent} onChange={(v) => setForm({ ...form, accent: v as Accent })} options={ACCENTS} />
        <Field label="Visibilidad">
          <div className="row" style={{ gap: 18, paddingTop: 8, flexWrap: "wrap" }}>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Activo
            </label>
            <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
              Destacado
            </label>
          </div>
        </Field>

        {/* Precios en 2 columnas */}
        <Field label="Precio (USD)">
          <input
            type="number"
            value={form.priceUsd}
            onChange={(e) => setForm({ ...form, priceUsd: parseInt(e.target.value || "0", 10) })}
            style={input()}
          />
        </Field>
        <Field label="Precio comparativo (USD)">
          <input
            type="number"
            value={form.priceCompareUsd ?? ""}
            onChange={(e) => setForm({ ...form, priceCompareUsd: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="opcional"
            style={input()}
          />
        </Field>
        <Field label="Precio mensualidad (USD)">
          <input
            type="number"
            value={form.installmentPriceUsd ?? ""}
            onChange={(e) => setForm({ ...form, installmentPriceUsd: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="opcional"
            style={input()}
          />
        </Field>
        <Field label="N° mensualidades">
          <input
            type="number"
            value={form.installmentCount ?? ""}
            onChange={(e) => setForm({ ...form, installmentCount: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="opcional"
            style={input()}
          />
        </Field>

        {/* Descripción larga + bullets a todo lo ancho */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Descripción larga (max 5000)">
            <textarea
              value={form.description}
              maxLength={5000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...input(), minHeight: 130 }}
            />
          </Field>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <BulletsEditor bullets={form.bullets} onChange={(b) => setForm({ ...form, bullets: b })} />
        </div>

        {/* Para quién | FAQ — lado a lado */}
        <WhoForEditor items={form.whoFor} onChange={(w) => setForm({ ...form, whoFor: w })} />
        <FaqsEditor items={form.faqs} onChange={(f) => setForm({ ...form, faqs: f })} />

        {err && (
          <div style={{ gridColumn: "1 / -1" }}>
            <ErrorBanner msg={err} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── BULLETS ───────────────── */

function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  return (
    <Field label="Bullets (lista de puntos)">
      <div className="col" style={{ gap: 6 }}>
        {bullets.map((b, i) => (
          <div key={i} className="row" style={{ gap: 6 }}>
            <input
              value={b}
              maxLength={140}
              onChange={(e) => {
                const next = [...bullets];
                next[i] = e.target.value;
                onChange(next);
              }}
              style={{ ...input(), flex: 1 }}
              placeholder="Punto del programa..."
            />
            <button
              type="button"
              onClick={() => onChange(bullets.filter((_, j) => j !== i))}
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "0 12px",
                borderRadius: 6,
                background: "white",
                color: "var(--red)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
              aria-label="Quitar bullet"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...bullets, ""])}
          disabled={bullets.length >= 20}
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            background: "var(--bg-2)",
            color: "var(--ink-2)",
            border: "1px dashed var(--line-2)",
            cursor: bullets.length >= 20 ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
            marginTop: 2,
          }}
        >
          + Agregar bullet
        </button>
      </div>
    </Field>
  );
}

/* ───────────────── WHO-FOR ("Este curso es para ti si…") ───────────────── */

function WhoForEditor({
  items,
  onChange,
}: {
  items: { t: string; d: string }[];
  onChange: (w: { t: string; d: string }[]) => void;
}) {
  return (
    <Field label="¿Para quién es? — Este curso es para ti si…">
      <div className="col" style={{ gap: 10 }}>
        {items.map((w, i) => (
          <div
            key={i}
            className="col"
            style={{
              gap: 6,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
            }}
          >
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <input
                value={w.t}
                maxLength={120}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], t: e.target.value };
                  onChange(next);
                }}
                style={{ ...input(), flex: 1 }}
                placeholder="Título corto (ej: Eres emprendedor)"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "0 12px",
                  height: 36,
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
                aria-label="Quitar item"
              >
                ×
              </button>
            </div>
            <textarea
              value={w.d}
              maxLength={300}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], d: e.target.value };
                onChange(next);
              }}
              style={{ ...input(), minHeight: 56 }}
              placeholder="Descripción de por qué este curso es para ese perfil…"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { t: "", d: "" }])}
          disabled={items.length >= 8}
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            background: "var(--bg-2)",
            color: "var(--ink-2)",
            border: "1px dashed var(--line-2)",
            cursor: items.length >= 8 ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
            marginTop: 2,
          }}
        >
          + Agregar
        </button>
      </div>
    </Field>
  );
}

/* ───────────────── FAQS ("Preguntas frecuentes") ───────────────── */

function FaqsEditor({
  items,
  onChange,
}: {
  items: { q: string; a: string }[];
  onChange: (f: { q: string; a: string }[]) => void;
}) {
  return (
    <Field label="Preguntas frecuentes">
      <div className="col" style={{ gap: 10 }}>
        {items.map((f, i) => (
          <div
            key={i}
            className="col"
            style={{
              gap: 6,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
            }}
          >
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <input
                value={f.q}
                maxLength={200}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], q: e.target.value };
                  onChange(next);
                }}
                style={{ ...input(), flex: 1 }}
                placeholder="Pregunta"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "0 12px",
                  height: 36,
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
                aria-label="Quitar pregunta"
              >
                ×
              </button>
            </div>
            <textarea
              value={f.a}
              maxLength={800}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], a: e.target.value };
                onChange(next);
              }}
              style={{ ...input(), minHeight: 70 }}
              placeholder="Respuesta"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { q: "", a: "" }])}
          disabled={items.length >= 15}
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            background: "var(--bg-2)",
            color: "var(--ink-2)",
            border: "1px dashed var(--line-2)",
            cursor: items.length >= 15 ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
            marginTop: 2,
          }}
        >
          + Agregar pregunta
        </button>
      </div>
    </Field>
  );
}

/* ───────────────── MODULES TAB ───────────────── */

type ModuleForm = {
  code: string;
  title: string;
  description: string;
  weekLabel: string;
  isBig: boolean;
  xpReward: number;
  sortOrder: number;
};

/* ───────────────── STRUCTURE TAB (outline editor) ─────────────────
 * Unifica los antiguos tabs "Módulos" y "Lecciones" en una sola vista
 * jerárquica tipo árbol expandible. Reusa los Dialogs existentes
 * (ModuleDialog, LessonDialog) para editar detalles cuando el admin
 * hace click en un item. Soporta drag & drop, quick-add inline y la
 * generación con IA arriba.
 */
function StructureTab({
  program,
  modules,
  lessons,
  onChanged,
}: {
  program: Program;
  modules: ModuleRow[];
  lessons: LessonRow[];
  onChanged: () => void;
}) {
  const [editingModule, setEditingModule] = useState<ModuleRow | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
  const [creatingLessonInModule, setCreatingLessonInModule] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"doc" | "scratch" | null>(null);

  return (
    <div>
      {/* AI generation banner — el mismo que tenía ModulesTab */}
      <div
        style={{
          padding: "18px 24px 4px 24px",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--gold) 8%, white) 0%, white 100%)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", fontWeight: 800, letterSpacing: "0.1em" }}>
          ✨ GENERAR CON IA
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
            paddingBottom: 14,
          }}
          className="ai-cards-grid"
        >
          <AICta
            title="Desde un documento"
            desc="Sube .md / .pdf / .docx o pega texto. Claude lo estructura como módulos + lecciones."
            icon="📄"
            onClick={() => setAiMode("doc")}
          />
          <AICta
            title="Desde cero"
            desc="Solo escribe un brief del curso. Claude inventa módulos y lecciones desde cero."
            icon="🧠"
            onClick={() => setAiMode("scratch")}
          />
        </div>
        <style>{`@media (max-width: 720px) { .ai-cards-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>

      {/* Outline tree */}
      <OutlineEditor
        program={program}
        modules={modules}
        lessons={lessons}
        onEditModule={(m) => setEditingModule(m)}
        onEditLesson={(l) => setEditingLesson(l)}
        onAddModule={() => setCreatingModule(true)}
        onAddLessonToModule={(mid) => setCreatingLessonInModule(mid)}
        onChanged={onChanged}
      />

      {/* Dialogs reusados */}
      {(editingModule || creatingModule) && (
        <ModuleDialog
          programId={program.id}
          module={editingModule}
          existingCount={modules.length}
          onClose={() => {
            setEditingModule(null);
            setCreatingModule(false);
          }}
          onSaved={() => {
            setEditingModule(null);
            setCreatingModule(false);
            onChanged();
          }}
        />
      )}
      {(editingLesson || creatingLessonInModule) && (
        <LessonDialog
          moduleId={creatingLessonInModule ?? editingLesson?.moduleId ?? ""}
          lesson={editingLesson}
          existingCount={
            creatingLessonInModule
              ? lessons.filter((l) => l.moduleId === creatingLessonInModule).length
              : 0
          }
          onClose={() => {
            setEditingLesson(null);
            setCreatingLessonInModule(null);
          }}
          onSaved={() => {
            setEditingLesson(null);
            setCreatingLessonInModule(null);
            onChanged();
          }}
        />
      )}

      {aiMode && (
        <AIGenerateModal
          programId={program.id}
          initialMode={aiMode}
          hasExistingModules={modules.length > 0}
          onClose={() => setAiMode(null)}
          onCreated={onChanged}
        />
      )}
    </div>
  );
}

function ModulesTab({
  program,
  modules,
  onChanged,
  onGotoLessons,
}: {
  program: Program;
  modules: ModuleRow[];
  onChanged: () => void;
  onGotoLessons: (mid: string) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiMode, setAiMode] = useState<"doc" | "scratch" | null>(null);
  const [busy, setBusy] = useState(false);

  async function del(id: string) {
    const ok = await confirm({
      title: "¿Eliminar este módulo?",
      description: "Borra también sus lecciones.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar el módulo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* AI generation banner */}
      <div
        style={{
          padding: "18px 24px 4px 24px",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--gold) 8%, white) 0%, white 100%)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="mono" style={{ fontSize: 10, color: "var(--gold-deep)", fontWeight: 800, letterSpacing: "0.1em" }}>
          ✨ GENERAR CON IA
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
          className="ai-cards-grid"
        >
          <AICta
            title="Desde un documento"
            desc="Sube .md / .pdf / .docx o pega texto. Claude lo estructura como módulos + lecciones."
            icon="📄"
            onClick={() => setAiMode("doc")}
          />
          <AICta
            title="Desde cero"
            desc="Solo escribe un brief del curso. Claude inventa módulos y lecciones desde cero."
            icon="🧠"
            onClick={() => setAiMode("scratch")}
          />
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
            ¿Prefieres hacerlo manual?
          </span>
          <button
            onClick={() => setCreating(true)}
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: 11 }}
          >
            + Crear módulo manualmente
          </button>
        </div>
        <style>{`@media (max-width: 720px) { .ai-cards-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>

      <div
        className="row"
        style={{
          padding: "12px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ width: 50 }}>#</span>
        <span style={{ width: 70 }}>Código</span>
        <span style={{ flex: 1 }}>Título</span>
        <span style={{ width: 100 }}>Semana</span>
        <span style={{ width: 60, textAlign: "right" }}>XP</span>
        <span style={{ width: 80, textAlign: "right" }}>Lecciones</span>
        <span style={{ width: 70 }}>Tipo</span>
        <span style={{ width: 220, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {modules.map((m) => (
          <div
            key={m.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <span className="mono" style={{ width: 50, fontSize: 12, color: "var(--muted)" }}>
              {m.sortOrder}
            </span>
            <span className="mono" style={{ width: 70, fontSize: 12, fontWeight: 700 }}>
              {m.code}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
              {m.description && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {m.description.slice(0, 100)}
                  {m.description.length > 100 ? "…" : ""}
                </div>
              )}
            </div>
            <span className="mono" style={{ width: 100, fontSize: 11, color: "var(--ink-2)" }}>
              {m.weekLabel || "—"}
            </span>
            <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12 }}>
              {m.xpReward}
            </span>
            <span className="mono" style={{ width: 80, textAlign: "right", fontSize: 12 }}>
              {m.lessonsCount}
            </span>
            <span style={{ width: 70 }}>
              {m.isBig && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "var(--gold-soft)",
                    color: "var(--gold-deep)",
                    border: "1px solid var(--gold-line)",
                    fontWeight: 700,
                  }}
                >
                  BIG
                </span>
              )}
            </span>
            <span className="row" style={{ width: 220, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => onGotoLessons(m.id)}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Lecciones ({m.lessonsCount})
              </button>
              <button
                onClick={() => setEditing(m)}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Editar
              </button>
              <button
                onClick={() => del(m.id)}
                disabled={busy}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
        {modules.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin módulos. Crea el primero.
          </div>
        )}
      </div>

      {(editing || creating) && (
        <ModuleDialog
          programId={program.id}
          module={editing}
          existingCount={modules.length}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            onChanged();
          }}
        />
      )}

      {aiMode && (
        <AIGenerateModal
          programId={program.id}
          initialMode={aiMode}
          hasExistingModules={modules.length > 0}
          onClose={() => setAiMode(null)}
          onCreated={onChanged}
        />
      )}
    </div>
  );
}

/** Card grande con CTA para uno de los dos modos de IA. */
function AICta({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "white",
        border: "1.5px solid rgba(216,168,63,0.30)",
        borderRadius: 14,
        padding: "16px 18px",
        cursor: "pointer",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        transition: "transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
        boxShadow: "0 4px 10px rgba(10,30,58,0.05)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--gold)";
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(216,168,63,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = "rgba(216,168,63,0.30)";
        e.currentTarget.style.boxShadow = "0 4px 10px rgba(10,30,58,0.05)";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(160deg, #F2C65A 0%, #B88523 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
          boxShadow: "0 3px 0 #B88523",
        }}
        aria-hidden
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
      <span style={{ color: "var(--gold-deep)", fontSize: 22, fontWeight: 800 }}>→</span>
    </button>
  );
}

function ModuleDialog({
  programId,
  module: mod,
  existingCount,
  onClose,
  onSaved,
}: {
  programId: string;
  module: ModuleRow | null;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ModuleForm>({
    code: mod?.code ?? `M${String(existingCount + 1).padStart(2, "0")}`,
    title: mod?.title ?? "",
    description: mod?.description ?? "",
    weekLabel: mod?.weekLabel ?? "",
    isBig: mod?.isBig ?? false,
    xpReward: mod?.xpReward ?? 60,
    sortOrder: mod?.sortOrder ?? existingCount,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const url = mod ? `/api/admin/modules/${mod.id}` : `/api/admin/modules`;
      const method = mod ? "PUT" : "POST";
      const payload = mod
        ? form
        : { programId, ...form };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, "Error al guardar"));
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={mod ? "Editar módulo" : "Nuevo módulo"} onClose={onClose}>
      <div className="col" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 120 }}>
            <Field label="Código">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                style={input()}
                placeholder="M01"
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Título">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={input()}
              />
            </Field>
          </div>
        </div>
        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ ...input(), minHeight: 80 }}
          />
        </Field>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Etiqueta de semana">
              <input
                value={form.weekLabel}
                onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
                style={input()}
                placeholder="Semana 1"
              />
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="XP">
              <input
                type="number"
                value={form.xpReward}
                onChange={(e) =>
                  setForm({ ...form, xpReward: parseInt(e.target.value || "0", 10) })
                }
                style={input()}
              />
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="Orden">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: parseInt(e.target.value || "0", 10) })
                }
                style={input()}
              />
            </Field>
          </div>
        </div>
        <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.isBig}
            onChange={(e) => setForm({ ...form, isBig: e.target.checked })}
          />
          Módulo destacado (big project)
        </label>
      </div>
      <DialogFooter
        busy={busy}
        err={err}
        onCancel={onClose}
        onSave={save}
        canSave={!!form.code && !!form.title}
        saveLabel={mod ? "Guardar" : "Crear"}
      />
    </Modal>
  );
}

/* ───────────────── LESSONS TAB ───────────────── */

function LessonsTab({
  modules,
  lessons,
  onChanged,
}: {
  modules: ModuleRow[];
  lessons: LessonRow[];
  onChanged: () => void;
}) {
  const [selectedModule, setSelectedModule] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("module");
      if (fromUrl && modules.some((m) => m.id === fromUrl)) return fromUrl;
    }
    return modules[0]?.id ?? "";
  });
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = lessons.filter((l) => l.moduleId === selectedModule);

  async function del(id: string) {
    const ok = await confirm({
      title: "¿Eliminar esta lección?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar la lección");
    } finally {
      setBusy(false);
    }
  }

  if (modules.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
        Crea primero un módulo en la pestaña Módulos.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SelectField
          label="Módulo"
          size="md"
          value={selectedModule}
          onChange={(v) => setSelectedModule(v)}
          options={modules.map((m) => ({ value: m.id, label: `${m.code} — ${m.title}` }))}
          style={{ width: 320 }}
        />
        <button
          onClick={() => setCreating(true)}
          disabled={!selectedModule}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          + Nueva lección
        </button>
      </div>

      <div
        className="row"
        style={{
          padding: "12px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ width: 50 }}>#</span>
        <span style={{ width: 90 }}>Código</span>
        <span style={{ flex: 1 }}>Título</span>
        <span style={{ width: 130 }}>Tipo</span>
        <span style={{ width: 60, textAlign: "right" }}>XP</span>
        <span style={{ width: 200, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((l) => (
          <div
            key={l.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <span className="mono" style={{ width: 50, fontSize: 12, color: "var(--muted)" }}>
              {l.sortOrder}
            </span>
            <span className="mono" style={{ width: 90, fontSize: 12, fontWeight: 700 }}>
              {l.code}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {l.kind === "video"
                  ? "🎬 Video"
                  : (l.question ?? "").slice(0, 90) + ((l.question ?? "").length > 90 ? "…" : "")}
              </div>
            </div>
            <span style={{ width: 130 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                {l.kind.toUpperCase()}
              </span>
            </span>
            <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12 }}>
              {l.xpReward}
            </span>
            <span className="row" style={{ width: 200, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => setEditing(l)}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Editar
              </button>
              <button
                onClick={() => del(l.id)}
                disabled={busy}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin lecciones en este módulo. Crea la primera.
          </div>
        )}
      </div>

      {(editing || creating) && selectedModule && (
        <LessonDialog
          moduleId={selectedModule}
          lesson={editing}
          existingCount={filtered.length}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

type LessonForm = {
  code: string;
  title: string;
  kind: string;
  question: string;
  body: string;
  options: { key: string; text: string }[];
  correctKey: string;
  hint: string;
  explanation: string;
  xpReward: number;
  sortOrder: number;
  videoUrl: string;
};

const KEY_LETTERS = ["a", "b", "c", "d", "e", "f"];

function LessonDialog({
  moduleId,
  lesson,
  existingCount,
  onClose,
  onSaved,
}: {
  moduleId: string;
  lesson: LessonRow | null;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LessonForm>(() => {
    if (lesson) {
      const existingVideoUrl = lesson.videoUrl
        ? lesson.videoUrl
        : lesson.videoProvider === "vimeo" && lesson.videoId
          ? `https://vimeo.com/${lesson.videoId}`
          : lesson.videoProvider === "youtube" && lesson.videoId
            ? `https://youtu.be/${lesson.videoId}`
            : "";
      return {
        code: lesson.code,
        title: lesson.title,
        kind: lesson.kind,
        question: lesson.question ?? "",
        body: lesson.body,
        options: lesson.options.length > 0 ? lesson.options : [
          { key: "a", text: "" },
          { key: "b", text: "" },
        ],
        correctKey: lesson.correctKey || "a",
        hint: lesson.hint,
        explanation: lesson.explanation,
        xpReward: lesson.xpReward,
        sortOrder: lesson.sortOrder,
        videoUrl: existingVideoUrl,
      };
    }
    return {
      code: `L${String(existingCount + 1).padStart(2, "0")}`,
      title: "",
      kind: "multiple_choice",
      question: "",
      body: "",
      options: [
        { key: "a", text: "" },
        { key: "b", text: "" },
      ],
      correctKey: "a",
      hint: "",
      explanation: "",
      xpReward: 15,
      sortOrder: existingCount,
      videoUrl: "",
    };
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setOption(i: number, text: string) {
    const next = form.options.map((o, j) => (j === i ? { ...o, text } : o));
    setForm({ ...form, options: next });
  }
  function addOption() {
    if (form.options.length >= 6) return;
    const key = KEY_LETTERS[form.options.length];
    setForm({ ...form, options: [...form.options, { key, text: "" }] });
  }
  function removeOption(i: number) {
    if (form.options.length <= 2) return;
    const next = form.options.filter((_, j) => j !== i).map((o, j) => ({ ...o, key: KEY_LETTERS[j] }));
    const correctKey = next.some((o) => o.key === form.correctKey) ? form.correctKey : next[0].key;
    setForm({ ...form, options: next, correctKey });
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const url = lesson ? `/api/admin/lessons/${lesson.id}` : `/api/admin/lessons`;
      const method = lesson ? "PUT" : "POST";
      const isVideo = form.kind === "video";
      const payload: Record<string, unknown> = {
        ...(lesson ? {} : { moduleId }),
        code: form.code,
        title: form.title,
        kind: form.kind,
        body: form.body || null,
        hint: form.hint || null,
        explanation: form.explanation || null,
        xpReward: form.xpReward,
        sortOrder: form.sortOrder,
      };
      if (isVideo) {
        payload.videoUrl = form.videoUrl || null;
        payload.question = form.question || null;
      } else {
        payload.question = form.question;
        payload.options = form.options.map((o) => ({ key: o.key, text: o.text }));
        payload.correctKey = form.correctKey;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, "Error al guardar"));
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isVideo = form.kind === "video";
  // El video NO es obligatorio para guardar (borrador). Pero avisamos si la URL
  // tecleada todavía no se reconoce: el curso no podrá activarse hasta tenerla.
  const videoUrlTyped = form.videoUrl.trim();
  const videoUrlInvalid = isVideo && videoUrlTyped.length > 0 && !parseVideoUrl(videoUrlTyped);
  const videoMissing = isVideo && videoUrlTyped.length === 0;
  const canSave = isVideo
    ? !!form.code && !!form.title
    : !!form.code &&
      !!form.title &&
      !!form.question &&
      form.options.length >= 2 &&
      form.options.every((o) => o.text.trim().length > 0) &&
      form.options.some((o) => o.key === form.correctKey);

  return (
    <Modal title={lesson ? "Editar lección" : "Nueva lección"} onClose={onClose} maxWidth={700}>
      <div className="col" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 140 }}>
            <Field label="Código">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                style={input()}
                placeholder="M01-L01"
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Título">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={input()}
              />
            </Field>
          </div>
          <div style={{ width: 170 }}>
            <SelectField
              label="Tipo"
              size="md"
              value={form.kind}
              onChange={(v) => setForm({ ...form, kind: v })}
              options={[
                { value: "video", label: "🎬 Video (Vimeo/YouTube)" },
                { value: "multiple_choice", label: "Quiz: opción múltiple" },
                { value: "true_false", label: "Quiz: verdadero/falso" },
              ]}
            />
          </div>
        </div>

        {isVideo ? (
          <>
            <Field label="URL del video (Vimeo o YouTube)">
              <input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                style={input()}
                placeholder="https://vimeo.com/123456789  ó  https://youtu.be/xyz"
              />
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                Pega la URL completa de Vimeo o YouTube. Nosotros extraemos el ID. Puedes dejarlo
                vacío y completarlo después — el curso no podrá activarse hasta que todos los videos
                estén listos.
              </div>
              {videoUrlInvalid ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 11px",
                    borderRadius: 8,
                    background: "color-mix(in srgb, #d97706 12%, white)",
                    border: "1px solid color-mix(in srgb, #d97706 35%, white)",
                    color: "#b45309",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Esta URL aún no se reconoce como Vimeo o YouTube. Se guarda como borrador, pero
                  el curso no podrá activarse hasta tener un link válido.
                </div>
              ) : videoMissing ? (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>
                  Sin video todavía · quedará como borrador.
                </div>
              ) : null}
            </Field>
            <Field label="Descripción (texto que aparece debajo del video)">
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                style={{ ...input(), minHeight: 100 }}
                placeholder="Notas, recursos, transcripción..."
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Pregunta (obligatoria)">
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                style={{ ...input(), minHeight: 80 }}
              />
            </Field>
            <Field label="Body (texto opcional antes de la pregunta)">
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                style={{ ...input(), minHeight: 70 }}
              />
            </Field>

            <Field label={`Opciones (${form.options.length}/6 — mínimo 2)`}>
          <div className="col" style={{ gap: 6 }}>
            {form.options.map((o, i) => (
              <div key={o.key} className="row" style={{ gap: 6, alignItems: "center" }}>
                <label
                  className="row"
                  style={{
                    gap: 6,
                    alignItems: "center",
                    cursor: "pointer",
                    width: 70,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="radio"
                    name="correctKey"
                    checked={form.correctKey === o.key}
                    onChange={() => setForm({ ...form, correctKey: o.key })}
                  />
                  <span className="mono" style={{ textTransform: "uppercase" }}>
                    {o.key}
                  </span>
                </label>
                <input
                  value={o.text}
                  onChange={(e) => setOption(i, e.target.value)}
                  style={{ ...input(), flex: 1 }}
                  placeholder={`Texto de la opción ${o.key.toUpperCase()}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={form.options.length <= 2}
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "0 12px",
                    borderRadius: 6,
                    background: "white",
                    color: form.options.length <= 2 ? "var(--muted)" : "var(--red)",
                    border: "1px solid var(--line)",
                    cursor: form.options.length <= 2 ? "not-allowed" : "pointer",
                    height: 36,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              disabled={form.options.length >= 6}
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--bg-2)",
                color: "var(--ink-2)",
                border: "1px dashed var(--line-2)",
                cursor: form.options.length >= 6 ? "not-allowed" : "pointer",
                alignSelf: "flex-start",
                marginTop: 2,
              }}
            >
              + Agregar opción
            </button>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
              Marca con el radio la opción correcta.
            </div>
          </div>
        </Field>

        <Field label="Hint (opcional)">
          <input
            value={form.hint}
            onChange={(e) => setForm({ ...form, hint: e.target.value })}
            style={input()}
          />
        </Field>
        <Field label="Explicación (opcional, se muestra después)">
          <textarea
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            style={{ ...input(), minHeight: 70 }}
          />
        </Field>
          </>
        )}
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 110 }}>
            <Field label="XP">
              <input
                type="number"
                value={form.xpReward}
                onChange={(e) =>
                  setForm({ ...form, xpReward: parseInt(e.target.value || "0", 10) })
                }
                style={input()}
              />
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="Orden">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: parseInt(e.target.value || "0", 10) })
                }
                style={input()}
              />
            </Field>
          </div>
        </div>
      </div>
      <DialogFooter
        busy={busy}
        err={err}
        onCancel={onClose}
        onSave={save}
        canSave={canSave}
        saveLabel={lesson ? "Guardar" : "Crear"}
      />
    </Modal>
  );
}

/* ───────────────── COHORTS TAB ───────────────── */

type CohortForm = {
  code: string;
  startsOn: string;
  endsOn: string;
  seatsTotal: number;
  isOpen: boolean;
};

function CohortsTab({
  program,
  cohorts,
  onChanged,
}: {
  program: Program;
  cohorts: CohortRow[];
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<CohortRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del(id: string) {
    const ok = await confirm({
      title: "¿Eliminar esta generación?",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar la generación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        style={{
          padding: "14px 24px",
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
          + Nueva generación
        </button>
      </div>

      <div
        className="row"
        style={{
          padding: "12px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ width: 110 }}>Código</span>
        <span style={{ width: 130 }}>Inicio</span>
        <span style={{ width: 130 }}>Fin</span>
        <span style={{ flex: 1, textAlign: "right" }}>Cupos</span>
        <span style={{ width: 90 }}>Estado</span>
        <span style={{ width: 180, textAlign: "right" }}>Acciones</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {cohorts.map((c) => (
          <div
            key={c.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <span className="mono" style={{ width: 110, fontSize: 12, fontWeight: 700 }}>
              {c.code || "—"}
            </span>
            <span className="mono" style={{ width: 130, fontSize: 12 }}>
              {c.startsOn}
            </span>
            <span className="mono" style={{ width: 130, fontSize: 12 }}>
              {c.endsOn}
            </span>
            <span className="mono" style={{ flex: 1, textAlign: "right", fontSize: 12 }}>
              {c.seatsTaken} / {c.seatsTotal}
            </span>
            <span style={{ width: 90 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: c.isOpen ? "var(--green-soft)" : "var(--bg-3)",
                  color: c.isOpen ? "var(--green-strong)" : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {c.isOpen ? "ABIERTA" : "CERRADA"}
              </span>
            </span>
            <span className="row" style={{ width: 180, justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={() => setEditing(c)}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Editar
              </button>
              <button
                onClick={() => del(c.id)}
                disabled={busy}
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "white",
                  color: "var(--red)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
        {cohorts.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Sin generaciones. Crea la primera.
          </div>
        )}
      </div>

      {(editing || creating) && (
        <CohortDialog
          programId={program.id}
          cohort={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function CohortDialog({
  programId,
  cohort,
  onClose,
  onSaved,
}: {
  programId: string;
  cohort: CohortRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CohortForm>({
    code: cohort?.code ?? "",
    startsOn: cohort?.startsOn ?? "",
    endsOn: cohort?.endsOn ?? "",
    seatsTotal: cohort?.seatsTotal ?? 30,
    isOpen: cohort?.isOpen ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const url = cohort ? `/api/admin/cohorts/${cohort.id}` : `/api/admin/cohorts`;
      const method = cohort ? "PUT" : "POST";
      const payload = cohort
        ? { code: form.code || null, startsOn: form.startsOn, endsOn: form.endsOn, seatsTotal: form.seatsTotal, isOpen: form.isOpen }
        : { programId, code: form.code || null, startsOn: form.startsOn, endsOn: form.endsOn, seatsTotal: form.seatsTotal, isOpen: form.isOpen };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, "Error al guardar"));
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canSave =
    !!form.startsOn &&
    !!form.endsOn &&
    form.startsOn < form.endsOn &&
    form.seatsTotal > 0;

  return (
    <Modal title={cohort ? "Editar generación" : "Nueva generación"} onClose={onClose} maxWidth={640} overflowVisible>
      <div className="col" style={{ gap: 16 }}>
        <Field label="Código (opcional)">
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            style={input()}
            placeholder="C-2025-Q3"
          />
        </Field>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Fecha de inicio">
              <DatePicker
                value={form.startsOn}
                onChange={(v) => setForm({ ...form, startsOn: v })}
                placeholder="Selecciona fecha"
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Fecha de fin">
              <DatePicker
                value={form.endsOn}
                onChange={(v) => setForm({ ...form, endsOn: v })}
                placeholder="Selecciona fecha"
                min={form.startsOn || undefined}
              />
            </Field>
          </div>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div style={{ width: 160 }}>
            <Field label="Cupos totales">
              <input
                type="number"
                min={1}
                value={form.seatsTotal}
                onChange={(e) =>
                  setForm({ ...form, seatsTotal: parseInt(e.target.value || "1", 10) })
                }
                style={input()}
              />
            </Field>
          </div>
          <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer", paddingBottom: 10 }}>
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
            />
            Generación abierta a inscripciones
          </label>
        </div>
        {cohort && (
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            Inscritos actuales: {cohort.seatsTaken} (no editable — se calcula con enrollments)
          </div>
        )}
      </div>
      <DialogFooter
        busy={busy}
        err={err}
        onCancel={onClose}
        onSave={save}
        canSave={canSave}
        saveLabel={cohort ? "Guardar" : "Crear"}
      />
    </Modal>
  );
}

/* ───────────────── ENROLLMENTS TAB ───────────────── */

function EnrollmentsTab({
  program,
  enrollments,
}: {
  program: Program;
  enrollments: EnrollmentRow[];
}) {
  const [q, setQ] = useState("");

  const filtered = enrollments.filter((e) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      e.userName.toLowerCase().includes(needle) ||
      e.userEmail.toLowerCase().includes(needle)
    );
  });

  return (
    <div>
      <div
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          style={{ ...input(), maxWidth: 320 }}
        />
        <a
          href={`/api/admin/export?type=enrollments&programId=${program.id}`}
          className="btn btn-ghost"
          style={{ padding: "8px 14px", fontSize: 12, textDecoration: "none" }}
        >
          Exportar CSV
        </a>
      </div>

      <div
        className="row"
        style={{
          padding: "12px 24px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ flex: 2 }}>Alumno</span>
        <span style={{ width: 60, textAlign: "right" }}>Nivel</span>
        <span style={{ width: 110 }}>Generación</span>
        <span style={{ width: 100 }}>Status</span>
        <span style={{ width: 140 }}>Inscrito</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {filtered.map((e) => (
          <div
            key={e.id}
            className="row"
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "white",
            }}
          >
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.userName}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {e.userEmail}
              </div>
            </div>
            <span className="mono" style={{ width: 60, textAlign: "right", fontSize: 12 }}>
              Lv {e.userLevel}
            </span>
            <span className="mono" style={{ width: 110, fontSize: 11 }}>
              {e.cohortCode || "—"}
            </span>
            <span style={{ width: 100 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background:
                    e.status === "completed"
                      ? "var(--green-soft)"
                      : e.status === "active"
                        ? "var(--accent-soft)"
                        : "var(--bg-3)",
                  color:
                    e.status === "completed"
                      ? "var(--green-strong)"
                      : e.status === "active"
                        ? "var(--accent)"
                        : "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {e.status.toUpperCase()}
              </span>
            </span>
            <span className="mono" style={{ width: 140, fontSize: 11, color: "var(--muted)" }}>
              {new Date(e.enrolledAt).toLocaleDateString()}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            {enrollments.length === 0 ? "Aún no hay inscritos." : "Sin coincidencias."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── shared UI bits ───────────────── */

function Modal({
  title,
  onClose,
  children,
  maxWidth = 600,
  overflowVisible = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  // Para modales cortos con popovers (ej. DatePicker): no recortar el calendario.
  overflowVisible?: boolean;
}) {
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
          maxWidth,
          width: "100%",
          maxHeight: overflowVisible ? undefined : "90vh",
          overflow: overflowVisible ? "visible" : "auto",
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, marginBottom: 18 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function DialogFooter({
  busy,
  err,
  onCancel,
  onSave,
  canSave,
  saveLabel,
}: {
  busy: boolean;
  err: string | null;
  onCancel: () => void;
  onSave: () => void;
  canSave: boolean;
  saveLabel: string;
}) {
  return (
    <>
      {err && <ErrorBanner msg={err} />}
      <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <button onClick={onCancel} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={busy || !canSave}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          {busy ? "Guardando…" : saveLabel}
        </button>
      </div>
    </>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
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
      {msg}
    </div>
  );
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

function input(): React.CSSProperties {
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
