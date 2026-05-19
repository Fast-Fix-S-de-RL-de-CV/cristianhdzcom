import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;

function escapeCsvCell(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Row[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsvCell(r[h] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") || "orders") as
    | "orders"
    | "users"
    | "leaderboard"
    | "enrollments";

  let csv: string;
  let filename: string;

  if (type === "enrollments") {
    const programId = url.searchParams.get("programId");
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    const rows = await db
      .select({
        id: schema.enrollments.id,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userLevel: schema.users.level,
        cohortCode: schema.cohorts.code,
        status: schema.enrollments.status,
        enrolledAt: schema.enrollments.enrolledAt,
        completedAt: schema.enrollments.completedAt,
      })
      .from(schema.enrollments)
      .innerJoin(schema.users, eq(schema.users.id, schema.enrollments.userId))
      .leftJoin(schema.cohorts, eq(schema.cohorts.id, schema.enrollments.cohortId))
      .where(eq(schema.enrollments.programId, programId))
      .orderBy(desc(schema.enrollments.enrolledAt));
    const headers = [
      "id",
      "userName",
      "userEmail",
      "userLevel",
      "cohortCode",
      "status",
      "enrolledAt",
      "completedAt",
    ];
    csv = toCsv(
      headers,
      rows.map((r) => ({
        ...r,
        enrolledAt: r.enrolledAt ? (r.enrolledAt as Date).toISOString() : "",
        completedAt: r.completedAt ? (r.completedAt as Date).toISOString() : "",
      })),
    );
    filename = `enrollments-${programId}.csv`;
  } else if (type === "users") {
    const rows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        level: schema.users.level,
        xp: schema.users.xp,
        streakDays: schema.users.streakDays,
        country: schema.users.country,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));
    const headers = ["id", "email", "name", "role", "level", "xp", "streakDays", "country", "createdAt"];
    csv = toCsv(
      headers,
      rows.map((r) => ({
        ...r,
        createdAt: (r.createdAt as Date).toISOString(),
      })),
    );
    filename = "users.csv";
  } else if (type === "leaderboard") {
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        level: schema.users.level,
        xp: schema.users.xp,
        streakDays: schema.users.streakDays,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.xp))
      .limit(500);
    const headers = ["rank", "id", "name", "email", "level", "xp", "streakDays"];
    csv = toCsv(
      headers,
      rows.map((r, i) => ({ rank: i + 1, ...r })),
    );
    filename = "leaderboard.csv";
  } else {
    const rows = await db
      .select({
        id: schema.orders.id,
        email: schema.orders.email,
        name: schema.orders.name,
        status: schema.orders.status,
        subtotalCents: schema.orders.subtotalCents,
        discountCents: schema.orders.discountCents,
        bumpsCents: schema.orders.bumpsCents,
        totalCents: schema.orders.totalCents,
        currency: schema.orders.currency,
        paymentMethod: schema.orders.paymentMethod,
        couponCode: schema.orders.couponCode,
        createdAt: schema.orders.createdAt,
        paidAt: schema.orders.paidAt,
        programTitle: schema.programs.title,
      })
      .from(schema.orders)
      .leftJoin(schema.programs, eq(schema.programs.id, schema.orders.programId))
      .orderBy(desc(schema.orders.createdAt));
    const headers = [
      "id",
      "email",
      "name",
      "programTitle",
      "status",
      "subtotalCents",
      "discountCents",
      "bumpsCents",
      "totalCents",
      "currency",
      "paymentMethod",
      "couponCode",
      "createdAt",
      "paidAt",
    ];
    csv = toCsv(
      headers,
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt ? (r.createdAt as Date).toISOString() : "",
        paidAt: r.paidAt ? (r.paidAt as Date).toISOString() : "",
      })),
    );
    filename = "orders.csv";
  }

  // UTF-8 BOM helps Excel detect encoding.
  const body = "﻿" + csv;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
