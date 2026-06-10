import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const [coupon] = await db
    .select()
    .from(schema.coupons)
    .where(eq(schema.coupons.code, code.toUpperCase()))
    .limit(1);
  if (!coupon || !coupon.active) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Mismo criterio que POST /api/checkout: cupón agotado no es válido
  // (null = usos ilimitados).
  const hasUsesLeft = coupon.usesLeft == null || coupon.usesLeft > 0;
  if (!hasUsesLeft) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ code: coupon.code, kind: coupon.kind, value: coupon.value });
}
