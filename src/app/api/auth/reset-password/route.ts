import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export async function POST(req: Request) {
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let body: { token?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const password = body.password ?? "";

  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  // passwordResets no tiene tenantId: el aislamiento viene del user dueño del
  // token, que DEBE pertenecer al tenant del request (join scoped).
  const now = new Date();
  const [row] = await db
    .select({ token: schema.passwordResets.token, userId: schema.passwordResets.userId })
    .from(schema.passwordResets)
    .innerJoin(schema.users, eq(schema.users.id, schema.passwordResets.userId))
    .where(
      and(
        eq(schema.passwordResets.token, token),
        gt(schema.passwordResets.expiresAt, now),
        isNull(schema.passwordResets.usedAt),
        eq(schema.users.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "token_invalid_or_expired" }, { status: 400 });
  }

  // Rotate password + mark token used.
  const passwordHash = await hashPassword(password);
  await db
    .update(schema.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, row.userId));
  await db
    .update(schema.passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResets.token, token));

  // Optional: invalidate all existing sessions for that user so old browsers
  // get kicked out.
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId));

  return NextResponse.json({ ok: true });
}
