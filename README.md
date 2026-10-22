# API Explorer 🎌

> Reto práctico de **Desarrollo de Aplicaciones Móviles (ESFOT)** — Taller de integración de APIs
> Ionic 9 + Angular 22 standalone + Capacitor 8 · Modalidad: individual o parejas

Aplicación móvil que explora un **catálogo real de anime** consumiendo una API pública, con listado incremental (*infinite scrolling*), estados de carga/error y estructura de código en servicios y modelos.

## API elegida

**Kitsu** — <https://kitsu.io/api/edge/anime>

| Decisión | Detalle |
|---|---|
| ¿Por qué Kitsu? | Sin clave secreta, **CORS habilitado**, datos reales y **paginación real** por `offset/limit` |
| Verificación | HTTP 200 · `meta.count = 22 515` registros (probada el 22/10/2026) |
| Descartada | Jikan (MyAnimeList): no responde desde la red local (timeout) |
| Respaldo | Open Library / AniList (ambas verificadas en esta red) |

### Endpoints usados

```
Listado:    GET https://kitsu.io/api/edge/anime
              ?page[limit]=20&page[offset]=0
              &fields[anime]=canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype
Búsqueda:   GET https://kitsu.io/api/edge/anime?filter[text]=<query>&page[limit]=20&page[offset]=0
Detalle:    GET https://kitsu.io/api/edge/anime/{id}
```

Respuesta en **JSON:API**: `{ links, meta: { count }, data: [ { id, attributes } ] }` → se normaliza en `src/app/services/anime.service.ts` al modelo `Anime` (`src/app/models/anime.model.ts`).

## Decisión de paginación (requisito R2)

- Página = `page[limit]` **20** + `page[offset]` creciente (`offset = página × 20`).
- **Fin de datos real:** `hasMore = offset + 20 < meta.count` → **no se simula** el scroll repitiendo peticiones.
- Acumulación con `Set` de `id` para **no duplicar**; `ion-infinite-scroll-content.complete()` en `finally` (también ante error) y `disabled` cuando se agota.

## Instalación

```powershell
npm install          # dependencias
npm start            # ng serve → http://localhost:4200  (o: npx ionic serve → :8100)
npm run build        # compila a www/ (debe dar 0 errores)
```

> Requisitos: Node 22, Ionic CLI 7.2 (`npm i -g @ionic/cli`).

## Estructura (requisito R7)

```
src/app/
├── models/anime.model.ts        interfaces Anime y PageResult
├── services/anime.service.ts    TODO el HTTP (Kitsu) + normalización + paginación
├── components/anime-card/       tarjeta reutilizable del listado
├── pages/home/                  listado + infinite scroll (R1, R2)
├── app.routes.ts                rutas lazy con loadComponent
└── app.component.ts             raíz standalone
```

## Requisitos cubiertos en esta etapa

| Req. | Descripción | Estado |
|---|---|---|
| **R1** | Listado remoto con ≥2 atributos por tarjeta | ✅ |
| **R2** | `ion-infinite-scroll` sin duplicados y con fin real | ✅ |
| **R7** | Servicio HTTP + interfaces + páginas/componentes separados | ✅ |
| R3–R6 | Búsqueda, detalle, errores completos, favoritos | 📌 etapa posterior |

## Compilación del APK (por terminal)

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
# salida: android\app\build\outputs\apk\debug\app-debug.apk
```

## Evidencias

- **Build**: `npm run build` → 0 errores · `npx tsc --noEmit` → 0 · `npm run lint` → pass · `npm test -- --watch=false` → **9/9** (22/10/2026)
- **Commits**: `1269883` fase-B (scaffold + estructura R7) · `b7116f2` fase-C-D (R1 + R2 + interfaz) · `26d550a` limpieza · `fase-F` (verificación + docs)
- **Revisión de rúbrica** (subagente `revisor-rubrica`): **74/75** sobre lo evaluable hoy (R1 20/20 · R2 24/25 · R7 20/20 · estados 10/10)
- **Captura/video** del listado + infinite scrolling: _pendiente de grabar en el navegador (etapa final)_
- **Repositorio**: _pendiente de subir a GitHub (etapa final)_

## Dificultades encontradas

- **Jikan (MyAnimeList) inaccesible** desde la red local (timeout en 4 intentos) → se eligió Kitsu.
- El scaffold de Ionic genera `.browserslistrc` con versiones fuera del soporte de Angular 22 → se ajustó a `last 2 versions`.

---

*Plan completo, coordinación entre modelos y checklist de rúbrica: [`PLAN.md`](./PLAN.md) · Handoff entre sesiones: [`HANDOFF.md`](./HANDOFF.md)*
