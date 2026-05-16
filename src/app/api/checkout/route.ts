import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword, createSession } from "@/lib/auth";
import { nanoid } from "nanoid";

const body = z.object({
  programId: z.string().uuid(),
  name: z.string().min(2).max(200),
  email: z.string().email().toLowerCase().trim(),
  country: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  paymentMethod: z.enum(["card", "paypal", "spei", "oxxo"]),
  card: z
    .object({
      number: z.string().max(40),
      exp: z.string().max(10),
      cvc: z.string().max(4),
      zip: z.string().max(20).optional(),
    })
    .optional(),
  bumps: z
    .array(z.object({ id: z.string(), title: z.string(), priceCents: z.number().int().nonnegative() }))
    .default([]),
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const data = body.parse(await req.json());
    const [program] = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.id, data.programId))
      .limit(1);
    if (!program) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

    let user = await getCurrentUser();

    // Auto-create user if not signed-in (with random password — sent via "magic link" flow in real prod)
    if (!user) {
      const [existing] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email))
        .limit(1);
      if (existing) {
        user = {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          avatarUrl: existing.avatarUrl,
          level: existing.level,
          xp: existing.xp,
          streakDays: existing.streakDays,
          hearts: existing.hearts,
        };
      } else {
        const tempPass = nanoid(12);
        const passwordHash = await hashPassword(tempPass);
        const [created] = await db
          .insert(schema.users)
          .values({
            email: data.email,
            name: data.name,
            country: data.country,
            phone: data.phone,
            passwordHash,
            role: "member",
          })
          .returning();
        user = {
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role,
          avatarUrl: created.avatarUrl,
          level: created.level,
          xp: created.xp,
          streakDays: created.streakDays,
          hearts: created.hearts,
        };
        await createSession(created.id);
      }
    }

    const bumpsCents = data.bumps.reduce((s, b) => s + b.priceCents, 0);
    const subtotalCents = program.priceUsd * 100 + bumpsCents;

    let discountCents = 0;
    if (data.couponCode) {
      const [coupon] = await db
        .select()
        .from(schema.coupons)
        .where(eq(schema.coupons.code, data.couponCode.toUpperCase()))
        .limit(1);
      if (coupon?.active) {
        discountCents = coupon.kind === "amount" ? coupon.value : Math.round((subtotalCents * coupon.value) / 100);
      }
    }
    const totalCents = Math.max(0, subtotalCents - discountCents);

    // Without Stripe wired we mark the order as "pending" — webhook would flip it to "succeeded".
    // For dev demo we mark "succeeded" so the flow shows the confirmation screen.
    const status = process.env.STRIPE_SECRET_KEY ? "pending" : "succeeded";

    const [order] = await db
      .insert(schema.orders)
      .values({
        userId: user.id,
        email: data.email,
        name: data.name,
        programId: program.id,
        status,
        subtotalCents,
        discountCents,
        bumpsCents,
        totalCents,
        currency: "usd",
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        bumps: data.bumps,
        paidAt: status === "succeeded" ? new Date() : undefined,
      })
      .returning();

    if (status === "succeeded") {
      // Create enrollment
      await db
        .insert(schema.enrollments)
        .values({ userId: user.id, programId: program.id, status: "active" })
        .onConflictDoNothing();

      await db.insert(schema.activity).values({
        kind: "purchase",
        icon: "💳",
        text: `${data.name.split(" ")[0]} compró ${program.title} · $${(totalCents / 100).toFixed(0)}`,
        color: "var(--accent)",
      });
    }

    return NextResponse.json({ orderId: order.id, status });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", issues: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
