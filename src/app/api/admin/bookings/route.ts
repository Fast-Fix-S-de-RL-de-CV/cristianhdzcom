import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { bookingServiceBodySchema } from "./_schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let data;
  try {
    data = bookingServiceBodySchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const [service] = await db
      .insert(schema.bookingServices)
      .values({
        tenantId: ctx.tenant.id,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle || null,
        description: data.description || null,
        hostName: data.hostName || null,
        hostAvatarUrl: data.hostAvatarUrl || null,
        currency: data.currency,
        priceUsd: data.priceUsd,
        requiresPayment: data.requiresPayment,
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes,
        minNoticeHours: data.minNoticeHours,
        maxDaysAhead: data.maxDaysAhead,
        timezone: data.timezone,
        locationType: data.locationType,
        locationLabel: data.locationLabel || null,
        confirmationText: data.confirmationText || null,
        notificationEmail: data.notificationEmail || null,
        requirePhone: data.requirePhone,
        requireEmail: data.requireEmail,
        availability: data.availability,
        questions: data.questions,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .returning();
    return NextResponse.json({ service });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error("[admin/bookings]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
