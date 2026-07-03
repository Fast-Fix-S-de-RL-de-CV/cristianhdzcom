import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { comparePassword, createSession } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

const body = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const ctx = await getTenantCtx();
    if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    const data = body.parse(await req.json());
    // Login POR TENANT: el mismo email puede existir en varios tenants.
    const [user] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, data.email), eq(schema.users.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    const ok = await comparePassword(data.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
