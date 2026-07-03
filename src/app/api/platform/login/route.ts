import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { comparePassword, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Login ÚNICO de mimarca.app (realm plataforma): con un solo correo resuelve
 * a dónde va la persona (estilo Skool):
 *
 *   1. ¿Es superadmin de la SaaS (users.tenantId NULL)? → sesión → /superadmin
 *   2. Si no, busca su cuenta en TODOS los tenants activos (el mismo email
 *      puede existir en varios; se prueba el password contra cada candidato,
 *      admins primero, tenant más reciente primero):
 *        admin  → /{slug}/admin
 *        member → /{slug}  (su plataforma)
 *
 * La cookie de sesión se emite en mimarca.app y vale para /{slug}/** (el
 * check de realm de getCurrentUser impide usarla en otro tenant).
 */

const Body = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  let data;
  try {
    data = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const email = data.email.toLowerCase().trim();

  try {
    // 1) Superadmin de la plataforma
    const [platformUser] = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash, role: schema.users.role })
      .from(schema.users)
      .where(and(eq(schema.users.email, email), isNull(schema.users.tenantId)))
      .limit(1);

    if (platformUser && platformUser.role === "superadmin") {
      if (await comparePassword(data.password, platformUser.passwordHash)) {
        await createSession(platformUser.id);
        return NextResponse.json({ ok: true, redirectTo: "/superadmin" });
      }
      // Email de superadmin con password incorrecto: NO probar tenants con
      // este correo (evita enumeración por fuerza sobre el realm plataforma).
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // 2) Cuentas del mismo email en tenants activos (admins primero, recientes primero)
    const candidates = await db
      .select({
        id: schema.users.id,
        passwordHash: schema.users.passwordHash,
        role: schema.users.role,
        slug: schema.tenants.slug,
        tenantStatus: schema.tenants.status,
      })
      .from(schema.users)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.users.tenantId))
      .where(and(eq(schema.users.email, email), isNotNull(schema.users.tenantId), eq(schema.tenants.status, "active")))
      .orderBy(desc(schema.users.role), desc(schema.tenants.createdAt))
      .limit(10);

    // admins/superadmins de tenant primero
    candidates.sort((a, b) => {
      const rank = (r: string) => (r === "admin" || r === "superadmin" ? 0 : 1);
      return rank(a.role) - rank(b.role);
    });

    for (const c of candidates) {
      if (await comparePassword(data.password, c.passwordHash)) {
        await createSession(c.id);
        const isAdmin = c.role === "admin" || c.role === "superadmin";
        return NextResponse.json({
          ok: true,
          redirectTo: isAdmin ? `/${c.slug}/admin` : `/${c.slug}`,
        });
      }
    }

    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  } catch (e) {
    console.error("[platform/login]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
