import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

const body = z.object({
  name: z.string().min(2).max(120).trim(),
});

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const data = body.parse(await req.json());

    const [updated] = await db
      .update(schema.users)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      });

    return NextResponse.json({ user: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
