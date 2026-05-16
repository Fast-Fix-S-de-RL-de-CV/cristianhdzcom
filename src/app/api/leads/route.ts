import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const body = z.object({
  email: z.string().email().toLowerCase().trim(),
  source: z.string().max(60).optional(),
  tag: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const data = body.parse(await req.json());
    const existing = await db.select().from(schema.leads).where(eq(schema.leads.email, data.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(schema.leads).values({ email: data.email, source: data.source, tag: data.tag });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
