"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; text: string };

const MAX_TURNS = 6;

export function CopilotoPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const initialised = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    setThinking(true);
    fetch("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data: any) => {
        const reply = data?.reply ?? "Hola — listo para ayudarte.";
        setTurns([{ role: "assistant", text: reply }]);
      })
      .catch(() => {
        setTurns([
          { role: "assistant", text: "No pude conectarme al copiloto. Intenta de nuevo en un momento." },
        ]);
      })
      .finally(() => setThinking(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, thinking]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput("");
    setTurns((prev) => {
      const next: Turn[] = [...prev, { role: "user", text: msg }];
      return next.slice(-MAX_TURNS);
    });
    setThinking(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data: any = await res.json();
      const reply: string = data?.reply ?? "Sin respuesta.";
      setTurns((prev) => {
        const next: Turn[] = [...prev, { role: "assistant", text: reply }];
        return next.slice(-MAX_TURNS);
      });
    } catch {
      setTurns((prev) => {
        const next: Turn[] = [...prev, { role: "assistant", text: "Hubo un error al hablar con el copiloto." }];
        return next.slice(-MAX_TURNS);
      });
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16, background: "var(--bg-2)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="ia-tag">Copiloto CH</div>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          SIEMPRE ON
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{
          marginTop: 12,
          maxHeight: 220,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingRight: 4,
        }}
      >
        {turns.length === 0 && !thinking && (
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
            Pregúntame lo que quieras sobre tu sendero.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              padding: "8px 10px",
              borderRadius: 10,
              background: t.role === "user" ? "var(--ink)" : "transparent",
              color: t.role === "user" ? "var(--bg)" : "var(--ink)",
              alignSelf: t.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              border: t.role === "assistant" ? "1px solid var(--line)" : "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {t.text}
          </div>
        ))}
        {thinking && (
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--muted)", paddingLeft: 4 }}
          >
            pensando…
          </div>
        )}
      </div>
      <form
        onSubmit={send}
        style={{
          marginTop: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntale al copiloto…"
          disabled={thinking}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="btn btn-primary"
          style={{
            padding: "8px 12px",
            fontSize: 13,
            minWidth: 36,
            justifyContent: "center",
            opacity: thinking || !input.trim() ? 0.5 : 1,
          }}
          aria-label="Enviar"
        >
          →
        </button>
      </form>
    </div>
  );
}
