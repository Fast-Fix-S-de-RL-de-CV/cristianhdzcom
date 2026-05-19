import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  subtitle: z.string().max(2000).optional().nullable(),
  type: z.string().min(2).max(40),
  priceUsd: z.number().int().min(0).default(0),
  durationLabel: z.string().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
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
      .insert(schema.programs)
      .values({
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle || null,
        type: data.type,
        priceUsd: data.priceUsd,
        durationLabel: data.durationLabel || null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      })
      .returning();
    return NextResponse.json({ program: row });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
