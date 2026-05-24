import Link from "next/link";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/marketing/Nav";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order: orderId } = await searchParams;

  let order: any = null;
  let program: any = null;
  if (orderId) {
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    order = o;
    if (o?.programId) {
      const [p] = await db.select().from(schema.programs).where(eq(schema.programs.id, o.programId)).limit(1);
      program = p;
    }
  } else {
    const [p] = await db.select().from(schema.programs).where(eq(schema.programs.slug, slug)).limit(1);
    program = p;
  }

  return (
    <div>
      <Nav />
      <section className="sec" style={{ maxWidth: 720, margin: "0 auto", paddingTop: 64 }}>
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "oklch(95% 0.04 155)",
              color: "oklch(45% 0.13 155)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              margin: "0 auto 24px",
            }}
          >
            ✓
          </div>
          <Eyebrow>Pago confirmado</Eyebrow>
          <h1 style={{ fontSize: 48, marginTop: 12, marginBottom: 16 }}>¡Bienvenido a la generación!</h1>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.5 }}>
            Acabas de inscribirte a <strong style={{ color: "var(--ink)" }}>{program?.title}</strong>. Te enviamos los accesos
            a tu correo y tu lugar en la plataforma ya está listo.
          </p>
          <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/plataforma">
              <Button size="lg">Ir a mi sendero →</Button>
            </Link>
            <Link href="/comunidad">
              <Button size="lg" variant="ghost">
                Entrar a la comunidad
              </Button>
            </Link>
          </div>
          {order && (
            <div className="mono" style={{ marginTop: 32, color: "var(--muted)", fontSize: 11 }}>
              ORDEN · {order.id.slice(0, 8).toUpperCase()} · ${(order.totalCents / 100).toFixed(0)} USD
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
