import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { comparePassword, getCurrentUser, hashPassword } from "@/lib/auth";

const body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const data = body.parse(await req.json());

    const [row] = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const ok = await comparePassword(data.currentPassword, row.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "invalid_current_password" }, { status: 400 });
    }

    const newHash = await hashPassword(data.newPassword);
    await db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
