"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Confirm + Toast UI premium para reemplazar window.confirm / window.alert /
 * window.prompt en TODA la plataforma. La regla: no usar nunca los modales
 * nativos del navegador (rompen la consistencia visual).
 *
 * Uso típico:
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "¿Eliminar curso?",
 *     description: "Borra también sus módulos y lecciones.",
 *     confirmLabel: "Eliminar",
 *     tone: "danger",
 *   });
 *   if (!ok) return;
 *
 *   const toast = useToast();
 *   toast.error("No se pudo guardar");
 *   toast.success("Curso creado");
 */

type Tone = "primary" | "danger" | "warm";

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; body: string };

type Ctx = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  toast: {
    success: (body: string) => void;
    error: (body: string) => void;
    info: (body: string) => void;
  };
};

const ConfirmCtx = createContext<Ctx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<
    (ConfirmOpts & { resolve: (v: boolean) => void }) | null
  >(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    [],
  );

  const pushToast = useCallback((kind: ToastKind, body: string) => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, kind, body }]);
    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toast = {
    success: useCallback((b: string) => pushToast("success", b), [pushToast]),
    error: useCallback((b: string) => pushToast("error", b), [pushToast]),
    info: useCallback((b: string) => pushToast("info", b), [pushToast]),
  };

  // Close on Esc / Enter for the confirm dialog.
  useEffect(() => {
    if (!confirmState) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        confirmState!.resolve(false);
        setConfirmState(null);
      } else if (e.key === "Enter") {
        confirmState!.resolve(true);
        setConfirmState(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmState]);

  return (
    <ConfirmCtx.Provider value={{ confirm, toast }}>
      {children}

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog
          opts={confirmState}
          onConfirm={() => {
            confirmState.resolve(true);
            setConfirmState(null);
          }}
          onCancel={() => {
            confirmState.resolve(false);
            setConfirmState(null);
          }}
        />
      )}

      {/* Toast stack — bottom right */}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxWidth: 360,
            pointerEvents: "none",
          }}
          role="region"
          aria-label="Notificaciones"
        >
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
          ))}
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/** Hook for triggering a confirm modal. Returns a Promise<boolean>. */
export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    // Fallback to native confirm in dev if provider is missing — should never
    // happen in production, but avoids hard crash.
    return (opts: ConfirmOpts) => Promise.resolve(typeof window !== "undefined" && window.confirm(opts.title));
  }
  return ctx.confirm;
}

/** Hook for showing toast notifications. */
export function useToast() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    return {
      success: (b: string) => console.log("[toast.success]", b),
      error: (b: string) => console.error("[toast.error]", b),
      info: (b: string) => console.info("[toast.info]", b),
    };
  }
  return ctx.toast;
}

/* ───────────────── Dialog UI ───────────────── */
function ConfirmDialog({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmOpts;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tone = opts.tone ?? "primary";
  const palette =
    tone === "danger"
      ? { bg: "#b32f1a", shadow: "#7a1d0d", hover: "#cf3a23" }
      : tone === "warm"
        ? { bg: "#E89B3D", shadow: "#a86a1f", hover: "#f0a851" }
        : { bg: "var(--gold)", shadow: "#B88523", hover: "#F2C65A" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1090,
        background: "rgba(6,27,54,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "ch-fade-in 0.18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #FFFDF8 0%, #FAF7F0 100%)",
          color: "var(--navy)",
          borderRadius: 18,
          maxWidth: 460,
          width: "100%",
          padding: 28,
          boxShadow:
            "0 24px 60px rgba(6,27,54,0.35), 0 1px 0 rgba(255,255,255,0.7) inset",
          border: "1px solid rgba(216,168,63,0.30)",
          animation: "ch-pop 0.20s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* Icon orb */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background:
              tone === "danger"
                ? "linear-gradient(160deg, #ef5238 0%, #b32f1a 100%)"
                : tone === "warm"
                  ? "linear-gradient(160deg, #f4af5e 0%, #b87024 100%)"
                  : "linear-gradient(160deg, #F2C65A 0%, #B88523 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            fontSize: 24,
            fontWeight: 700,
            boxShadow: `0 6px 0 ${palette.shadow}`,
          }}
          aria-hidden
        >
          {tone === "danger" ? "!" : tone === "warm" ? "⚠" : "?"}
        </div>

        <h3
          id="confirm-title"
          className="serif"
          style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}
        >
          {opts.title}
        </h3>
        {opts.description && (
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
            {opts.description}
          </p>
        )}

        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid rgba(6,27,54,0.16)",
              background: "white",
              color: "var(--navy)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              minWidth: 100,
            }}
          >
            {opts.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: palette.bg,
              color: tone === "primary" ? "var(--navy)" : "white",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              minWidth: 110,
              boxShadow: `0 3px 0 ${palette.shadow}`,
              letterSpacing: "0.01em",
            }}
          >
            {opts.confirmLabel ?? "Aceptar"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ch-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ch-pop {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────── Toast UI ───────────────── */
function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const palette =
    toast.kind === "success"
      ? { bar: "#35B779", icon: "✓", iconBg: "#1B7849" }
      : toast.kind === "error"
        ? { bar: "#b32f1a", icon: "!", iconBg: "#7a1d0d" }
        : { bar: "#2BB8A7", icon: "i", iconBg: "#187063" };

  return (
    <div
      style={{
        background: "#0B2548",
        color: "white",
        borderRadius: 12,
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "28px 1fr auto",
        gap: 10,
        alignItems: "center",
        boxShadow: `0 12px 30px rgba(6,27,54,0.40), inset 4px 0 0 ${palette.bar}`,
        pointerEvents: "auto",
        animation: "ch-slide-in 0.25s cubic-bezier(.34,1.56,.64,1)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      role="status"
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: palette.iconBg,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
        aria-hidden
      >
        {palette.icon}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{toast.body}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 16,
          padding: 0,
          width: 22,
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes ch-slide-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
