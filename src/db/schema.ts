import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
  serial,
  date,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ─────────── USERS / AUTH ─────────── */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("member"), // member | admin | superadmin
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    country: varchar("country", { length: 80 }),
    phone: varchar("phone", { length: 40 }),
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    streakDays: integer("streak_days").notNull().default(0),
    streakLastAt: timestamp("streak_last_at", { withTimezone: true }),
    hearts: integer("hearts").notNull().default(5),
    heartsRefilledAt: timestamp("hearts_refilled_at", { withTimezone: true }),

    // ── Tier system (ver docs/EXPERIENCE_MODEL.md) ──
    // tierScore: 0-10000 (representa 0.00% a 100.00% con 2 decimales).
    // $1 USD pagado = 10 puntos. Se cap en 10000.
    tierScore: integer("tier_score").notNull().default(0),
    // tier: derivable de tierScore, pero stored para queries rápidas e indexing.
    // 'visitor' | 'bronze' | 'silver' | 'gold' | 'black'
    tier: varchar("tier", { length: 20 }).notNull().default("visitor"),
    // Lifetime spend en USD cents — para perks históricos aunque el tierScore cape en 100%.
    lifetimeSpendCents: integer("lifetime_spend_cents").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    tierIdx: index("users_tier_idx").on(t.tier),
  }),
);

/**
 * Ledger de cambios de tierScore. Cada vez que un user gana o pierde
 * experience (compra, pago de plan a plazos, reembolso, suscripción mensual)
 * se inserta una fila aquí. Útil para auditoría y para mostrar "historial
 * de tu progreso" en /cuenta.
 */
export const experienceLedger = pgTable(
  "experience_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deltaScore: integer("delta_score").notNull(), // puede ser negativo (refund)
    newScore: integer("new_score").notNull(),     // score resultante después del delta
    reason: varchar("reason", { length: 80 }).notNull(),
    // 'order_paid' | 'order_refunded' | 'membership_renewal' | 'admin_adjust' | 'backfill'
    sourceOrderId: uuid("source_order_id").references(() => orders.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("experience_ledger_user_idx").on(t.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

export const passwordResets = pgTable(
  "password_resets",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("password_resets_user_idx").on(t.userId),
  }),
);

/* ─────────── PROGRAMS / COURSES ─────────── */
export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: text("subtitle"),
    type: varchar("type", { length: 40 }).notNull(), // taller | curso | certificacion | consultoria | agencia
    durationLabel: varchar("duration_label", { length: 80 }),
    // Currency the priceXxx columns are denominated in. Legacy columns keep
    // their "Usd" suffix in the DB but they're now used for ANY currency —
    // the meaning is "amount in <currency>". We pretend the column name is
    // just legacy nomenclature.
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    priceUsd: integer("price_usd").notNull().default(0), // pago único / precio de referencia
    priceCompareUsd: integer("price_compare_usd"),       // precio tachado (must be > priceUsd)
    installmentPriceUsd: integer("installment_price_usd"), // precio por mensualidad del plan
    installmentCount: integer("installment_count"),        // # de mensualidades del plan
    pricePerMonth: integer("price_per_month"),             // suscripción mensual recurrente
    pricePerYear: integer("price_per_year"),               // suscripción anual recurrente
    accent: varchar("accent", { length: 20 }).default("accent"),
    description: text("description"),
    bullets: jsonb("bullets").$type<string[]>().default([]),
    coverUrl: text("cover_url"),
    coverKind: varchar("cover_kind", { length: 12 }), // "image" | "video"
    modulesCount: integer("modules_count").default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    stripePriceId: varchar("stripe_price_id", { length: 120 }),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Si está set, el contenido del curso/programa es accesible para usuarios
     * con membresía igual o superior al plan indicado, MIENTRAS LA MEMBRESÍA
     * ESTÉ ACTIVA. No reemplaza la compra one-shot: si quieres tenerlo para
     * siempre, lo compras. Valores: 'silver' | 'gold' | 'black' | null.
     * (Por defecto null → solo accesible comprándolo.)
     */
    includedInMembership: varchar("included_in_membership", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ slugIdx: uniqueIndex("programs_slug_idx").on(t.slug) }),
);

export const cohorts = pgTable("cohorts", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  seatsTotal: integer("seats_total").notNull().default(30),
  seatsTaken: integer("seats_taken").notNull().default(0),
  isOpen: boolean("is_open").notNull().default(true),
  code: varchar("code", { length: 40 }),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    cohortId: uuid("cohort_id").references(() => cohorts.id),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | trial | completed | cancelled
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userProgramIdx: uniqueIndex("enrollments_user_program_idx").on(t.userId, t.programId),
  }),
);

/* ─────────── MODULES / LESSONS / PROGRESS ─────────── */
export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  weekLabel: varchar("week_label", { length: 60 }),
  isBig: boolean("is_big").notNull().default(false), // project node
  sortOrder: integer("sort_order").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(60),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  // multiple_choice | fill_blank | true_false | open | video
  kind: varchar("kind", { length: 30 }).notNull().default("multiple_choice"),
  // Question is now optional — video lessons don't have one.
  question: text("question"),
  body: text("body"),
  options: jsonb("options").$type<{ k: string; t: string; correct?: boolean }[]>().default([]),
  correctKey: varchar("correct_key", { length: 10 }),
  hint: text("hint"),
  explanation: text("explanation"),
  // Video support — Vimeo today, YouTube reserved for later.
  videoProvider: varchar("video_provider", { length: 20 }), // "vimeo" | "youtube" | null
  videoId: varchar("video_id", { length: 60 }),             // numeric id for Vimeo
  videoDurationSeconds: integer("video_duration_seconds"),
  xpReward: integer("xp_reward").notNull().default(15),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* Per-lesson comments (Skool-style discussion under each lesson). */
export const lessonComments = pgTable(
  "lesson_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lessonIdx: index("lesson_comments_lesson_idx").on(t.lessonId),
  }),
);

/* Per-lesson private notes (study notes, only visible to the author). */
export const lessonNotes = pgTable(
  "lesson_notes",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.lessonId] }) }),
);

export const lessonAttempts = pgTable("lesson_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  answer: text("answer"),
  isCorrect: boolean("is_correct").notNull(),
  xpEarned: integer("xp_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moduleProgress = pgTable(
  "module_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 20 }).notNull().default("locked"), // locked | current | done
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastTouchedAt: timestamp("last_touched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.moduleId] }) }),
);

/* ─────────── COMMUNITY ─────────── */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  emoji: varchar("emoji", { length: 8 }),
  color: varchar("color", { length: 30 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Posts en comunidad. Sistema de visibilidad escalonada:
 *
 *   - Body text → siempre visible para usuarios registrados (sin importar tier).
 *   - `attachments` (links, videos, PDFs, imágenes adicionales) → visibles
 *     SOLO si el viewer tiene tier ≥ tier del autor al momento del post.
 *     Esto crea FOMO: "Ve el post, pero el PDF necesita Oro+".
 *   - `minTierRequired` → si está set, el body completo se blurea para users
 *     con menor tier. Útil para "Posts solo para Black".
 *
 * Visitantes anónimos → ven solo preview (300 chars) + título + autor. El
 * paywall server-side los empuja a /registro con CTA.
 */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    /** Adjuntos premium: aparecen blureados a quien no califica.
     *  Cada uno tiene { kind, url, title, sizeBytes? } */
    attachments: jsonb("attachments")
      .$type<Array<{ kind: "link" | "video" | "pdf" | "image"; url: string; title: string; sizeBytes?: number }>>()
      .notNull()
      .default([]),
    /** Snapshot del tier del autor cuando publicó. Sirve como puerta default
     *  para los adjuntos: si tu tier < authorTierAtPost → adjuntos blureados.
     *  Si null, los adjuntos son libres (posts viejos o legacy). */
    authorTierAtPost: varchar("author_tier_at_post", { length: 20 }),
    /** Override manual del admin: forzar tier mínimo para ver el body. */
    minTierRequired: varchar("min_tier_required", { length: 20 }),
    pinned: boolean("pinned").notNull().default(false),
    hot: boolean("hot").notNull().default(false),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    viewsCount: integer("views_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("posts_created_idx").on(t.createdAt),
    authorIdx: index("posts_author_idx").on(t.authorId),
  }),
);

export const postLikes = pgTable(
  "post_likes",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.postId] }) }),
);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────── EVENTS (talleres + livestreams) ─────────── */
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  host: varchar("host", { length: 200 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  isLive: boolean("is_live").notNull().default(false),
  capacity: integer("capacity").default(300),
  attending: integer("attending").notNull().default(0),
  hot: boolean("hot").notNull().default(false),
  link: text("link"),
  /** Precio del taller como producto one-shot (USD). Null = solo membresía. */
  priceUsd: integer("price_usd"),
  /** Plan mínimo de membresía que ya lo trae incluido (livestream + grabación). */
  includedInMembership: varchar("included_in_membership", { length: 20 }),
  /** URL de la grabación una vez termina el livestream. Visible para
   *  compradores y miembros del plan que aplica. */
  recordingUrl: text("recording_url"),
  /** Imagen tipo banner ad para promocionar el taller en la home + landing.
   *  Aspect ratio recomendado: 16:9 o 4:3 (estilo cover de YouTube). */
  coverUrl: text("cover_url"),
  /**
   * Talleres "evergreen": webinars siempre disponibles (no tienen una fecha
   * fija, se ejecutan en automático o el alumno los puede agendar). Si true,
   * la UI NO muestra startsAt como fecha-hora fija; muestra el
   * `evergreenScheduleHint` ("Disponible al inscribirte" / "Cada miércoles 7pm").
   */
  isEvergreen: boolean("is_evergreen").notNull().default(false),
  /** Texto libre que describe el horario cuando es evergreen. */
  evergreenScheduleHint: varchar("evergreen_schedule_hint", { length: 120 }),
  /** Eyebrow / tagline corto que aparece sobre el título del banner. */
  tagline: varchar("tagline", { length: 120 }),
  /** Toggle de visibilidad rápida (admin). false = oculto en listados públicos. */
  isActive: boolean("is_active").notNull().default(true),
  /**
   * Badges custom del banner. Si quedan null, el banner usa los defaults
   * derivados de isLive/isEvergreen (badge1) y hot (badge2).
   * Si se setean, sobreescriben texto y color.
   *
   * Colores válidos: red | navy | warm | green | gold | muted | accent
   */
  badge1Text: varchar("badge1_text", { length: 80 }),
  badge1Color: varchar("badge1_color", { length: 20 }),
  badge2Text: varchar("badge2_text", { length: 80 }),
  badge2Color: varchar("badge2_color", { length: 20 }),
});

/* ─────────── EVENT RSVPS (apuntados a eventos) ─────────── */
export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    eventUserIdx: uniqueIndex("event_rsvps_event_user_idx").on(t.eventId, t.userId),
  }),
);

/* ─────────── MEMBERSHIP PLANS (catálogo) ─────────── */
/**
 * Catálogo de planes. Solo 3 filas (silver, gold, black) seedeadas.
 * Editables desde /admin/membresias para ajustar precios/beneficios.
 */
export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 20 }).notNull().unique(), // silver | gold | black
  label: varchar("label", { length: 40 }).notNull(),
  emoji: varchar("emoji", { length: 8 }).notNull(),
  priceUsdMonthly: integer("price_usd_monthly").notNull(),
  priceUsdYearly: integer("price_usd_yearly"),
  /** % de descuento en productos one-shot. 10 = 10%. */
  discountPercent: integer("discount_percent").notNull().default(0),
  /** % de cada pago que se acumula como crédito. 50 = 50%. */
  creditAccrualPercent: integer("credit_accrual_percent").notNull().default(50),
  tagline: text("tagline"),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  badgeColor: varchar("badge_color", { length: 30 }),
  /** Cupo máximo si aplica (ej. Black = 50). Null = ilimitado. */
  maxSeats: integer("max_seats"),
  /** Cuántos miembros activos hay actualmente (denormalizado para queries rápidas). */
  activeMembers: integer("active_members").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 120 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 120 }),
});

/* ─────────── MEMBERSHIPS (suscripciones activas) ─────────── */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planSlug: varchar("plan_slug", { length: 20 }).notNull(), // 'silver' | 'gold' | 'black'
    /**
     * Estado de la suscripción:
     *   - 'active'      → al día, beneficios activos
     *   - 'past_due'    → falló el cargo, beneficios suspendidos
     *   - 'canceled'    → cancelada (todavía vigente hasta currentPeriodEnd si cancelAtPeriodEnd)
     *   - 'expired'     → ya pasó currentPeriodEnd
     *   - 'paused'      → pausada temporalmente (admin override)
     */
    status: varchar("status", { length: 20 }).notNull().default("active"),
    billingCycle: varchar("billing_cycle", { length: 10 }).notNull().default("monthly"), // monthly | yearly
    priceUsd: integer("price_usd").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 120 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 120 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("memberships_user_idx").on(t.userId),
    statusIdx: index("memberships_status_idx").on(t.status),
  }),
);

/* ─────────── MEMBERSHIP CREDITS (bolsa apply-to-purchase) ─────────── */
/**
 * Cada user tiene UNA fila (créditos acumulados). Cuando paga membresía
 * suma el N% configurado en el plan. Cuando compra producto, se decrementa.
 *
 * `historyEntries` registra cada cambio para auditoría.
 */
export const membershipCredits = pgTable("membership_credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  balanceCents: integer("balance_cents").notNull().default(0),
  lifetimeAccruedCents: integer("lifetime_accrued_cents").notNull().default(0),
  lifetimeRedeemedCents: integer("lifetime_redeemed_cents").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // 90 días después de cancelar
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Historial de movimientos de crédito (auditable). */
export const membershipCreditHistory = pgTable(
  "membership_credit_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** 'accrual' | 'redemption' | 'expiration' | 'admin_adjust' */
    kind: varchar("kind", { length: 30 }).notNull(),
    deltaCents: integer("delta_cents").notNull(), // + para accrual, - para redemption
    newBalanceCents: integer("new_balance_cents").notNull(),
    sourceMembershipId: uuid("source_membership_id").references(() => memberships.id, { onDelete: "set null" }),
    sourceOrderId: uuid("source_order_id").references(() => orders.id, { onDelete: "set null" }),
    note: varchar("note", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("credit_history_user_idx").on(t.userId),
  }),
);

/* ─────────── BLOG ─────────── */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull(),
    category: varchar("category", { length: 60 }),
    readMinutes: integer("read_minutes").default(8),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ slugIdx: uniqueIndex("blog_slug_idx").on(t.slug) }),
);

/* ─────────── ORDERS / PAYMENTS ─────────── */
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  kind: varchar("kind", { length: 20 }).notNull().default("amount"), // amount | percent
  value: integer("value").notNull(), // cents or percent
  active: boolean("active").notNull().default(true),
  // null = usos ilimitados; un entero = cuántos canjes quedan (se decrementa
  // atómicamente al finalizar cada compra que lo usa, ver lib/stripe.ts).
  usesLeft: integer("uses_left"),
});

/**
 * Idempotencia de webhooks Stripe. Stripe reentrega eventos ante cualquier
 * respuesta no-2xx y ocasionalmente duplica. Antes de procesar un evento
 * insertamos su id aquí; si ya existe, lo ignoramos (evita doble crédito de
 * membresía y órdenes de auditoría duplicadas).
 */
export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id", { length: 80 }).primaryKey(), // event.id de Stripe (evt_...)
  type: varchar("type", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    programId: uuid("program_id").references(() => programs.id),
    status: varchar("status", { length: 30 }).notNull().default("pending"), // pending | succeeded | failed | cancelled | refunded
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    bumpsCents: integer("bumps_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("usd"),
    paymentMethod: varchar("payment_method", { length: 30 }),
    couponCode: varchar("coupon_code", { length: 40 }),
    bumps: jsonb("bumps").$type<{ id: string; title: string; priceCents: number }[]>().default([]),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 120 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 120 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: index("orders_email_idx").on(t.email),
    statusIdx: index("orders_status_idx").on(t.status),
    // Idempotencia de Stripe a nivel DB (además del advisory lock en
    // finalizeCheckoutSession): una session id no puede crear dos orders.
    // Ver MIGRATION_orders_session_unique.sql.
    stripeSessionIdx: uniqueIndex("orders_stripe_session_uniq")
      .on(sql`(${t.metadata}->>'stripeSessionId')`)
      .where(sql`${t.metadata}->>'stripeSessionId' IS NOT NULL`),
  }),
);

/* ─────────── LEADS / NEWSLETTER ─────────── */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 60 }),
  tag: varchar("tag", { length: 60 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────── ACTIVITY (for admin live feed) ─────────── */
export const activity = pgTable(
  "activity",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    kind: varchar("kind", { length: 40 }).notNull(), // purchase | enroll | complete | post | lead | cancel | publish | refund
    icon: varchar("icon", { length: 8 }),
    text: text("text").notNull(),
    color: varchar("color", { length: 60 }),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("activity_created_idx").on(t.createdAt) }),
);

/* ─────────── SERVICES & EMPRESAS ─────────── */
/**
 * Catálogo de servicios/empresas del estudio de Cristian. Esto es lo que se
 * muestra en la sección "Empresas y Servicios" del home (lo que antes era
 * "5 productos en vivo, construidos con IA" hardcoded).
 *
 * Incluye:
 *   - SaaS productizados (BengalPOS, Tienda Syscom, MejorPRO, Rifabase…)
 *   - Software a medida / consultoría / desarrollo
 *   - Card especial "Tu próximo SaaS" (isCtaCard=true) que el admin puede
 *     mostrar al final del grid como CTA "agencia construye tu producto".
 *
 * El diseño de la card lo controla por completo el admin: colores via `hue`
 * (0-360 OKLCH), iniciales mostradas en el cuadrado central (`glyph`),
 * badges (INSIGNIA, NUEVO, TOP LATAM), métrica destacada y precio.
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    domain: varchar("domain", { length: 120 }),
    /** 'saas' | 'software' | 'consulting' | 'agency' | 'service' */
    kind: varchar("kind", { length: 30 }).notNull().default("saas"),
    /** Eyebrow corto sobre el nombre. Ej: "PUNTO DE VENTA", "E-COMMERCE". */
    tagline: varchar("tagline", { length: 80 }),
    /** Descripción larga en la card. */
    description: text("description"),
    /** Iniciales / glyph del logo en el cuadrado central (e.g. "B", "TS", "M+"). */
    glyph: varchar("glyph", { length: 4 }),
    /** Hue OKLCH 0-360 para el gradiente. 22 = naranja, 195 = teal, etc. */
    hue: integer("hue").notNull().default(22),
    /** Badge superior izquierdo. Ej: "INSIGNIA", "TOP LATAM", "NUEVO". */
    badge: varchar("badge", { length: 40 }),
    /** Métrica destacada. Ej: "+ 2.400 negocios", "+ $4M sorteados". */
    metricLabel: varchar("metric_label", { length: 80 }),
    /** Precio mostrado abajo. Ej: "Desde $29/mes", "Comisión 8%", "Hablemos". */
    priceLabel: varchar("price_label", { length: 60 }),
    /** Texto del CTA. Default "Ver SaaS →". */
    ctaLabel: varchar("cta_label", { length: 60 }).notNull().default("Ver SaaS →"),
    /** URL destino del CTA (puede ser dominio externo). */
    ctaUrl: text("cta_url"),
    /**
     * Si true, la card se renderea como "Tu próximo SaaS / cotiza" — patrón
     * cross-hatched, sin gradiente colorido, CTA distinto. Diseñada para
     * cerrar el grid invitando a la agencia.
     */
    isCtaCard: boolean("is_cta_card").notNull().default(false),
    /** Chip "● EN VIVO" en la esquina top-right. Off por default si es servicio sin URL. */
    showLiveBadge: boolean("show_live_badge").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ slugIdx: uniqueIndex("services_slug_idx").on(t.slug) }),
);

/* ─────────── BOOKS + BUNDLES ─────────── */
/**
 * Catálogo de productos editoriales. Una sola tabla cubre dos tipos:
 *
 *   - Libros (isBundle=false): cada uno tiene precio digital + físico
 *     independientes. El admin puede activar solo uno de los dos formatos.
 *   - Bundles (isBundle=true): paquetes que combinan varios libros
 *     (`bundleIncludes.books = ["slug1", "slug2"]`) y opcionalmente
 *     programas/talleres (`bundleIncludes.programs = ["slug"]`). Tiene un
 *     `priceBundleUsd` propio y muestra el ahorro vs comprar suelto.
 *
 * El `digitalFileUrl` es la URL del PDF/EPUB que se entrega POST-compra
 * (solo se renderea para usuarios con orden succeeded matching el slug).
 */
export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 240 }),
    description: text("description"),
    coverUrl: text("cover_url"),
    pages: integer("pages"),

    // ── Pricing (USD whole dollars) ──
    priceDigitalUsd: integer("price_digital_usd"),
    pricePrintUsd: integer("price_print_usd"),
    /** Precio "tachado" mostrado al lado para crear contraste de ahorro. */
    priceCompareUsd: integer("price_compare_usd"),
    /** Solo aplica cuando isBundle=true. */
    priceBundleUsd: integer("price_bundle_usd"),

    // ── Inventario y formatos ──
    /** Si false → no se vende el formato digital del libro. */
    hasDigital: boolean("has_digital").notNull().default(true),
    /** Si false → no se vende el formato físico (solo ebook). */
    hasPhysical: boolean("has_physical").notNull().default(true),
    /** null = stock ilimitado. Cuando llega a 0 se desactiva el botón físico. */
    stockPhysical: integer("stock_physical"),
    /** URL del archivo digital (PDF/EPUB) entregado tras la compra. */
    digitalFileUrl: text("digital_file_url"),

    // ── Bundle ──
    isBundle: boolean("is_bundle").notNull().default(false),
    /** Contenidos del bundle: slugs de libros y/o programas incluidos. */
    bundleIncludes: jsonb("bundle_includes")
      .$type<{ books?: string[]; programs?: string[] }>()
      .notNull()
      .default({}),

    // ── Display ──
    ratingAvg: integer("rating_avg"), // 0-50 (4.9 stored as 49)
    ratingCount: integer("rating_count").notNull().default(0),
    bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
    /** Acento visual: 'warm' | 'accent' | 'ink'. */
    accent: varchar("accent", { length: 20 }).notNull().default("accent"),
    /** Etiqueta destacada tipo "RECOMENDADO", "MÁS ELEGIDO". Null = sin badge. */
    badge: varchar("badge", { length: 40 }),

    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ slugIdx: uniqueIndex("books_slug_idx").on(t.slug) }),
);

/* ─────────── RESOURCES (biblioteca) ─────────── */
export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 40 }).notNull(), // "PDFs" | "Plantillas" | "Notebooks" | "Cheatsheets"
  fileType: varchar("file_type", { length: 16 }), // "pdf" | "zip" | "ipynb" | "md"
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  requiredLevel: integer("required_level").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────── USER PROJECTS ─────────── */
export const userProjects = pgTable(
  "user_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    url: text("url"),
    thumbnailUrl: text("thumbnail_url"),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_projects_user_idx").on(t.userId),
    featuredIdx: index("user_projects_featured_idx").on(t.featured),
  }),
);

/* ─────────── PAYMENT SETTINGS (single-row config) ─────────── */
/**
 * Single-row table que guarda las credenciales de TODOS los proveedores
 * de pago del negocio. La fila siempre tiene id=1 (upsert por convención).
 *
 * Las claves secretas se almacenan tal cual; el acceso a esta tabla está
 * restringido a admins vía el endpoint /api/admin/payment-settings. NUNCA
 * exponer este endpoint a clientes anónimos.
 */
export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  // Stripe
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeMode: varchar("stripe_mode", { length: 10 }).default("test"), // "test" | "live"
  // PayPal
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  paypalMode: varchar("paypal_mode", { length: 10 }).default("sandbox"), // "sandbox" | "live"
  // MercadoPago
  mpAccessToken: text("mp_access_token"),
  mpPublicKey: text("mp_public_key"),
  // Cuentas bancarias para transferencia/depósito (admin muestra al cliente al checkout).
  // jsonb array de { bankName, accountHolder, accountNumber, clabe?, swift?, instructions? }
  bankAccounts: jsonb("bank_accounts")
    .$type<
      Array<{
        bankName: string;
        accountHolder: string;
        accountNumber?: string;
        clabe?: string;
        swift?: string;
        currency?: string;
        instructions?: string;
      }>
    >()
    .default([]),
  // Toggles para habilitar/deshabilitar cada método sin borrar credenciales.
  enableStripe: boolean("enable_stripe").notNull().default(false),
  enablePaypal: boolean("enable_paypal").notNull().default(false),
  enableMercadopago: boolean("enable_mercadopago").notNull().default(false),
  enableTransfer: boolean("enable_transfer").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────── LESSON PROGRESS (per-lesson completion) ─────────── */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    xpEarned: integer("xp_earned").notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.lessonId] }) }),
);

/* ─────────── DIRECT MESSAGES ─────────── */
/**
 * Conversations are between exactly two users. We always store userA < userB
 * (lexicographic on uuid) so we can enforce a unique constraint and find the
 * conversation between two users without a double lookup.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAId: uuid("user_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairIdx: uniqueIndex("conversations_pair_idx").on(t.userAId, t.userBId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convoIdx: index("messages_conversation_idx").on(t.conversationId, t.createdAt),
  }),
);

/* ─────────── CERTIFICATES ─────────── */
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    // Short public code used in /cert/[code] for verification.
    code: varchar("code", { length: 16 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: uniqueIndex("certificates_code_idx").on(t.code),
    userProgramIdx: uniqueIndex("certificates_user_program_idx").on(t.userId, t.programId),
  }),
);

/* ─────────── RELATIONS ─────────── */
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  posts: many(posts),
  comments: many(comments),
  attempts: many(lessonAttempts),
  progress: many(moduleProgress),
  projects: many(userProjects),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
  author: one(users, { fields: [userProjects.userId], references: [users.id] }),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  enrollments: many(enrollments),
  cohorts: many(cohorts),
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  program: one(programs, { fields: [modules.programId], references: [programs.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  likes: many(postLikes),
  comments: many(comments),
}));

/* ─────────── SITE SETTINGS (singleton) ─────────── */
/**
 * Configuración global del sitio editable desde admin. Una sola fila
 * (id=1) que controla el hero del home y otros textos que antes vivían
 * hardcoded en page.tsx.
 *
 * Al refactorizar a este modelo, /admin/ajustes/hero permite editar
 * título, bio, chips, stats, quote y subir/cambiar la foto del retrato
 * sin tocar código.
 */
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(), // siempre 1

  // ── Chips superiores del hero ──
  heroChip1Label: varchar("hero_chip_1_label", { length: 80 }),
  heroChip1Pulse: boolean("hero_chip_1_pulse").notNull().default(true),
  heroChip2Label: varchar("hero_chip_2_label", { length: 80 }),

  // ── Título grande ──
  heroEyebrow: varchar("hero_eyebrow", { length: 40 }).notNull().default("Hola, soy"),
  heroTitle: varchar("hero_title", { length: 120 }).notNull().default("Cristian Hernández."),
  /** Parte del subtítulo que va en color accent (la "frase importante"). */
  heroSubtitleAccent: varchar("hero_subtitle_accent", { length: 80 }),
  /** El resto del subtítulo, en color ink-2 (default). */
  heroSubtitleRest: varchar("hero_subtitle_rest", { length: 80 }),

  // ── Dos párrafos de bio ──
  heroBio1: text("hero_bio_1"),
  heroBio2: text("hero_bio_2"),

  // ── CTAs ──
  heroCtaPrimaryLabel: varchar("hero_cta_primary_label", { length: 40 }).notNull().default("Empezar gratis →"),
  heroCtaSecondaryLabel: varchar("hero_cta_secondary_label", { length: 40 }).notNull().default("Ver mis empresas"),

  // ── Retrato (lado derecho del hero) ──
  /** URL de la foto (puede ser local /uploads/... o externa). */
  heroPortraitUrl: text("hero_portrait_url"),
  /** Línea mono encima del nombre, dentro del overlay del retrato. */
  heroPortraitFooterLine: varchar("hero_portrait_footer_line", { length: 80 })
    .notNull()
    .default("FAST FIX · CLICK THUNDER · G20"),
  /** Texto del chip verde "● Disponible" en el retrato. */
  heroPortraitChip: varchar("hero_portrait_chip", { length: 40 }).notNull().default("● Disponible"),

  // ── Floating credibility card (4 stats) ──
  /** Array de {value, label}. Default = 4 stats actuales. */
  heroStats: jsonb("hero_stats")
    .$type<Array<{ value: string; label: string }>>()
    .notNull()
    .default([]),

  // ── Floating quote card ──
  heroQuoteText: text("hero_quote_text"),
  heroQuoteAttrib: varchar("hero_quote_attrib", { length: 80 }).default("— CRISTIAN H. · 2026"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Herramientas · Plan de Marketing (canvas tipo n8n).
 * Cada fila es un tablero del usuario: nodos (cards por canal) + edges (flujo),
 * guardados como JSON. Informativo (planeación visual), gratis para todos.
 */
export const marketingPlans = pgTable("marketing_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull().default("Plan de marketing"),
  product: varchar("product", { length: 200 }).notNull().default(""),
  data: jsonb("data")
    .$type<{ nodes: unknown[]; edges: unknown[] }>()
    .notNull()
    .default({ nodes: [], edges: [] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
