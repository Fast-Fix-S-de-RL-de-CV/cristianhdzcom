"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function NewsletterForm({ source = "blog" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source, tag: "newsletter" }),
    });
    setStatus(res.ok ? "ok" : "err");
    if (res.ok) setEmail("");
  }

  return (
    <Card style={{ padding: 24 }}>
      <form onSubmit={onSubmit}>
        <label className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          EMAIL
        </label>
        <div className="row" style={{ marginTop: 8, gap: 8 }}>
          <input
            className="input"
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Enviando…" : "Suscribirme"}
          </Button>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          {status === "ok"
            ? "✓ Listo. Te llega el primero el próximo domingo."
            : status === "err"
              ? "Algo falló. Inténtalo de nuevo."
              : "SIN SPAM · DESUSCRIBIR EN 1 CLIC"}
        </div>
      </form>
    </Card>
  );
}
