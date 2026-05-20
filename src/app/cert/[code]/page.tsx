import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
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
  const { code } = await params;
  const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.code, code.toUpperCase())).limit(1);
  if (!cert) notFound();

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, cert.userId)).limit(1);
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, cert.programId)).limit(1);
  if (!user || !program) notFound();

  // Optional: who is the founder (signed by)
  const founders = await db.select().from(schema.users).where(eq(schema.users.role, "superadmin")).limit(1);
  const founder = founders[0];

  return (
    <CertificateView
      code={cert.code}
      issuedAt={cert.issuedAt.toISOString()}
      alumno={{ name: user.name }}
      program={{ title: program.title, subtitle: program.subtitle, durationLabel: program.durationLabel }}
      founder={founder ? { name: founder.name } : null}
    />
  );
}
