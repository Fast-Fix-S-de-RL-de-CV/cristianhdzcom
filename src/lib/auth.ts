import "server-only";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

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

export async function getCurrentUser() {
  const jar = await cookies();
  const sid = jar.get(COOKIE_NAME)?.value;
  if (!sid) return null;
  const rows = await db
    .select({
      id: schema.users.id,
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
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("forbidden");
  }
  return user;
}
