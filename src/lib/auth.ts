import "server-only";
import { cookies, headers } from "next/headers";
import { db, schema } from "@/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getTenantCtx } from "@/lib/tenant";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "cristianhdz.sid";
const TTL_DAYS = 30;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}
export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const id = nanoid(48);
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 3600 * 1000);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });
  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return id;
}

export async function destroySession() {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value;
  if (sid) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sid));
  }
  jar.delete(COOKIE_NAME);
}

/**
 * Usuario de la sesión, VALIDADO contra el realm del request (multi-tenant):
 *  - Realm tenant  → el user debe pertenecer a ESE tenant (users.tenantId).
 *  - Realm plataforma (mimarca.app raíz) → el user debe ser de plataforma
 *    (tenantId NULL). Así una cookie compartida en mimarca.app no puede
 *    cruzar de /{tenantA} a /{tenantB} ni al superadmin.
 */
export async function getCurrentUser() {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value;
  if (!sid) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      tenantId: schema.users.tenantId,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      level: schema.users.level,
      xp: schema.users.xp,
      streakDays: schema.users.streakDays,
      hearts: schema.users.hearts,
      tier: schema.users.tier,
      tierScore: schema.users.tierScore,
      lifetimeSpendCents: schema.users.lifetimeSpendCents,
      impersonatorUserId: schema.sessions.impersonatorUserId,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0] ?? null;
  if (!row) return null;

  const ctx = await getTenantCtx();
  if (ctx) {
    // Realm tenant: la sesión solo vale dentro de su tenant.
    if (row.tenantId !== ctx.tenant.id) return null;
  } else {
    // Realm plataforma: solo usuarios de plataforma (superadmin SaaS).
    if (row.tenantId !== null) return null;
  }

  // Expone isImpersonating; no filtra el id del impersonador al resto de la app.
  const { impersonatorUserId, ...user } = row;
  return { ...user, isImpersonating: Boolean(impersonatorUserId) };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

/** Admin DEL TENANT actual (getCurrentUser ya garantiza el match de tenant). */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("forbidden");
  }
  return user;
}

/**
 * Superadmin de la SaaS (realm plataforma, tenantId NULL, role superadmin).
 * Único nivel que puede administrar tenants en /superadmin.
 */
export async function requireSuperAdmin() {
  const h = await headers();
  if (h.get("x-tenant-key")) throw new Error("forbidden"); // solo realm plataforma
  const user = await getCurrentUser();
  if (!user || user.tenantId !== null || user.role !== "superadmin") {
    throw new Error("forbidden");
  }
  return user;
}

/**
 * Impersonación (solo sesión, ver ARCHITECTURE_SAAS.md). La MISMA fila de sesión
 * pasa a actuar como `targetUserId`; `impersonatorUserId` guarda al usuario real
 * (superadmin) para poder revertir. La cookie/sid no cambia → transición sin
 * re-login. getCurrentUser() resuelve al target y pasa el check de realm de su
 * tenant de forma natural.
 */
export async function startImpersonation(targetUserId: string) {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value;
  if (!sid) throw new Error("no_session");
  const [row] = await db
    .select({ userId: schema.sessions.userId, impersonatorUserId: schema.sessions.impersonatorUserId })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sid))
    .limit(1);
  if (!row) throw new Error("no_session");
  // Conserva al impersonador original si (defensivamente) ya estuviera impersonando.
  const impersonator = row.impersonatorUserId ?? row.userId;
  await db
    .update(schema.sessions)
    .set({ userId: targetUserId, impersonatorUserId: impersonator })
    .where(eq(schema.sessions.id, sid));
}

/** Revierte la impersonación: la sesión vuelve al impersonador. No-op si no había. */
export async function stopImpersonation() {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value;
  if (!sid) return;
  const [row] = await db
    .select({ impersonatorUserId: schema.sessions.impersonatorUserId })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sid))
    .limit(1);
  if (!row?.impersonatorUserId) return;
  await db
    .update(schema.sessions)
    .set({ userId: row.impersonatorUserId, impersonatorUserId: null })
    .where(eq(schema.sessions.id, sid));
}
