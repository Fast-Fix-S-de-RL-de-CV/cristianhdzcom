import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SoportePage() {
  const user = (await getCurrentUser())!;

  // Filter leads with source = "support" as a lightweight ticket inbox.
  const supportLeads = await db
    .select({
      id: schema.leads.id,
      email: schema.leads.email,
      tag: schema.leads.tag,
      createdAt: schema.leads.createdAt,
    })
    .from(schema.leads)
    .where(eq(schema.leads.source, "support"))
    .orderBy(desc(schema.leads.createdAt));

  return (
    <AdminPageShell
      user={user}
      active="/admin/soporte"
      title="Soporte"
      subtitle={`Bandeja de mensajes${supportLeads.length ? ` (${supportLeads.length})` : ""}`}
      actions={
        <a
          href="https://mail.cristianhdz.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 12, textDecoration: "none" }}
        >
          📬 Abrir bandeja en Webmail
        </a>
      }
    >
      {supportLeads.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📨</div>
          <h3 className="serif" style={{ fontSize: 22, marginBottom: 8 }}>
            Bandeja de soporte vacía
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 520, margin: "0 auto" }}>
            Cuando configures un email de soporte verás los mensajes aquí. Por ahora, los emails
            llegan a <span className="mono">info@cristianhdz.com</span> directamente.
          </p>
          <div style={{ marginTop: 24 }}>
            <a
              href="https://mail.cristianhdz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: "10px 18px", fontSize: 13, textDecoration: "none" }}
            >
              📬 Abrir bandeja en Webmail
            </a>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
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
            }}
          >
            <span style={{ flex: 1 }}>Email</span>
            <span style={{ flex: 1 }}>Asunto / Tag</span>
            <span style={{ width: 140, textAlign: "right" }}>Recibido</span>
          </div>
          {supportLeads.map((l) => (
            <div
              key={l.id}
              className="row"
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid var(--line)",
                background: "white",
              }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{l.email}</span>
              <span className="mono" style={{ flex: 1, fontSize: 12, color: "var(--ink-2)" }}>
                {l.tag ?? "—"}
              </span>
              <span
                className="mono"
                style={{ width: 140, textAlign: "right", fontSize: 11, color: "var(--muted)" }}
              >
                {formatRelative(l.createdAt)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </AdminPageShell>
  );
}
