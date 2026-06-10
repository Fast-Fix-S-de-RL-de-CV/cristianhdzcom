import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  host: z.string().max(200).optional().nullable(),
  startsAt: z
    .string()
    .datetime()
    .refine((s) => new Date(s).getTime() > Date.now() - 60000, "startsAt_must_be_future"),
  durationMinutes: z.number().int().min(5).max(1440).default(60),
  capacity: z.number().int().min(1).default(300),
  isLive: z.boolean().optional(),
  hot: z.boolean().optional(),
  link: z.string().max(2000).optional().nullable(),
  priceUsd: z.number().int().min(0).max(99999).nullable().optional(),
  recordingUrl: z.string().nullable().optional(),
  includedInMembership: z.enum(["silver", "gold", "black"]).nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  isEvergreen: z.boolean().optional(),
  evergreenScheduleHint: z.string().max(120).nullable().optional(),
  tagline: z.string().max(120).nullable().optional(),
  badge1Text: z.string().max(80).nullable().optional(),
  badge1Color: z.enum(["red", "navy", "warm", "green", "gold", "muted", "accent"]).nullable().optional(),
  badge2Text: z.string().max(80).nullable().optional(),
  badge2Color: z.enum(["red", "navy", "warm", "green", "gold", "muted", "accent"]).nullable().optional(),
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
        priceUsd: data.priceUsd ?? null,
        recordingUrl: data.recordingUrl ?? null,
        includedInMembership: data.includedInMembership ?? null,
        coverUrl: data.coverUrl ?? null,
        isEvergreen: data.isEvergreen ?? false,
        evergreenScheduleHint: data.evergreenScheduleHint ?? null,
        tagline: data.tagline ?? null,
        badge1Text: data.badge1Text ?? null,
        badge1Color: data.badge1Color ?? null,
        badge2Text: data.badge2Text ?? null,
        badge2Color: data.badge2Color ?? null,
      })
      .returning();
    return NextResponse.json({ event: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
