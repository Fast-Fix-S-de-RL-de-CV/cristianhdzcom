import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getTenantCtx } from "@/lib/tenant";

const body = z.object({
  email: z.string().email().toLowerCase().trim(),
  source: z.string().max(60).optional(),
  tag: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getTenantCtx();
    if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    const data = body.parse(await req.json());
    const existing = await db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.email, data.email), eq(schema.leads.tenantId, ctx.tenant.id)))
      .limit(1);
    if (existing.length === 0) {
      await db
        .insert(schema.leads)
        .values({ tenantId: ctx.tenant.id, email: data.email, source: data.source, tag: data.tag });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
