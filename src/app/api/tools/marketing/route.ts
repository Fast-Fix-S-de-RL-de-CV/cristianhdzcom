import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/tools/marketing — lista los planes del usuario. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select({
      id: schema.marketingPlans.id,
      title: schema.marketingPlans.title,
      product: schema.marketingPlans.product,
      data: schema.marketingPlans.data,
      updatedAt: schema.marketingPlans.updatedAt,
    })
    .from(schema.marketingPlans)
    .where(eq(schema.marketingPlans.userId, user.id))
    .orderBy(desc(schema.marketingPlans.updatedAt));

  const plans = rows.map((r) => ({
    id: r.id,
    title: r.title,
    product: r.product,
    updatedAt: r.updatedAt,
    nodeCount: Array.isArray((r.data as { nodes?: unknown[] })?.nodes)
      ? (r.data as { nodes: unknown[] }).nodes.length
      : 0,
  }));
  return NextResponse.json({ plans });
}

const CreateBody = z.object({
  title: z.string().min(1).max(160).optional(),
  product: z.string().max(200).optional(),
});

/** POST /api/tools/marketing — crea un plan nuevo (vacío). */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: z.infer<typeof CreateBody> = {};
  try {
    body = CreateBody.parse(await req.json().catch(() => ({})));
  } catch {
    /* usar defaults */
  }
  const [row] = await db
    .insert(schema.marketingPlans)
    .values({
      userId: user.id,
      title: body.title?.trim() || "Plan de marketing",
      product: body.product?.trim() || "",
      data: { nodes: [], edges: [] },
    })
    .returning({ id: schema.marketingPlans.id });
  return NextResponse.json({ id: row.id });
}
