import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(5).max(240),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(2000).optional().nullable(),
  body: z.string().min(50).max(50000),
  category: z.string().max(60).optional().nullable(),
  readMinutes: z.number().int().min(1).max(120).optional(),
  isFeatured: z.boolean().optional(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const data = body.parse(await req.json());
    const excerpt =
      data.excerpt && data.excerpt.trim().length > 0
        ? data.excerpt
        : data.body.slice(0, 200);
    const [row] = await db
      .insert(schema.blogPosts)
      .values({
        title: data.title,
        slug: data.slug,
        excerpt,
        body: data.body,
        category: data.category || null,
        readMinutes: data.readMinutes ?? 8,
        isFeatured: data.isFeatured ?? false,
        publishedAt: data.published ? new Date() : null,
      })
      .returning();
    return NextResponse.json({ post: row });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    const code =
      (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "slug_in_use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
