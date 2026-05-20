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
import { relations } from "drizzle-orm";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
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
    priceUsd: integer("price_usd").notNull().default(0),
    priceCompareUsd: integer("price_compare_usd"),
    installmentPriceUsd: integer("installment_price_usd"),
    installmentCount: integer("installment_count"),
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

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
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

/* ─────────── EVENTS ─────────── */
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
});

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
  usesLeft: integer("uses_left"),
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

/* ─────────── BOOKS ─────────── */
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
    priceDigitalUsd: integer("price_digital_usd"),
    pricePrintUsd: integer("price_print_usd"),
    ratingAvg: integer("rating_avg"), // 0-50 (4.9 stored as 49)
    ratingCount: integer("rating_count").notNull().default(0),
    bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
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
