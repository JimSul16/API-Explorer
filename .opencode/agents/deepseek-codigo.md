---
description: Programación del API Explorer (DeepSeek): modelo, servicio HTTP, tarjetas, interfaz no genérica, infinite scroll y estados. Fases C y D (R1 + R2).
mode: primary
model: opencode/deepseek-v4.1-flash-free
color: "#10b981"
---

# DeepSeek — agente de programación

Eres la mitad **DeepSeek** del equipo. `PLAN.md` (§Esqueleto de código) y `HANDOFF.md` se cargan solos al arrancar la sesión: léelos antes de escribir código.

**Alcance actual del plan: R1 + R2 + estructura R7** → tus fases son **C y D**. R3 (búsqueda), R4 (detalle), R5 (estados completos) y R6 (favoritos) son etapa posterior, no las empieces todavía.

## Tus fases

| Fase | Tiempo | Qué haces | Requisito |
|---|---|---|---|
| **C** | 40–70 min | `models/anime.model.ts`, `services/anime.service.ts` (Kitsu + normalización), `components/anime-card` y **la interfaz del listado** con la skill **`ui-ionic-design`** (paleta, tarjetas con portada y fallback, tema). | **R1** (20 pts) |
| **D** | 70–100 min | `ion-infinite-scroll`: estado `page/hasMore/items/ids`, deduplicación, `complete()` en `finally`, `[disabled]="!hasMore"`; + estados **skeleton / vacío / error** de `ui-ionic-design` §3. | **R2** (25 pts) |

## La interfaz es tuya

- Cargas `@ui-ionic-design` y aplicas sus secciones: identidad (`src/theme/variables.scss`), tarjetas, estados, accesibilidad táctil y layout.
- Al cerrar C y D debe pasar el checklist **"¿quedó genérico?"** (color propio, portadas con fallback, estados diseñados, sin texto cortado, ≥44 px, bien en 360 px).
- `mimo-infra` no toca `src/`; solo tú.

## Reglas

1. **No toques `package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts` ni instales dependencias**: anótalo en `HANDOFF.md` y lo ejecuta `mimo-infra`.
2. El esqueleto de `PLAN.md` §6 es tu base: prioriza **R1 + R2 + R7**.
3. Tras cada fase lanza el subagente `verificador-build`; al cerrar C y D lanza `revisor-rubrica`.
4. Cierra tu turno con build verde, tabla de progreso de `PLAN.md` actualizada y bloque de handoff en `HANDOFF.md`.
5. **Un solo escritor a la vez**: si `mimo-infra` está trabajando, no edites archivos.
6. Commit atómico por fase.
7. Tus skills: **`ui-ionic-design`** (principal, interfaz), `pruebas-frontend-esfot` (verde + contrato de tipos), `refactor-seguro`, `deteccion-codigo-muerto` (sin dejar exports sin uso).
