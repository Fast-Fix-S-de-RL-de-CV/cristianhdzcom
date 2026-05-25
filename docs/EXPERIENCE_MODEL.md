# Modelo de Experiencia & Monetización · cristianhdz.com

**Diseñado:** Mayo 2026
**Autor:** Cristian Hernández + sistema
**Status:** Fase 1 en producción · Fases 2-5 en backlog

## La idea madre

Cada usuario tiene un **Tier Score** del 0 al 100% que representa cuánto ha invertido en la plataforma. Ese score desbloquea contenido, conversaciones y experiencias progresivamente. La comunidad sigue **abierta** (cualquier registrado entra), pero se vuelve **mejor** cuanto más alto tu score — los posts premium se ven borrosos, los mastermind tienen puerta, los videos más jugosos están al final del curso.

No es paywall agresivo. Es **escalera de FOMO**: el visitante ve que hay algo arriba, lo desea, y la única forma de subir es invirtiendo.

## La fórmula

```
Tier Score = min(100%, total_pagado_USD / $1000 × 100%)

$0       gastado  →  0%   (Visitante)
$100     gastado  →  10%  (Bronce empieza)
$500     gastado  →  50%  (Plata)
$790     gastado  →  79%  (Oro)
$1000+   gastado  →  100% (Black tope)
```

**Plan de pagos**: el score se suma proporcional a lo *pagado*, no a lo *comprometido*.
Un curso de $500 con plan de 5×$100 suma 5% por cada pago confirmado.

**Membresías recurrentes**: cada renovación mensual suma proporcionalmente.

**Reembolsos**: restan score.

**Tope 100%**: el score se cap en 100%. Pero el monto histórico se trackea aparte en
`experience_ledger` para futuros perks (top 10 lifetime, etc).

## Los 5 tiers

| Tier | Score | $ gastado | Color | Promesa |
|------|-------|-----------|-------|---------|
| 🚪 Visitante | 0% | $0 | gris | Lee landing, extractos. |
| 🥉 Bronce | 1-24% | $1-249 | warm | Cliente. Lee feed, comenta, ve perfiles públicos. |
| 🥈 Plata | 25-49% | $250-499 | silver | Puede postear, sube archivos hasta 5MB, grupos del producto comprado. |
| 🥇 Oro | 50-79% | $500-799 | gold | Mastermind Oro semanal. Ve archivos/PDFs de cualquiera. Puede postear contenido premium. |
| 🖤 Black | 80-100% | $800+ | dark | Inner Circle Black. Llamada 1:1 mensual con Cristian. Acceso a TODO. |

## Reglas de acceso (Fase 2+)

### En la comunidad
- **Leer feed** → cualquier registrado.
- **Comentar** → cualquier registrado (incentiva engagement).
- **Postear sin archivos** → Bronce o superior (mini-paywall a $1).
- **Postear con archivos / links / PDFs** → Plata o superior (paywall a $250).
- **Ver archivos adjuntos** → tu score ≥ score del autor.
  - Si un Oro postea un PDF, un Bronce ve el post + el título del PDF pero el body+link aparece blureado con CTA "Sube a Oro ($X más) para desbloquear".
- **Mastermind / DMs grupales** → solo tu tier o superior.

### En cursos
- **Curso con `minTierScore`**: puerta total. Si compras pero no calificas, ves la promo pero no puedes entrar a la plataforma.
- **Módulos con `minTierScore`**: cada módulo individual puede tener su propio gate.
- **Plan de pagos**: el curso desbloquea módulos **proporcional al % pagado**.
  - 20% pagado → 20% de módulos visibles.
  - 80% pagado → 80%.
  - 100% pagado → todo desbloqueado.
- **El 80% del valor está en el último 20%**: el admin debe ordenar el contenido para que los videos más jugosos queden en módulos finales. Así el cliente tiene incentivo brutal de terminar de pagar.

### En el directorio de miembros
- **Lista visible** → cualquier registrado (avatar + nombre + tier badge).
- **Perfil completo** → tu score ≥ score del otro (también es paywall social).
- **Mandar DM** → ambos en Plata o superior.

## Membresías recurrentes (Fase 3)

Pensadas para **complementar** la compra de productos, no canibalizarla. La membresía suma score mensual; los productos siguen siendo el ingreso principal.

| Plan | Precio | Score mensual | Incluye |
|------|--------|---------------|---------|
| 🥈 Plata mensual | $19/mes | +1.9% | Acceso a 1 grupo mastermind por mes, descuento 10% en libros |
| 🥇 Oro mensual | $49/mes | +4.9% | Mastermind Oro semanal, descuento 20% en cursos, 1 sesión grupal mensual con Cristian |
| 🖤 Black mensual | $99/mes | +9.9% | Inner Circle, llamada 1:1 mensual, acceso anticipado a todos los lanzamientos, descuento 30% |

**LTV objetivo**:
- Cliente promedio compra $300/año en productos = score 30%
- Si toma Plata mensual ($19×12 = $228) llega a 53% = se vuelve Oro
- Si toma Oro mensual ($49×12 = $588) llega a 89% = se vuelve Black
- **El sistema lo empuja a subir** porque "te faltan $X para llegar a Black"

## Grupos por producto (Fase 5)

Cada producto vendido genera automáticamente un **grupo privado** en la comunidad:
- Grupo del Curso "Sin Dinero" → solo los compradores
- Grupo del Bundle Premium → solo bundle owners + acceso al mastermind Oro mensual
- Grupo libre por área (Marketing / Producto / Ventas)

Esto crea **mini-masterminds** que se sienten exclusivos sin necesidad de moderar uno por uno.

## Estrategia psicológica

1. **Score visible siempre** — badge en el header, barra en `/cuenta`, mención casual en los CTAs ("te faltan $87 para Oro").
2. **Bloqueos honestos** — no escondemos contenido sin avisar. El usuario VE que existe, lo desea, y sabe exactamente cuánto invertir para acceder.
3. **Tiers aspiracionales** — Black no es un cliente más, es un *Inner Circle*. La narrativa importa.
4. **Cero downside** — un visitante puede leer el feed, comentar, conocer la comunidad. Eso genera lazos. Después la fricción de subir es mínima porque ya está dentro.
5. **El 80/20 del curso** — el último 20% es el clímax. Quien va a 60% sabe que se está perdiendo el oro.

## Roadmap de implementación

- ✅ **Fase 1**: Sistema base de Tier Score + UI básica (este commit).
- ⬜ **Fase 2**: Paywall en posts de comunidad (blur + CTA).
- ⬜ **Fase 3**: Membresías recurrentes con Stripe Subscriptions.
- ⬜ **Fase 4**: Cursos con módulos blindados por % pagado.
- ⬜ **Fase 5**: Grupos automáticos por producto + masterminds por tier.

## KPIs a vigilar

- **Score promedio** por cohorte de registro (¿la gente sube o se estanca?)
- **% de Bronce → Plata** en primeros 90 días
- **LTV por tier** (Black debería ser 5-10× Bronce)
- **Tasa de upgrade** de membresía a tier siguiente
- **% de cursos con plan de pagos completados**

Si Bronce → Plata es < 15% en 90 días, falta gancho. Si Black es < 5% del total de clientes, baja la barra o sube las recompensas.
