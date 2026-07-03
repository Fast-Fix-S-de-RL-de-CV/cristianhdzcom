import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/prospects/bulk-delete
 *
 * Body: { ids: string[] }   ← the strings are EMAILS, not UUIDs. We use the
 *                             `ids` key for compatibility with the shared
 *                             `useBulkDelete` hook, which always sends ids.
 *
 * Unified delete for the Prospectos view, which merges two underlying tables:
 *   - `leads`  (email-only captures from newsletter / popups / lead magnets)
 *   - `users`  (registered accounts without any paid order)
 *
 * For each provided email we delete:
 *   - Any `leads` row matching (case-insensitive on email)
 *   - Any `users` row matching, IF that user is not a superadmin and not the
 *     current admin themselves. The user's personal data (sessions, posts,
 *     comments, lessons, etc.) cascades automatically via FKs in schema.ts.
 *
 * Orders are preserved automatically: `orders.userId` is `ON DELETE SET NULL`
 * and the buyer's name/email are stored as snapshots on the order itself. In
 * practice prospects should have zero paid orders by definition, but if any
 * pending/refunded order exists we keep it as historical data.
 *
 * Returns: { ok, deletedUsers, deletedLeads, preservedOrders, blocked }
 */
const Body = z.object({
  ids: z.array(z.string().email()).min(1).max(500),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "admin" && me.role !== "superadmin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Normalize: trim + lowercase + dedupe. The `ids` key is named for hook
  // compatibility but its strings are email addresses.
  const lowered = [...new Set(parsed.data.ids.map((e) => e.trim().toLowerCase()))];

  // ── 1. Find users that match (solo del tenant). Exclude superadmins + self. ──
  const userRows = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
    .from(schema.users)
    .where(
      and(
        inArray(sql<string>`lower(${schema.users.email})`, lowered),
        eq(schema.users.tenantId, ctx.tenant.id),
      ),
    );

  const blocked: { email: string; reason: string }[] = [];
  const userIdsToDelete: string[] = [];
  for (const u of userRows) {
    if (u.id === me.id) {
      blocked.push({ email: u.email, reason: "self" });
      continue;
    }
    if (u.role === "superadmin") {
      blocked.push({ email: u.email, reason: "superadmin" });
      continue;
    }
    userIdsToDelete.push(u.id);
  }

  // ── 2. Find leads that match (solo del tenant). ──
  const leadRows = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(
      and(
        inArray(sql<string>`lower(${schema.leads.email})`, lowered),
        eq(schema.leads.tenantId, ctx.tenant.id),
      ),
    );
  const leadIdsToDelete = leadRows.map((r) => r.id);

  // ── 3. Count orders that will survive with NULL user_id after the user
  //       delete. Prospects shouldn't have paid orders by definition, but
  //       pending/refunded orders may exist — those stay as historical record. ──
  let preservedOrders = 0;
  if (userIdsToDelete.length > 0) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(
        and(
          inArray(schema.orders.userId, userIdsToDelete),
          eq(schema.orders.tenantId, ctx.tenant.id),
        ),
      );
    preservedOrders = Number(c);
  }

  // ── 4. Execute deletes (users first to trigger cascades, leads second). ──
  let deletedUsers = 0;
  let deletedLeads = 0;
  if (userIdsToDelete.length > 0) {
    const res = await db
      .delete(schema.users)
      .where(
        and(
          inArray(schema.users.id, userIdsToDelete),
          eq(schema.users.tenantId, ctx.tenant.id),
          ne(schema.users.role, "superadmin"),
          ne(schema.users.id, me.id),
        ),
      )
      .returning({ id: schema.users.id });
    deletedUsers = res.length;
  }
  if (leadIdsToDelete.length > 0) {
    const res = await db
      .delete(schema.leads)
      .where(
        and(
          inArray(schema.leads.id, leadIdsToDelete),
          eq(schema.leads.tenantId, ctx.tenant.id),
        ),
      )
      .returning({ id: schema.leads.id });
    deletedLeads = res.length;
  }

  if (deletedUsers === 0 && deletedLeads === 0) {
    return NextResponse.json(
      { ok: false, deletedUsers: 0, deletedLeads: 0, preservedOrders: 0, blocked },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    deletedUsers,
    deletedLeads,
    preservedOrders,
    blocked,
  });
}
