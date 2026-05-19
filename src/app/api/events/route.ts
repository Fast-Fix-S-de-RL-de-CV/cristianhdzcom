import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { gte, asc } from "drizzle-orm";

// GET /api/events?limit=10 — upcoming events ordered by startsAt
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
  const events = await db
    .select()
    .from(schema.events)
    .where(gte(schema.events.startsAt, new Date()))
    .orderBy(asc(schema.events.startsAt))
    .limit(limit);
  return NextResponse.json(events);
}
