/**
 * Ensure two well-known test users exist with known passwords.
 *
 *   SUPER ADMIN: lic.cristianhdz@gmail.com / x8D0FD8SZFuV80CqItAa1!
 *   ALUMNO:      alumno@cristianhdz.com   / Alumno123!
 *
 * Run with:
 *   DATABASE_URL=... npx tsx scripts/seed-test-users.ts
 *
 * Idempotent — if the user already exists, we reset its password & role
 * so the credentials always work.
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { sql, eq } from "drizzle-orm";
import * as s from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

async function upsert(
  email: string,
  password: string,
  name: string,
  role: "member" | "admin" | "superadmin",
  extra: Partial<typeof s.users.$inferInsert> = {},
) {
  const hash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (existing.length > 0) {
    await db
      .update(s.users)
      .set({ passwordHash: hash, role, name, ...extra })
      .where(eq(s.users.email, email));
    console.log(`✓ Updated ${role.padEnd(10)} ${email}`);
  } else {
    await db.insert(s.users).values({
      email,
      passwordHash: hash,
      name,
      role,
      ...extra,
    });
    console.log(`✓ Created ${role.padEnd(10)} ${email}`);
  }
}

async function main() {
  // Super admin
  await upsert(
    "lic.cristianhdz@gmail.com",
    "x8D0FD8SZFuV80CqItAa1!",
    "Cristian Hernández",
    "superadmin",
    {
      bio: "Programador profesional con IA, autor y fundador.",
      country: "México",
      level: 9,
      xp: 12480,
      streakDays: 47,
      hearts: 5,
    },
  );

  // Alumno de prueba
  await upsert(
    "alumno@cristianhdz.com",
    "Alumno123!",
    "Alumno de Prueba",
    "member",
    {
      bio: "Cuenta demo para revisar la experiencia del alumno.",
      country: "México",
      level: 3,
      xp: 1240,
      streakDays: 4,
      hearts: 5,
    },
  );

  // Sanity report
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(s.users);
  console.log(`\nTotal users now in DB: ${count}`);
  console.log("\nLogin credentials:");
  console.log("  SUPER ADMIN: lic.cristianhdz@gmail.com / x8D0FD8SZFuV80CqItAa1!");
  console.log("  ALUMNO:      alumno@cristianhdz.com   / Alumno123!");
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
