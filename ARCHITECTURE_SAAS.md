# mimarca.app — Arquitectura Multi-Tenant (SaaS tipo Skool)

**Qué es:** la plataforma cristianhdz.com se convierte en una SaaS. Cada *tenant* (cliente
nuestro) obtiene su propia plataforma completa: sitio web, cursos, comunidad, membresías,
checkout con SUS llaves de pago, branding propio. Nosotros somos dueños de la SaaS.

## Niveles (3)
1. **Superadmin de la SaaS** (nosotros): usuarios con `tenantId = NULL` y `role='superadmin'`.
   Panel en `mimarca.app/superadmin`. Seed: lic.cristianhdz@gmail.com.
2. **Admin del tenant**: `users.role='admin'` dentro de su tenant. Ve el /admin actual
   (scoped a su tenant) + "Mi sitio" (branding) + "Pagos" (sus llaves Stripe/PayPal/MP).
3. **Miembros del tenant**: `users.role='member'` — la experiencia actual de alumno/comunidad.

## Tenancy
- Tabla `tenants`: slug único (mimarca.app/{slug}), customDomain único opcional
  (via Cloudflare, patrón rifabase), plan (`basico`|`pro`), planStatus
  (`trial`|`active`|`past_due`|`suspended`), branding jsonb, ownerUserId, status.
- `tenant_id uuid` en TODAS las tablas de contenido (25): users, programs, cohorts,
  enrollments, modules, lessons, categories, posts, comments, events, membership_plans,
  memberships, blog_posts, coupons, stripe_events, orders, leads, activity, services,
  books, resources, user_projects, payment_settings, site_settings, certificates.
  - `users.tenant_id` es NULLABLE (NULL = usuario de plataforma/superadmin). El resto NOT NULL.
  - Tablas junction/child (sessions, password_resets, post_likes, lesson_*, module_progress,
    event_rsvps, conversations, messages, marketing_plans, experience_ledger,
    membership_credit_history) NO llevan tenant_id: se validan por su padre/user scoped.
- Únicos compuestos: (tenant_id, email) en users/leads; (tenant_id, slug) en programs,
  categories, membership_plans, blog_posts, services, books; (tenant_id, code) en coupons.
  payment_settings y site_settings: UNIQUE(tenant_id) — una fila por tenant.

## Routing / realms
- **Dominio raíz**: `mimarca.app` (+ localhost). Paths RESERVADOS del realm plataforma:
  `/`, `/crear`, `/precios`, `/superadmin/**`, `/api/platform/**`, `/_next`, assets.
- **Tenant por slug**: `mimarca.app/{slug}/**` → middleware quita el prefijo `/{slug}`,
  rewrite interno al path real, y setea headers `x-tenant-key: {slug}` y
  `x-tenant-base: /{slug}`.
- **Tenant por dominio**: cualquier Host ≠ raíz (cristianhdz.com, dominios custom via
  worker CF que manda `X-Tenant-Host`) → `x-tenant-key: domain:{host}`, `x-tenant-base: ""`
  (sin prefijo). Slugs nunca contienen puntos → discriminador seguro.
- `src/lib/tenant.ts`:
  - `getTenant()` (server, cacheado por request): lee `x-tenant-key`, resuelve fila tenants
    (por slug o custom_domain), null si realm plataforma.
  - `requireTenant()` lanza si no hay tenant o está suspendido.
- **Links y fetches en componentes**: NUNCA hardcodear `/ruta`. Usar:
  - Server components: `const { basePath } = await getTenant()` y prefijar.
  - Client components: hook `useTenant()` del `TenantProvider` → `tp("/ruta")` para hrefs
    y `tp("/api/...")` para fetch. En dominio custom `basePath=""` → idéntico a hoy.

## Auth por realm
- `getCurrentUser()` valida que `user.tenantId` coincida con el tenant del request
  (en realm plataforma exige `tenantId IS NULL`). Cookie compartida en mimarca.app
  entre /{a} y /{b} NO puede cruzar tenants gracias a este check.
- `requireAdmin()` = admin del tenant actual. `requireSuperAdmin()` = platform realm.
- Registro en realm tenant crea user con ese tenantId. Email único POR tenant.

## Queries (regla de oro del refactor)
- Toda query a tablas con tenant_id DEBE filtrar `eq(t.tenantId, tenant.id)` (o insertar
  con `tenantId: tenant.id`). Fetch-por-id: agregar `and(eq(t.id,id), eq(t.tenantId,...))`.
- Tablas child: validar vía join/fetch del padre scoped (p.ej. lesson → module → program
  ya trae tenant, o lessons.tenantId directo).

## Branding por tenant
- `tenants.branding` jsonb: `{ siteName, accent, ink, bg, logoUrl, faviconUrl, footerText,
  footerLinks:[{label,href}], social:{instagram,facebook,youtube,tiktok,x}, hideMimarcaBadge }`.
- Root layout resuelve tenant → inyecta CSS vars (`--accent`, etc.) inline en `<html style>`,
  metadata (title=siteName), favicon, y monta `<TenantProvider>`.
- `site_settings` (hero editable) ahora es por tenant → el admin del tenant edita su home.
- Footer/Nav leen branding del tenant (no textos hardcodeados de Cristian).

## Pagos
- **Del tenant a sus miembros**: checkout/webhook usan las llaves de `payment_settings`
  DEL TENANT (ya existe la tabla + admin /admin/pagos; hoy checkout usa env → cambiar a
  `getTenantStripe(tenant)` que instancia Stripe con la secret del tenant). Webhook:
  `/{slug}/api/stripe/webhook` o dominio custom `/api/stripe/webhook`; el secret del
  webhook es el del tenant.
- **Del tenant a NOSOTROS** (suscripción SaaS): llaves plataforma en env (STRIPE_*).
  MVP: trial 14 días al crear tenant; superadmin activa/suspende manualmente; integración
  de cobro recurrente plataforma = fase 2.

## Planes (2 modalidades vs Skool $99 USD/mes)
- `basico`: $499 MXN/mes — mimarca.app/{slug}, hasta 500 miembros, todo incluido, 0% comisión.
- `pro`: $999 MXN/mes — + dominio propio, miembros ilimitados, sin badge "hecho con mimarca".
- Constantes en `src/lib/plans.ts` (gates: `canUseCustomDomain(tenant)`, `memberLimit(tenant)`).

## Dominios personalizados (patrón rifabase EXACTO)
- Admin tenant agrega dominio → API crea zona CF (token `CLOUDFLARE_API_TOKEN`), SSL full,
  CNAME @/www → mimarca.app (proxied), worker routes → worker `mimarca-proxy`; guarda
  zoneId+nameservers en tenants; UI muestra los NS para que el cliente los ponga en su
  registrador. Cron verifica zona active → domainVerified=true.
- Worker `mimarca-proxy`: proxy transparente a https://mimarca.app preservando path y
  seteando `X-Tenant-Host: {dominio}`. El middleware confía en ese header.
- cristianhdz.com NO usa CF: su DNS ya apunta directo al .12 con vhost propio; el
  middleware lo resuelve por Host como cualquier dominio custom (domainVerified=true seed).

## Infra (.12, fuera de WHM — patrón estándar)
- MISMO proceso Next para todo: PM2 `cristianhdz` :3036 en /opt/cristianhdzcom-v2
  (se renombrará mimarca más adelante). Vhosts Apache: cristianhdz.com (existente) +
  mimarca.app (nuevo, proxy → :3036). DB PG16 :5433 `cristianhdzcom_v2`.
- Migraciones: archivos MIGRATION_*.sql aplicados con script node en el server.

## Seed inicial
- Tenant `cristianhdz` (custom_domain cristianhdz.com, verified, plan pro, active) con
  TODO el contenido existente backfilled.
- Superadmin plataforma: lic.cristianhdz@gmail.com (tenantId NULL, mismo hash de password
  que el admin actual del tenant).
