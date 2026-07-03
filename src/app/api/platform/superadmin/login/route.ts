import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { comparePassword, createSession } from "@/lib/auth";
import { isPlatformRealm } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Login del superadmin de la SaaS (realm plataforma). Solo usuarios de
 * PLATAFORMA: tenantId IS NULL + role 'superadmin'. getCurrentUser() ya
 * exige tenantId NULL en este realm, así que la sesión creada aquí no
 * sirve dentro de ningún tenant.
 */

const body = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    if (!(await isPlatformRealm())) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = body.parse(await req.json());
    const [user] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.email, data.email),
          isNull(schema.users.tenantId),
          eq(schema.users.role, "superadmin"),
        ),
      )
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
    console.error("[platform/superadmin/login]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
