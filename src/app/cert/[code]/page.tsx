import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getTenantCtx } from "@/lib/tenant";
import { CertificateView } from "./CertificateView";

export const dynamic = "force-dynamic";

/**
 * Public certificate verification page. Anyone with the code can open
 * `/cert/ABC123XYZ` and see who earned the certificate, when, and for
 * what program. The page renders a print-friendly HTML certificate; the
 * "Descargar PDF" button on it triggers window.print() which produces a
 * polished PDF without any server-side libs.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const { code } = await params;
  const [cert] = await db
    .select()
    .from(schema.certificates)
    .where(and(eq(schema.certificates.tenantId, ctx.tenant.id), eq(schema.certificates.code, code.toUpperCase())))
    .limit(1);
  if (!cert) notFound();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, cert.userId), eq(schema.users.tenantId, ctx.tenant.id)))
    .limit(1);
  const [program] = await db
    .select()
    .from(schema.programs)
    .where(and(eq(schema.programs.id, cert.programId), eq(schema.programs.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!user || !program) notFound();

  // Optional: who is the founder (signed by) — el dueño del tenant, o su primer admin.
  let founder = ctx.tenant.ownerUserId
    ? (
        await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.id, ctx.tenant.ownerUserId), eq(schema.users.tenantId, ctx.tenant.id)))
          .limit(1)
      )[0]
    : undefined;
  if (!founder) {
    [founder] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, ctx.tenant.id), eq(schema.users.role, "admin")))
      .limit(1);
  }

  // URL pública de verificación impresa en el certificado.
  const verifyUrl = ctx.tenant.customDomain
    ? `${ctx.tenant.customDomain}/cert/${cert.code}`
    : `mimarca.app/${ctx.tenant.slug}/cert/${cert.code}`;

  return (
    <CertificateView
      code={cert.code}
      issuedAt={cert.issuedAt.toISOString()}
      alumno={{ name: user.name }}
      program={{ title: program.title, subtitle: program.subtitle, durationLabel: program.durationLabel }}
      founder={founder ? { name: founder.name } : null}
      verifyUrl={verifyUrl}
    />
  );
}
