import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, hashPassword } from "@/lib/auth";
import { fmtEmail, fmtName } from "@/lib/format";
import { RESERVED_SLUGS, TRIAL_DAYS } from "@/lib/plans";
import { isPlatformRealm } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Signup de la SaaS (realm plataforma): crea el tenant + su admin + las filas
 * base (site_settings, payment_settings) y deja al usuario logueado apuntando
 * a /{slug}/admin. Ver ARCHITECTURE_SAAS.md.
 */

// Mismo criterio que src/lib/slug.ts (sin guion inicial/final ni dobles).
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const body = z.object({
  /** Nombre de la plataforma del tenant (branding.siteName + heroTitle). */
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(SLUG_RE, { message: "slug_invalid" }),
  ownerName: z
    .string()
    .max(120)
    .transform(fmtName)
    .refine((s) => s.length >= 2, { message: "name_invalid" }),
  email: z.string().trim().email().transform(fmtEmail),
  password: z.string().min(8).max(100),
  plan: z.enum(["basico", "pro"]).default("basico"),
});

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export async function POST(req: Request) {
  try {
    // Solo mimarca.app raíz — nunca desde un dominio/slug de tenant.
    if (!(await isPlatformRealm())) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = body.parse(await req.json());

    if (RESERVED_SLUGS.has(data.slug)) {
      return NextResponse.json({ error: "slug_reserved" }, { status: 400 });
    }
    const existing = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.slug))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "slug_taken" }, { status: 400 });
    }

    const passwordHash = await hashPassword(data.password);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);

    const userId = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({
          slug: data.slug,
          name: data.name,
          plan: data.plan,
          planStatus: "trial",
          trialEndsAt,
          branding: { siteName: data.name },
          status: "active",
        })
        .returning({ id: schema.tenants.id });

      const [admin] = await tx
        .insert(schema.users)
        .values({
          tenantId: tenant.id,
          email: data.email,
          passwordHash,
          name: data.ownerName,
          role: "admin",
        })
        .returning({ id: schema.users.id });

      await tx
        .update(schema.tenants)
        .set({ ownerUserId: admin.id })
        .where(eq(schema.tenants.id, tenant.id));

      // Home editable del tenant con defaults de bienvenida.
      await tx.insert(schema.siteSettings).values({
        tenantId: tenant.id,
        heroTitle: data.name,
        heroEyebrow: "Bienvenido a",
      });

      // Fila de pagos vacía: el admin conecta sus llaves en /admin/pagos.
      await tx.insert(schema.paymentSettings).values({ tenantId: tenant.id });

      return admin.id;
    });

    await createSession(userId);

    return NextResponse.json({ ok: true, adminUrl: `/${data.slug}/admin` });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    }
    if (isUniqueViolation(e)) {
      // Carrera en tenants_slug_idx: alguien tomó el slug entre el check y el insert.
      return NextResponse.json({ error: "slug_taken" }, { status: 400 });
    }
    console.error("[platform/signup]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
