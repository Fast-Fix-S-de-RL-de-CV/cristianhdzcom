# Modelo de Negocio · cristianhdz.com

**Versión:** 1.1 (Mayo 2026) — **APROBADO por Cristian**
**Status:** Sprint 1 en implementación

## Decisiones finales tomadas

- **Descuentos por tier**: Plata 10% · Oro 20% · Black 30% ✅
- **Crédito apply-to-purchase**: 50% de lo pagado en membresía ✅
- **Talleres**: livestream + grabación quedan incluidos para Oro/Black ✅
- **Inner Circle Black**: límite 50 personas (lista de espera cuando se llene) ✅
- **Regla clave**: cada producto nuevo (curso/taller/etc) debe tener input
  explícito en admin `includedInMembership` para que el sistema sepa si
  desbloquea automáticamente con la membresía.

## La tensión que tenemos que resolver

Cristian planteó tres preguntas clave que apuntan a la misma tensión:

1. ¿Membresía $99/mes da acceso a cursos de $1000? Si sí, **canibalizamos** las ventas
   one-shot. Nadie compra el curso premium si por $99/mes lo tiene "incluido".
2. ¿Para certificarse hay que pagar un año de membresía? ¿O completar un curso?
3. Si alguien solo compró un libro de $49, ¿qué hace? ¿Cómo lo subimos?

**El error típico de la industria:** mezclar membresía y compras one-shot sin reglas
claras → ambos canales pierden valor. Skool resolvió creando un modelo donde la
membresía da comunidad + livestreams, pero los cursos premium siguen siendo aparte.
Nosotros vamos a refinarlo para crear un sistema donde **cada peso que entra
EMPUJA al siguiente peso**, sin canibalizar nada.

## La filosofía: 3 cajas distintas que se alimentan

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   CAJA 1         │    │   CAJA 2         │    │   CAJA 3         │
│   PRODUCTOS      │    │   MEMBRESÍAS     │    │   PROGRESIÓN     │
│   ONE-SHOT       │    │   RECURRENTES    │    │   (Tiers)        │
│                  │    │                  │    │                  │
│ Libros, cursos,  │    │ Plata / Oro /    │    │ Bronce / Plata / │
│ certificación,   │    │ Black mensual    │    │ Oro / Black por  │
│ consultoría,     │    │                  │    │ USD lifetime     │
│ agencia          │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Lo COMPRAS              Lo RENTAS                Lo eres SIEMPRE
   y es tuyo               (mientras pagas)        (por lifetime spend)
   para siempre
```

### Las 3 cajas en una frase

- **Caja 1 (Productos)**: lo que **te llevas para siempre**. Pagaste, es tuyo.
  Libros, cursos completos con sus videos, certificación con sello, consultorías
  ya tomadas. El cliente posee el producto.

- **Caja 2 (Membresías)**: **acceso temporal a la comunidad activa**. Pagas mes
  a mes para entrar a livestreams, mastermind, biblioteca curada, descuentos.
  Si te das de baja, pierdes acceso a esas cosas vivas. Pero los productos que
  ya compraste siguen siendo tuyos.

- **Caja 3 (Tiers)**: **estatus social basado en cuánto has invertido lifetime**.
  Eres lo que has invertido. No baja aunque dejes de pagar membresía. Da
  reconocimiento, badge visible, prioridad en eventos, descuentos extra.

### Por qué este modelo no se canibaliza

La membresía **NO da acceso a productos one-shot completos**. Da acceso a:
- Comunidad viva (feed, posts, comentarios)
- Talleres en vivo del mes (sí, se transmiten en vivo, pero **NO quedan grabados**
  en la biblioteca recurrente — la grabación se vende como producto aparte)
- Mastermind grupales
- Biblioteca curada de **mini-contenido**: clips de 5-15 min, plantillas, casos
  de estudio cortos, q&a antiguos
- Descuentos en productos one-shot
- Crédito acumulado que se aplica si compras un producto (ver más abajo)

Los **cursos completos** ($300-$1000) y la **certificación** se compran aparte
SIEMPRE. La membresía no los regala. Solo da el descuento.

## Caja 1 · Catálogo de productos one-shot

Estructurado en 5 categorías. Cada una tiene su lógica y target:

### 1.1 Libros ($19-$89)
Punto de entrada masivo. ROI alto en volumen.
- Vol. I digital: $29 · Vol. I físico firmado: $49
- Vol. II digital: $34 · Vol. II físico firmado: $54
- Bundle digital (los 2): $49 — ahorra $14
- Bundle físico firmado: $89 — ahorra $19
- Paquete completo + 2 talleres: $189 — RECOMENDADO

**Función en el embudo**: convertir prospecto → cliente (Bronce).

### 1.2 Talleres en vivo ($79-$199)
Eventos en vivo de 4-8 horas con Cristian. Se anuncian y se llenan.
- Talleres regulares: $79-$129
- Talleres premium con caso real: $149-$199
- Acceso a la grabación queda para el comprador. **Miembros Oro/Black ven el livestream gratis pero NO se llevan la grabación.**

**Función**: ticket de entrada al "Cristian en vivo". Quema FOMO.

### 1.3 Cursos completos ($297-$999)
El producto premium del catálogo. Material grabado profesional con planes de
pago, garantía, comunidad propia del curso.

| Curso | Precio | Plan de pagos |
|---|---|---|
| Curso ThriveCart | $297 | 3×$99 |
| Curso Arte de los negocios sin dinero | $497 | 5×$99 |
| Curso IA aplicada a ventas | $697 | 7×$99 |
| Master Curso CH · 12 módulos + grupo VIP | $997 | 10×$99 |

**Función**: el margen real del negocio. Cada cliente que compra esto vale
4-30× lo del libro.

### 1.4 Certificación CH · IA ($1,497)
**Producto de máximo prestigio.** Sello profesional, requiere completar el curso
completo + 4 proyectos reales + evaluación en vivo 1:1 con Cristian.

- Pago: $1,497 one-shot (o 12×$149).
- Lleva 3-6 meses completarla en serio.
- El sello aparece en el perfil del alumno y en LinkedIn.
- **NO se incluye en ninguna membresía.** Solo descuento del 30% para Black.

**Función**: top of the funnel para clientes serios. Crea narrative
("egresados de CH · IA"). Es el equivalente a un Bootcamp de Lambda School.

### 1.5 Consultoría y Agencia ($500-$5,000+)
Productized services. Para empresarios establecidos.
- Consultoría 1:1 sesión única: $500
- Paquete consultoría (5 sesiones): $1,997
- Agencia "construimos tu producto con IA": cotización custom ($3K-$10K+)

**Función**: high-ticket. Pocos clientes, grandes tickets.

## Caja 2 · Membresías recurrentes

3 planes mensuales. Cada uno es **acceso temporal a contenido vivo y descuentos
permanentes**, NO acceso a cursos completos.

### Membresía Plata · $19/mes

**Para quien**: el lector de los libros que quiere estar conectado.

**Incluye**:
- Acceso completo al feed de la comunidad (lectura + comentar + postear)
- 1 taller en vivo al mes (livestream, no grabación)
- Biblioteca de **mini-recursos**: PDFs cortos, plantillas, cheatsheets
- Boletín privado mensual con casos reales
- Descuento del **10% en libros y talleres** (no en cursos ni certificación)
- Suma score: $19 × 12 = $228 lifetime/año → te sube de Bronce a Plata en un año

**No incluye**: cursos completos, certificación, biblioteca grande de cursos
viejos.

### Membresía Oro · $49/mes

**Para quien**: cliente activo que quiere acelerar.

**Incluye todo lo de Plata, más**:
- 1 mastermind grupal semanal con Cristian (90 min, hasta 30 personas)
- Acceso a la **biblioteca curada**: 50-100 clips de 5-15 min de talleres pasados,
  q&a antiguos, micro-casos. **NO son cursos completos.**
- Acceso preferente para reservarse en talleres premium (24h antes que el público)
- Descuento del **20% en cursos y talleres**
- Suma score: $49 × 12 = $588 lifetime/año → te sube de Plata a Oro en un año

**No incluye**: cursos completos para tu biblioteca personal, certificación,
1:1 con Cristian.

### Membresía Black · $99/mes

**Para quien**: el cliente top, el que quiere acceso al inner circle.

**Incluye todo lo de Oro, más**:
- 1 llamada **1:1 con Cristian** al mes (30 min)
- Acceso al **Inner Circle Black**: grupo cerrado de 50 personas máximo,
  mastermind mensual presencial + virtual, decisiones de producto se preguntan
  aquí primero
- Acceso anticipado a nuevos lanzamientos (1 semana antes que el público)
- Descuento del **30% en TODO el catálogo** (cursos, certificación, consultoría)
- "Office hours" abiertas con Cristian 2 veces al mes (slot)
- Crédito acumulable: **50% de lo que pagas en Black se convierte en saldo
  aplicable a la compra de un curso** (ver "Crédito apply-to-purchase" abajo)
- Suma score: $99 × 12 = $1,188 → llegas a Black en 8 meses solo con membresía

**No incluye**: el contenido de cursos individuales aterriza en tu cuenta
mientras seas Black, pero al cancelar se va. Para que sea tuyo para siempre,
compras el curso (con 30% descuento + tu crédito acumulado).

## Caja 3 · Tiers (estatus por lifetime spend)

Tu tier es la suma de **TODO** lo que has pagado a Cristian. No importa si es
libro, curso, taller, membresía o consultoría. Todo cuenta.

| Tier | Lifetime | Color | Lo qué desbloquea (permanente) |
|---|---|---|---|
| 🚪 Visitante | $0 | gris | Solo lee previews de la comunidad |
| 🥉 Bronce | $1-$249 | warm | Cliente activo. Lee feed, comenta. |
| 🥈 Plata | $250-$499 | silver | Postea, sube archivos, ve perfiles privados. |
| 🥇 Oro | $500-$789 | gold | Ve adjuntos premium. Aparece en directorio destacado. |
| 🖤 Black | $790-$1000 | dark | Inner Circle. Aparece en homepage. Eternamente. |

**Reglas del tier**:
- Sube automáticamente con cada pago confirmado.
- **Nunca baja** aunque canceles membresía. Si llegaste a Black, eres Black de por vida.
- Los **beneficios recurrentes** (1:1 mensual, mastermind, biblioteca curada) **solo
  duran mientras la membresía esté activa**. Pero el badge, el estatus social, la
  prioridad en eventos, y los descuentos aplican siempre.

## El gran sistema: Crédito Apply-to-Purchase

Esto es la pieza que **conecta membresía con compras** sin canibalizar:

> El 50% de lo que pagas en membresía se acumula como **crédito** que puedes
> aplicar al comprar cualquier curso, certificación o consultoría.

**Ejemplo concreto**: María se suscribe a Black por $99/mes.
- A los 6 meses ha pagado $594.
- Crédito acumulado: 50% × $594 = **$297**.
- Decide comprar el Curso ThriveCart ($297).
- Aplica $297 de crédito → precio queda **$0**.
- Hace el checkout. Crédito se resetea a $0.

O Pedro que es Oro ($49/mes) por 1 año:
- Pagó $588 en membresía.
- Crédito acumulado: $294.
- Compra el Master Curso ($997).
- Aplica $294 de crédito.
- Su 20% descuento Oro sobre $703 = otro $141 de descuento.
- Precio final: $562 por un curso de $997. Ahorró $435.

**Por qué funciona**:
- Cliente siente que la membresía "le sirve para algo" aunque no compre.
- Cuando decide comprar, ya ahorró → siente que es un buen deal.
- Pero el crédito **caduca si cancelas la membresía** (90 días grace).
- Esto crea LOCK-IN sin sentirse como cárcel.

## Los 7 customer journeys reales que tenemos

### Journey A: el lector de libros ($49)
1. Compra Vol. I digital → $29 → es Bronce.
2. Lee, le gusta. 30 días después compra Vol. II digital → $63 lifetime total → sigue Bronce.
3. Email: "Tu próxima oportunidad: Bundle físico firmado a $69 (vs $89 normal)" — cross-sell.
4. Compra Bundle físico → $158 lifetime → sigue Bronce.
5. **Decisión clave**: ¿Plata mensual o curso?
   - Si compra Plata $19/mes → tres meses después llega a Plata por lifetime.
   - Si compra Curso ThriveCart $297 → llega a Plata + acceso al curso.
6. Idealmente lo movemos a Curso. El Curso paga 6× el bundle.

### Journey B: el escéptico que solo lee
1. Lee tu blog vía Google. Encuentra un post de Black blureado.
2. Banner: "Crea cuenta gratis para ver el feed completo".
3. Se registra gratis → es Visitante. Ve más, pero los archivos top siguen bloqueados.
4. Email nurturing semanal con caso de éxito + soft CTA.
5. **Día 14**: oferta de bienvenida (sólo aplica primeras 2 semanas): Vol. I digital $19 (vs $29).
6. Compra → es Bronce.

### Journey C: el cliente Black puro membresía
1. Le interesa el "Inner Circle".
2. Se suscribe a Black $99/mes (skip-the-line).
3. Mes 1: paga $99 → es Bronce.
4. Mes 3: paga $297 lifetime → es Plata.
5. Mes 6: paga $594 lifetime → es Oro.
6. Mes 8: paga $792 lifetime → **es Black**.
7. Tiene $396 de crédito acumulado.
8. Compra Curso Master Curso CH $997 con 30% off ($698) − $396 crédito = **$302**.
9. Lifetime ahora: $792 + $302 = $1,094 → sigue Black.

### Journey D: el comprador one-shot grande
1. Vende su empresa o tiene cash.
2. Compra **Certificación CH·IA por $1,497**.
3. Brinca directo a Black por lifetime spend.
4. NO se suscribe a membresía. Tiene el certificado, el descuento Black, el badge.
5. Si después quiere mastermind/inner circle/1:1 → se suscribe a Black ahora ($99/mes).

### Journey E: el empresario que solo quiere consultoría
1. Agenda 1 hora de consultoría: $500 → Plata.
2. Le gusta. Toma paquete de 5: $1,997 → Black directo.
3. Si le interesa contenido grabado → opcional Black $99/mes.

### Journey F: el alumno serio de cursos
1. Toma 3 cursos en 1 año ($297 + $497 + $697) = $1,491.
2. Es Black por lifetime spend, sin tomar membresía.
3. Tiene los 3 cursos para siempre.
4. La membresía sigue siendo opcional (sólo para mastermind + inner circle).

### Journey G: el cliente que cancela
1. Tomó Black 4 meses ($396).
2. Compró Curso ThriveCart con $198 de crédito.
3. Cancela Black.
4. Mantiene el curso (es suyo). Mantiene el tier (Bronce o más por lifetime).
5. Pierde: el 1:1 mensual, biblioteca curada, inner circle.
6. Email automático: "Te extrañamos. Vuelve este mes con 30% off el primer mes."

## Por qué este modelo es rentable

### Lock-in sin cárcel
- Membresía no obliga. Productos no obligan. Pero la **acumulación** sí: cada paga
  te acerca al siguiente milestone (tier + crédito).

### Anchor pricing brutal
- El Master Curso de $997 hace que el Bundle de $189 "se sienta barato".
- El paquete de Consultoría $1,997 hace que la membresía Black de $99/mes
  "se sienta accesible".
- Una vez que has gastado $500+, gastar otros $500 es psicológicamente trivial.

### LTV escalado por persona
- Cliente promedio: 1 libro + 1 curso pequeño = ~$300/año.
- Cliente comprometido: bundle + curso medio + 6 meses Plata = ~$700/año.
- Cliente top: certificación + Black anual = ~$2,500/año.
- Cliente whale: consultoría premium + curso completo + Black = ~$5,000/año.

### Predictabilidad del MRR
- Cada Plata = $19 MRR.
- Cada Oro = $49 MRR.
- Cada Black = $99 MRR.
- Meta a 12 meses: 100 Plata + 50 Oro + 20 Black = $1,900 + $2,450 + $1,980 = **$6,330 MRR** = $76K/año recurrente.
- Y eso ES ENCIMA de las ventas one-shot.

## KPIs a vigilar (dashboard admin)

1. **MRR** (membresía mensual recurrente) — la métrica reina
2. **Churn rate** — % que cancela cada mes (target: < 5%)
3. **Tier upgrade rate** — % que sube tier en 90 días
4. **Apply-to-purchase ratio** — % de membresías que terminan comprando un curso
5. **LTV por journey** — agrupado por tipo de primer producto
6. **Crédito sin usar** — bolsa de dinero potencial a redimirse

## La estructura de email automation

Cada tier dispara secuencias automáticas distintas:

**Visitante captado** → 7 emails en 14 días empujando libro de entrada ($29)
**Bronce nuevo** → 5 emails en 30 días: "ya leíste el libro, próximo paso = curso/membresía"
**Plata** → boletín mensual + invitación al taller del mes
**Oro** → invitación al mastermind semanal + clip exclusivo de biblioteca
**Black** → recordatorio del 1:1 + posts nuevos del inner circle
**Lifetime alto pero sin membresía** → "Eres Black por lifetime. Sólo $99/mes para entrar al Inner Circle." (no hard sell)

## Lo que hay que construir (orden técnico)

### Sprint 1 — Membresías base
- Schema `memberships` (userId, plan, status, startedAt, currentPeriodEnd, cancelAtPeriodEnd)
- Schema `membership_credits` (userId, balance_cents, expires_at)
- Endpoint `/api/checkout/membership` con Stripe Subscriptions
- Página `/membresia` pública con los 3 planes
- Página `/cuenta/membresia` para gestión (ver plan, cancelar, ver crédito)
- Webhook Stripe para auto-renewal + recompute tier
- Cron mensual que suma crédito el día del pago

### Sprint 2 — Apply credit en checkout
- Mostrar saldo disponible en `/checkout/*`
- Permitir aplicar % o monto fijo del crédito al total
- Endpoint backend que valida + decrementa crédito atómicamente
- Email de confirmación con desglose

### Sprint 3 — Biblioteca curada de mini-recursos
- Schema `mini_resources` (id, title, kind: clip|pdf|template, fileUrl, minTier)
- Página `/biblioteca/recursos` filtrable por tier
- Solo Plata+ tiene acceso

### Sprint 4 — Cursos con módulos blindados por % pagado
- Lo que ya planeamos para Fase 4 del tier system.

### Sprint 5 — Inner Circle Black
- Página `/inner-circle` (solo Black ven el link)
- Stream de posts privados (subset de comunidad)
- Calendario de masterminds mensuales

## Preguntas para Cristian antes de implementar

1. **Descuentos**: ¿estás de acuerdo con 10/20/30% para Plata/Oro/Black? ¿O prefieres otros %?

2. **Crédito apply-to-purchase**: ¿50% como propuesta es el sweet spot? Más bajo (25%) protege margen, más alto (75%) acelera conversión a one-shot.

3. **Caducidad del crédito**: ¿90 días después de cancelar es justo? ¿O lo dejamos infinito mientras la cuenta siga activa?

4. **Certificación**: ¿confirmas que es one-shot $1,497, NO incluida en ninguna membresía, solo con descuento Black 30%?

5. **Talleres en vivo**: ¿confirmas que **Oro/Black ven livestream gratis pero NO la grabación**? La grabación se vende aparte al precio del taller.

6. **Inner Circle Black**: ¿límite de 50 personas máximo (escasez real) o ilimitado?

7. **Frecuencia masterminds**:
   - Oro: 1 mastermind grupal semanal (90 min) — ¿estás OK?
   - Black: 1 mastermind mensual presencial + 1 1:1 mensual de 30 min — ¿estás OK?

8. **Trial gratis**: ¿queremos 7 días gratis en Plata para que prueben? Sube conversión pero también churn.

## Decisión final solicitada

Si apruebas el modelo (con ajustes que veas), arrancamos Sprint 1 inmediatamente.

Si quieres cambiar partes específicas (precios, qué incluye cada plan, %
descuentos, certificación), lo ajustamos en este mismo documento antes de
codear.

**Recuerda**: este documento es la "constitución" del negocio. Una vez codeado,
cambiar las reglas básicas (qué incluye cada plan, los descuentos) se vuelve
caro. Mejor afinarlo aquí ahora.
