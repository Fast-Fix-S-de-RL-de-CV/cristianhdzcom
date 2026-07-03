/**
 * Planes de la SaaS mimarca.app (2 modalidades, competencia directa de Skool
 * que cobra $99 USD/mes flat). Fuente de verdad de precios y límites.
 * El superadmin puede cambiar el plan de un tenant desde /superadmin.
 */
export type PlanId = "basico" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceMxnMonthly: number;
  priceLabel: string;
  tagline: string;
  memberLimit: number | null; // null = ilimitado
  customDomain: boolean;
  hideMimarcaBadge: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  basico: {
    id: "basico",
    name: "Básico",
    priceMxnMonthly: 499,
    priceLabel: "$499 MXN/mes",
    tagline: "Tu plataforma completa en mimarca.app/tu-marca",
    memberLimit: 500,
    customDomain: false,
    hideMimarcaBadge: false,
    features: [
      "Sitio web + cursos + comunidad + membresías",
      "Cobra con TUS llaves (Stripe, PayPal, MercadoPago, transferencia)",
      "0% de comisión sobre tus ventas",
      "Hasta 500 miembros",
      "Branding: colores, logo, footer y contenido",
      "mimarca.app/tu-marca",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMxnMonthly: 999,
    priceLabel: "$999 MXN/mes",
    tagline: "Con tu propio dominio y sin límites",
    memberLimit: null,
    customDomain: true,
    hideMimarcaBadge: true,
    features: [
      "Todo lo del plan Básico",
      "Tu dominio propio (tumarca.com)",
      "Miembros ilimitados",
      "Sin insignia \"hecho con mimarca\"",
      "Soporte prioritario",
    ],
  },
};

export const TRIAL_DAYS = 14;

/** Slugs que NO pueden usarse como tenant (colisionan con rutas de plataforma o assets). */
export const RESERVED_SLUGS = new Set([
  "", "saas", "crear", "precios", "superadmin", "api", "login", "registro", "admin",
  "uploads", "favicon.ico", "robots.txt", "sitemap.xml", "app", "www", "mimarca",
  "plataforma", "comunidad", "cuenta", "checkout", "blog", "programas", "libros",
  "membresia", "mensajes", "acerca", "empresas", "recuperar", "reset-password",
  "cert", "u", "static", "assets", "img", "images",
]);

type TenantLike = { plan: string; planStatus: string; status: string; trialEndsAt: Date | null };

export function planOf(t: TenantLike): Plan {
  return PLANS[(t.plan as PlanId) in PLANS ? (t.plan as PlanId) : "basico"];
}

export function canUseCustomDomain(t: TenantLike): boolean {
  return planOf(t).customDomain;
}

export function memberLimit(t: TenantLike): number | null {
  return planOf(t).memberLimit;
}

/** ¿El tenant puede operar? (activo, o en trial no vencido) */
export function tenantOperative(t: TenantLike): boolean {
  if (t.status !== "active") return false;
  if (t.planStatus === "active") return true;
  if (t.planStatus === "trial") {
    return !t.trialEndsAt || t.trialEndsAt.getTime() > Date.now();
  }
  return false; // past_due | suspended
}
