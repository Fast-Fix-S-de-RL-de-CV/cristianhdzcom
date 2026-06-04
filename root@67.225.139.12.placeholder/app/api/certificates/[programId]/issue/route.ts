import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/certificates/[programId]/issue
 *
 * Idempotently issues a certificate for the current user + given program,
 * BUT only if every module of the program is marked 'done' for this user.
 * Returns the certificate code so the client can navigate to /cert/[code].
 */
function generateCertCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(_req: Request, ctx: { params: Promise<{ programId: string }> }) {
  const { programId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, programId)).limit(1);
  if (!program) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

  // Must be enrolled
  const [enrollment] = await db
    .select()
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.userId, user.id), eq(schema.enrollments.programId, programId)))
    .limit(1);
  if (!enrollment) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });

  // Verify completion
  const mods = await db.select().from(schema.modules).where(eq(schema.modules.programId, programId));
  if (mods.length === 0) return NextResponse.json({ error: "program_empty" }, { status: 409 });
  const progress = await db.select().from(schema.moduleProgress).where(eq(schema.moduleProgress.userId, user.id));
  const doneSet = new Set(progress.filter((p) => p.state === "done").map((p) => p.moduleId));
  const allDone = mods.every((m) => doneSet.has(m.id));
  if (!allDone) {
    const remaining = mods.filter((m) => !doneSet.has(m.id)).length;
    return NextResponse.json({ error: "not_completed", remaining }, { status: 409 });
  }

  // Idempotent
  const [existing] = await db
    .select()
    .from(schema.certificates)
    .where(and(eq(schema.certificates.userId, user.id), eq(schema.certificates.programId, programId)))
    .limit(1);
  if (existing) return NextResponse.json({ certificate: existing });

  const code = generateCertCode();
  const [created] = await db
    .insert(schema.certificates)
    .values({ userId: user.id, programId, code })
    .returning();
  return NextResponse.json({ certificate: created });
}
