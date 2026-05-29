import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/rsvp
 * Toggles the current user's RSVP for an event. If a row exists it is
 * removed and events.attending is decremented (floored at 0); otherwise
 * a row is inserted and events.attending is incremented.
 * Returns { attending: boolean, count: number }.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db
    .select()
    .from(schema.eventRsvps)
    .where(and(eq(schema.eventRsvps.userId, user.id), eq(schema.eventRsvps.eventId, id)))
    .limit(1);

  let attending: boolean;
  if (existing.length > 0) {
    await db
      .delete(schema.eventRsvps)
      .where(and(eq(schema.eventRsvps.userId, user.id), eq(schema.eventRsvps.eventId, id)));
    await db
      .update(schema.events)
      .set({ attending: sql`GREATEST(${schema.events.attending} - 1, 0)` })
      .where(eq(schema.events.id, id));
    attending = false;
  } else {
    await db.insert(schema.eventRsvps).values({ userId: user.id, eventId: id });
    await db
      .update(schema.events)
      .set({ attending: sql`${schema.events.attending} + 1` })
      .where(eq(schema.events.id, id));
    attending = true;
  }

  const [row] = await db
    .select({ count: schema.events.attending })
    .from(schema.events)
    .where(eq(schema.events.id, id))
    .limit(1);

  return NextResponse.json({ attending, count: row?.count ?? 0 });
}
