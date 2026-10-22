# REGISTRO-DEEPSEEK — estado de `src/**` (R1 + R2 + R7) para la etapa R3–R6

> Sesión 🟩 **DeepSeek** (`deepseek-codigo`) · zona exclusiva: `src/**` · cierre 22/10/2026.
> Léelo junto a `REGISTRO-MIMO.md`, `HANDOFF.md` y `PLAN.md` antes de tocar código.

---

## 1. Snapshot: qué hay hoy en `src/app`

```
src/app/
├── app.component.ts/.html/.spec.ts     ion-app + ion-router-outlet (sin lógica)
├── app.routes.ts                       '' → HomePage (lazy) · '**' → ''
├── models/
│   └── anime.model.ts                  Anime · PageResult · FalloApi/FalloApiTipo
├── services/
│   ├── anime.service.ts                ÚNICA puerta a Kitsu (HttpClient)
│   └── anime.service.spec.ts           4 tests (contrato, params, hasMore, FalloApi)
├── components/
│   └── anime-card/                     tarjeta reutilizable (OnPush, input.required)
└── pages/
    └── home/                           listado + infinite scroll + estados
        ├── home.page.ts/.html/.scss    14 tests en home.page.spec.ts
src/theme/variables.scss                paleta e identidad
src/global.scss                         dark.always + base (fondo, sin scroll horizontal)
src/main.ts                             provideHttpClient(withFetch) + addIcons
src/environments/environment(.prod).ts  apiUrl de Kitsu
```

**Sin R3/R4/R6**: no hay `ion-searchbar`, ni ruta `anime/:id`, ni `favorites.service`. No hay `HttpClient` fuera de `AnimeService`.

---

## 2. Contrato de datos (no romperlo)

`src/app/models/anime.model.ts`

| Tipo | Campos |
|---|---|
| `Anime` | `id`, `titulo`, `portada`, `anio`, `rating: number \| null`, `episodios: number \| null`, `tipo` (TV/Película/OVA/ONA/Especial/Música) |
| `PageResult` | `items`, `offset`, `total`, `hasMore` |
| `FalloApi` | `{ tipo: 'red' \| 'servidor' \| 'cliente' \| 'limite'; status: number }` |

Reglas de paginación (verificadas contra la API real: `meta.count` = 22 515):

```ts
// servicio
hasMore = items.length > 0 && offset + PAGE_SIZE < meta.count

// página
offset = res.offset + res.items.length     // por lo RECIBIDO, no por pageSize
hasMore = res.items.length > 0 && nuevos.length === 0 ? false : res.hasMore
```

- `PAGE_SIZE = 20` (`AnimeService.pageSize`, Kitsu admite hasta 20).
- `fields[anime]=canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype`.
- `filter[text]` **ya está implementado** y solo se envía con query no vacía → listo para R3.
- Header `Accept: application/vnd.api+json`.
- URL desde `environment.apiUrl` (los specs también la usan).

---

## 3. R1 / R2 / R7 — dónde está cada punto

| Requisito | Implementación | Evidencia |
|---|---|---|
| **R1** datos reales | `AnimeService.getAnime()` → Kitsu; la página nunca importa `HttpClient` | `services/anime.service.ts:62-93` |
| R1 tarjeta | `anime-card`: portada `aspect-ratio: 2/3` + monograma de respaldo (matiz por id), ★ nota /10, año · tipo · episodios, `loading="lazy"`, `alt` | `components/anime-card/*` |
| **R2** scroll | `ion-infinite-scroll` + `ion-infinite-scroll-content` (dots) — **sin botón "cargar más"** | `home.page.html:75-84` |
| R2 estado | `items` acumulados, `Set<string> ids` anti-duplicados, `offset`, `hasMore`, `cargando`, `fallo` (signals) | `home.page.ts:41-58` |
| R2 guard | `if (this.cargando() || !this.hasMore())` → `complete()` y salir | `home.page.ts:144-147` |
| R2 complete | `this.infinite?.complete()` **en el `finally`** (y en el early-return) | `home.page.ts:169-172` |
| R2 fin real | `hasMore` por `meta.count` (no simulado) | `anime.service.ts:84` |
| R2 error | error inline sin perder la lista + reintento del **mismo offset** (el offset no avanza en el catch) | `home.page.ts:165-168`, `html:58-64` |
| R2 al agotar | `[disabled]="!hasMore() \|\| error() \|\| items().length === 0"` | `home.page.html:77` |
| **R7** estructura | `models/ services/ pages/ components/`; standalone imports; rutas lazy | `app.routes.ts`, `home.page.ts:20-37` |

---

## 4. Interfaz (skill `ui-ionic-design`)

- Identidad **medianoche + coral sakura**: fondo `#0d0f16`, superficie `#171a24`, primario `#ff5a76`, secundario aqua `#35d0ba`, estrella `#ffc857`. Los 5 tonos de cada color custom están definidos.
- Tema **oscuro por identidad** (`dark.always.css` en `global.scss`), no por `prefers-color-scheme`.
- Estados: skeleton con shimmer en formato de tarjeta · vacío · error con **Reintentar ≥44 px** · "Has llegado al final · N de 22 515 títulos".
- Copy del error según el fallo (`mensajeFallo()`): red / servidor (5xx) / límite (429) / cliente (4xx). La cabecera usa `etiquetaFallo()`.
- Accesibilidad: `aria-live` en el contador, `aria-busy` en el skeleton, `role="alert"` en errores, `alt` descriptivo, iconos con `aria-hidden`.
- Iconos: se registran una sola vez con `addIcons()` en `main.ts` (`star`, `cloud-offline-outline`, `search-outline`, `checkmark-done-outline`). **Si añades un icono, regístralo ahí** o no se verá.

---

## 5. Tests: 18 en 3 archivos

| Archivo | Qué cubre |
|---|---|
| `services/anime.service.spec.ts` (4) | params de Kitsu + `filter[text]`, normalización JSON:API, `hasMore` por `count` y página vacía, clasificación red/servidor/429/cliente |
| `pages/home/home.page.spec.ts` (13) | primera página, concat sin duplicados, **duplicados dentro de una misma página**, error sin perder lista + reintento mismo offset, fin por `count` + `disabled`, vacío ≠ error, página vacía corta, guard anti-simultáneas, `complete()` incluso con error, offset por lo recibido, freno si la API repite página + `finSinProgreso`, pausa del scroll tras error, mensajes por tipo de fallo |
| `app.component.spec.ts` (1) | smoke del shell (starter) |

Comandos verdes (22/10):

```bash
npm run build                          # 0 errores · 0 warnings
npx tsc -p tsconfig.app.json --noEmit  # 0
npx tsc -p tsconfig.spec.json --noEmit # 0
npm run lint                           # All files pass linting
npm test -- --watch=false              # 3 archivos · 18/18
```

---

## 6. Qué se corrigió en el pulido (y por qué)

Los 5 puntos del `revisor-rubrica` original (74/75) más 2 hallazgos de la segunda pasada:

1. **Offset por `items.length`** — con una página corta no final, avanzar `pageSize` se saltaba títulos. Test: página de 3 → siguiente petición con `offset=3`.
2. **`[disabled]` incluye `error()`** — se probó a quitarlo (para que el scroll siguiera vivo tras un fallo) y el revisor demostró un **bucle de reintentos**: `complete()` oculta el spinner → el contenido encoge → salta un `scroll` → nueva petición → falla → … Solución final: pausar el scroll tras el fallo y reintentar con el botón inline (explícito). Test discriminante incluido.
3. **Copy del error** — panel "No pudimos cargar el catálogo" + causa real; el aviso inline añade "Tu lista sigue aquí." (solo se muestra con lista cargada).
4. **`catchError` con `FalloApi`** — distingue red (0), 429, 5xx y 4xx sin tocar `PageResult`. La UI elige el mensaje.
5. **URL en tests desde `environment.apiUrl`**.
6. **Freno de progreso** — si Kitsu repitiera una página (solo duplicados), `hasMore=false` en vez de encadenar peticiones hasta `meta.count`.
7. **`total` solo se sobrescribe si `> 0`** y se eliminó el `constructor() {}` vacío del shell.
8. **Tercera pasada (nits del revisor):** deduplicación también **dentro** de una misma página (protege `track anime.id` del `@for`, NG0955); `aFallo()` valida lo capturado en vez de castear a ciegas (un error inesperado cae en `servidor`); copy honesto del fin cuando la API deja de devolver títulos nuevos (`finSinProgreso`); `resumen` prioriza `items` para no mostrar "Conectando…" con tarjetas en pantalla.

Resultado de la última verificación independiente: `verificador-build` → **BUILD: verde**, 0 errores, 0 warnings, 8/8 invariantes de R2 OK. `revisor-rubrica` → **75/75** sobre lo evaluable (R1 20/20 · R2 25/25 · R7 20/20 · estados 10/10), sin bloqueantes ni medios.

---

## 7. Trampas para R3–R6 (leer antes de escribir)

1. **`reiniciar()` mientras hay carga en vuelo** — Ionic (`infinite-scroll.tsx`) pone `isLoading=false` en `disabledChanged()` **sin** resetear `didFire`; si vacías `items` a mitad de una carga disparada por scroll, el `complete()` posterior sale por el early-return y el scroll **no vuelve a disparar**. R3 va a llamar a `reiniciar()` con la lista llena: espera la petición en vuelo (o vacía `items` después de la respuesta).
2. **`reiniciar()`** ya limpia `ids`, `offset`, `items`, `total`, `hasMore` y `fallo`, y recarga. Es el punto de entrada de R3, pero necesita `query` como parámetro en vez del `''` fijo de `cargar()`.
3. **429 = `'limite'`** — con búsqueda (`debounce="400"`) te puedes acercar al límite de 3 req/s de Kitsu. No bajes el debounce y usa el mensaje ya existente.
4. **`[disabled]` incluye `error()`** — cualquier reintento debe limpiar `fallo` **antes** de pedir (lo hace `cargar()` al inicio). No lo quites sin probar el bucle.
5. **Deduplicación** — el `Set` es del ciclo de la lista; R3 debe limpiarlo al reiniciar (ya lo hace `reiniciar()`), no al paginar.
6. **`AnimeService.getAnime(query, offset)`** — el parámetro `query` ya existe; no dupliques servicio para R3.
7. **R4 detalle** — no existe `getAnimeById`. Añádelo en el servicio (misma normalización `toAnime`), no en la página.
8. **R6 favoritos** — `@capacitor/preferences` ya está instalado (8.0.1). Guárdense **ids**, no objetos.
9. **Iconos nuevos** → `addIcons()` en `main.ts`.
10. **Presupuesto de estilos** — `angular.json` tiene `anyComponentStyle` 3 kB warning / 6 kB error. `home.page.scss` está en ~2.8 kB: si R3 añade searchbar, mide y divide estilos.
11. **Lint/estilo del repo** — standalone con `imports: []`, `OnPush`, signals, control flow `@if/@for/@switch`; prefijo `app`; sufijos `Page`/`Component`; `strictTemplates`; sin `any`.

---

## 8. Siguiente tanda sugerida (no empezada)

| Requisito | Punto de entrada | Qué falta |
|---|---|---|
| **R3 búsqueda** | `HomePage.reiniciar()` + `AnimeService.getAnime(query, 0)` | `ion-searchbar debounce="400"`, query en el estado, reset de lista/paginación/ids, descartar respuestas viejas |
| **R4 detalle** | ruta `anime/:id` (lazy) + `getAnimeById` | página detalle con `withComponentInputBinding()`, `ion-back-button`, estados |
| **R6 favoritos** | `@capacitor/preferences` | `favorites.service.ts` con `signal` de ids, página `favoritos`, toggle en la tarjeta o el detalle |

---

## 9. Zonas y cierre (acordado con MiMo)

- 🟩 DeepSeek: `src/**`. 🟦 MiMo: raíz, configs, `android/`, `README.md`, `.git/` remoto.
- Antes de cada commit: `npm run build` + `tsc` + `lint` + `npm test` en verde.
- Al cerrar: actualizar §11 de `PLAN.md`, bloque en `HANDOFF.md` y commit propio. No hacer `git init` (repo existente, remoto en GitHub).
- El APK actual corresponde al estado R1+R2+R7; **MiMo lo regenera** tras R3–R6.

---

## 10. Pendientes conocidos (no bloquean)

- `README.md` puede seguir mencionando 9/9 tests y 74/75: lo actual es **17/17** (zona MiMo).
- Re-puntuación final cerrada: **75/75** (R1 20 · R2 25 · R7 20 · estados 10). Quedan 6 nits documentados por el revisor, ninguno afecta requisitos: guard que apaga el spinner antes de tiempo, token de generación para `reiniciar()` con carga en vuelo (R3), test que sustituye el `@ViewChild` por un stub, etc.
- Warning histórico del APK: tema Android `Theme.AppCompat.DayNight` con app forzada en oscuro → revisar status bar en dispositivo (zona MiMo).
