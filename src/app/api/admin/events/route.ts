import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  host: z.string().max(200).optional().nullable(),
  startsAt: z.string().min(8),
  durationMinutes: z.number().int().min(5).max(1440).default(60),
  capacity: z.number().int().min(1).default(300),
  isLive: z.boolean().optional(),
  hot: z.boolean().optional(),
  link: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const [row] = await db
      .insert(schema.events)
      .values({
        title: data.title,
        description: data.description || null,
        host: data.host || null,
        startsAt: new Date(data.startsAt),
        durationMinutes: data.durationMinutes,
        capacity: data.capacity,
        isLive: data.isLive ?? false,
        hot: data.hot ?? false,
        link: data.link || null,
      })
      .returning();
    return NextResponse.json({ event: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
