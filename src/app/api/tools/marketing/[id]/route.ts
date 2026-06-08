import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function owned(planId: string, userId: string) {
  const [row] = await db
    .select()
    .from(schema.marketingPlans)
    .where(and(eq(schema.marketingPlans.id, planId), eq(schema.marketingPlans.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** GET /api/tools/marketing/[id] — carga un plan del usuario. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const plan = await owned(id, user.id);
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ plan });
}

const SaveBody = z.object({
  title: z.string().min(1).max(160).optional(),
  product: z.string().max(200).optional(),
  data: z
    .object({
      nodes: z.array(z.any()).max(500),
      edges: z.array(z.any()).max(1000),
    })
    .optional(),
});

/** PUT /api/tools/marketing/[id] — guarda título/producto/canvas. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const plan = await owned(id, user.id);
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: z.infer<typeof SaveBody>;
  try {
    body = SaveBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await db
    .update(schema.marketingPlans)
    .set({
      ...(body.title != null ? { title: body.title.trim() || "Plan de marketing" } : {}),
      ...(body.product != null ? { product: body.product.trim() } : {}),
      ...(body.data != null ? { data: body.data } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.marketingPlans.id, id));

  return NextResponse.json({ ok: true });
}

/** DELETE /api/tools/marketing/[id] — borra un plan del usuario. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const plan = await owned(id, user.id);
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.delete(schema.marketingPlans).where(eq(schema.marketingPlans.id, id));
  return NextResponse.json({ ok: true });
}
