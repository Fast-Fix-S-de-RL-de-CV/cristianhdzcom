import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";

const body = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(120),
});

export async function POST(req: Request) {
  try {
    const data = body.parse(await req.json());
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, data.email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "email_in_use" }, { status: 400 });
    }
    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(schema.users)
      .values({ email: data.email, passwordHash, name: data.name, role: "member" })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role });
    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
