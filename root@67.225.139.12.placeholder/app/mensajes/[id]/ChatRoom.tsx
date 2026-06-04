"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/utils";

type Message = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string | Date;
  readAt: string | Date | null;
};

export function ChatRoom({
  conversationId,
  currentUser,
  peer,
}: {
  conversationId: string;
  currentUser: { id: string; name: string };
  peer: { id: string; name: string; role: string; level: number };
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/dm/conversations/${conversationId}/messages`);
    if (res.ok) {
      const j = await res.json();
      setMessages(j.messages ?? []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
    // Polling — refresh every 6s for new messages.
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  // Auto-scroll to bottom on message arrival.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId,
      authorId: currentUser.id,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");
    try {
      const res = await fetch(`/api/dm/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const peerInitials = initials(peer.name);
  const isStaff = peer.role === "admin" || peer.role === "superadmin";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100dvh - 120px)" }}>
      {/* Header */}
      <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: "center" }}>
        <Link href="/mensajes" style={{ textDecoration: "none", color: "var(--muted)" }} className="mono">
          ← BANDEJA
        </Link>
      </div>
      <Card
        style={{
          padding: "14px 18px",
          display: "grid",
          gridTemplateColumns: "48px 1fr auto",
          gap: 14,
          alignItems: "center",
          marginBottom: 12,
          borderRadius: 16,
        }}
      >
        <div className="av" style={{ width: 44, height: 44, fontSize: 14 }}>{peerInitials}</div>
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Link href={`/u/${peer.id}`} style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{peer.name}</span>
            </Link>
            {isStaff && (
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  background: "var(--gold)",
                  color: "var(--navy)",
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {peer.role === "superadmin" ? "FUNDADOR" : "ADMIN"}
              </span>
            )}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
            Lv.{peer.level} · MENSAJE PRIVADO
          </div>
        </div>
        <Link href={`/u/${peer.id}`} className="btn btn-ghost" style={{ fontSize: 12 }}>
          Ver perfil
        </Link>
      </Card>

      {/* Messages */}
      <Card
        style={{
          flex: 1,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {loading ? (
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
              CARGANDO…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              <div style={{ fontSize: 42 }}>👋</div>
              <div className="serif" style={{ fontSize: 18, marginTop: 8 }}>
                Empieza la conversación
              </div>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                Saluda a {peer.name.split(" ")[0]} y rompe el hielo.
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMine = m.authorId === currentUser.id;
              const prev = messages[i - 1];
              const showAvatar = !prev || prev.authorId !== m.authorId;
              const time = formatTime(typeof m.createdAt === "string" ? m.createdAt : (m.createdAt as Date).toISOString());
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  {!isMine && showAvatar ? (
                    <div className="av" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
                      {peerInitials}
                    </div>
                  ) : !isMine ? (
                    <div style={{ width: 28, flexShrink: 0 }} />
                  ) : null}
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: 18,
                      background: isMine ? "var(--accent)" : "var(--bg-2)",
                      color: isMine ? "white" : "var(--ink)",
                      fontSize: 14,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      borderBottomRightRadius: isMine ? 4 : 18,
                      borderBottomLeftRadius: !isMine ? 4 : 18,
                    }}
                    title={time}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          style={{
            borderTop: "1px solid var(--line)",
            padding: 12,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Escribe a ${peer.name.split(" ")[0]}… (Enter para enviar)`}
            style={{
              border: "1px solid var(--line-2)",
              borderRadius: 12,
              padding: "10px 14px",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "none",
              minHeight: 44,
              maxHeight: 140,
              lineHeight: 1.4,
            }}
            rows={1}
          />
          <Button type="submit" disabled={!draft.trim() || busy}>
            {busy ? "…" : "Enviar →"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
