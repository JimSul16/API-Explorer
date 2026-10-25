# REGISTRO-DEEPSEEK — estado final de `src/**` (R1 – R7)

> Sesión 🟩 **DeepSeek** (`deepseek-codigo`) · zona exclusiva: `src/**`.
> Abierto al cerrar la etapa R1+R2+R7 (22/10) · **actualizado al cerrar R3–R6 (25/10)**.
> Léelo junto a `REGISTRO-MIMO.md`, `HANDOFF.md` y `PLAN.md` antes de tocar código.

---

## 0. Titular

**R1–R7 implementados y commiteados.** `fase-E-R3` (`a1a423f`) · `fase-G-R4R5` (`417b3d1`) · `fase-G-R6` (`f0998a4`) · `fc77b64` (estilos compartidos).
Lo único que falta del plan es la **fase H de 🟦 MiMo**: verificación final, APK, auditoría, README y push.

---

## 1. Snapshot de `src/app`

```
src/app/
├── app.component.ts/.html/.spec.ts     ion-app + ion-router-outlet (sin lógica)
├── app.routes.ts                       '' → HomePage · 'anime/:id' → DetailPage · 'favoritos' → FavoritesPage · '**' → ''
├── models/anime.model.ts               Anime (incl. sinopsis) · PageResult · FalloApi/FalloApiTipo
├── lib/
│   ├── fallos.ts                       mensajeDeFallo · etiquetaDeFallo · aFallo · esNoEncontrado
│   ├── fallos.spec.ts                  5 tests
│   └── portada.ts                      inicialesDe · matizDe · notaDe (monograma y nota)
├── services/
│   ├── anime.service.ts                ÚNICA puerta a Kitsu (HttpClient): getAnime · getAnimeById · toAnime · clasificar
│   ├── anime.service.spec.ts           7 tests
│   ├── favorites.service.ts            Preferences: ids en signal, init idempotente, toggle con reversión
│   └── favorites.service.spec.ts       9 tests
├── components/
│   ├── anime-card/                     portada 2:3 + monograma · estrella de favorito (input/output)
│   └── panel-estado/                   panel compartido de cargando/vacío/error/noEncontrado
└── pages/
    ├── home/                           listado + búsqueda + infinite scroll + estados (23 tests)
    ├── detail/                         ficha por :id con estados y favorito (9 tests)
    └── favorites/                      favoritos locales con estados y fallos parciales (5 tests)

src/theme/variables.scss                paleta e identidad (medianoche + coral sakura)
src/global.scss                         dark.always + chrome de cabecera + .aviso/.reintentar-inline/.ir-favoritos
src/main.ts                             provideHttpClient(withFetch) · provideAppInitializer(favoritos) · addIcons
src/environments/environment(.prod).ts  apiUrl de Kitsu
```

Reglas de arquitectura que **no** se rompieron:
- `HttpClient` **solo** vive en `AnimeService`. Ninguna página ni componente lo importa.
- `FavoritesService` es la **única** puerta a `@capacitor/preferences`.
- `anime-card` y `panel-estado` son **presentacionales** (inputs/outputs, cero servicios).

---

## 2. Contrato de datos (no romperlo)

`src/app/models/anime.model.ts`

| Tipo | Campos |
|---|---|
| `Anime` | `id`, `titulo`, `portada`, `anio`, `rating: number \| null`, `episodios: number \| null`, `tipo`, `sinopsis: string \| null` |
| `PageResult` | `items`, `offset`, `total`, `hasMore` |
| `FalloApi` | `{ tipo: 'red' \| 'servidor' \| 'cliente' \| 'limite' \| 'desconocido'; status: number }` |

Reglas de paginación (verificadas contra la API real: `meta.count` = 22 515):

```ts
// servicio
hasMore = items.length > 0 && offset + PAGE_SIZE < meta.count

// página
offset = res.offset + res.items.length     // por lo RECIBIDO, no por pageSize
hasMore = res.items.length > 0 && nuevos.length === 0 ? false : res.hasMore   // freno si la API repite página
```

- `PAGE_SIZE = 20` (`AnimeService.pageSize`).
- Listado: `fields[anime]=canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype`.
- Detalle: los mismos campos **+ `synopsis`** (el listado la deja en `null` a propósito).
- `filter[text]` solo se envía con query no vacía.
- Header `Accept: application/vnd.api+json`; URL desde `environment.apiUrl`.
- `getAnimeById` traduce un **200 sin `data`** a `HttpErrorResponse({ status: 404 })` → una sola vía de clasificación (`esNoEncontrado()`).

---

## 3. R1 – R7: dónde está cada punto

| Requisito | Implementación | Evidencia |
|---|---|---|
| **R1** datos reales | `AnimeService.getAnime()` → Kitsu; la página nunca importa `HttpClient` | `services/anime.service.ts` |
| R1 tarjeta | `anime-card`: portada `aspect-ratio: 2/3` + monograma (matiz por id), ★ nota /10, año · tipo · episodios, `loading="lazy"`, `alt` | `components/anime-card/*` |
| **R2** scroll | `ion-infinite-scroll` + `ion-infinite-scroll-content` — sin botón "cargar más" | `home.page.html` |
| R2 estado | `items` acumulados, `Set<string> ids`, `offset`, `hasMore`, `cargando`, `fallo` (signals) | `home.page.ts` |
| R2 guard | `if (this.cargando() \|\| !this.hasMore())` → `complete()` y salir | `home.page.ts` `cargar()` |
| R2 complete | `this.infinite?.complete()` en el `finally` **y** en el early-return; dentro del guard de generación a propósito | `home.page.ts` |
| R2 fin real | `hasMore` por `meta.count` (no simulado) + `finSinProgreso` si la API repite página | `anime.service.ts`, `home.page.ts` |
| R2 error | aviso inline sin perder la lista + reintento del **mismo offset** | `home.page.html`, `global.scss` `.aviso` |
| R2 al agotar | `[disabled]="!hasMore() \|\| fallo() \|\| items().length === 0"` | `home.page.html` |
| **R3** búsqueda | `ion-searchbar [debounce]="400"` + `query` en signal + chip con la consulta + `close-circle` | `home.page.html/.ts` |
| R3 reinicio | `reiniciar(query)`: `ids.clear()` · `offset=0` · `items=[]` · `total=0` · `hasMore=true` · `finSinProgreso=false` · `fallo=null` → `cargar()` → `scrollToTop()` | `home.page.ts` |
| R3 respuestas viejas | **token de generación** (`generacion`): respuesta, `catch` y `finally` de una generación anterior se descartan | `home.page.ts` |
| R3 trampa Ionic | `reiniciar()` espera `enVuelo` antes de vaciar (si no, `didFire=true` deja el scroll mudo) | `home.page.ts` |
| R3 vacío ≠ error | vacío con acción "Ver catálogo completo"; error con "Reintentar" | `panel-estado` |
| **R4** detalle | ruta lazy `anime/:id` (input binding) + `getAnimeById()` reutilizando `toAnime()` | `app.routes.ts`, `anime.service.ts` |
| R4 navegación | tarjeta → `<a [routerLink]="['/anime', anime().id]">`; `ion-back-button`; el outlet cachea home y **conserva el scroll** | `anime-card.component.html`, `detail.page.html` |
| R4 recarga | `effect()` sobre `input('id')` + token de generación + `pedido` (evita repetir si el id se reasigna igual) | `detail.page.ts` |
| **R5** estados | `panel-estado` reutilizado: cargando (skeleton con la forma de la ficha) · `noEncontrado` (404) · `error` con Reintentar · vacío en home y favoritos | `pages/*/` |
| **R6** favoritos | `FavoritesService`: **solo ids** (`JSON.stringify(string[])`), `signal` + `total`, `init()` idempotente, `toggle()` optimista con **reversión del id concreto**, `quitar()`, `parsear()` defensivo | `services/favorites.service.ts` |
| R6 arranque | `provideAppInitializer(() => inject(FavoritesService).init())` → la estrella ya sale marcada en el primer render | `main.ts` |
| R6 UI | ★ de 44 px con `aria-pressed` en la tarjeta (hermano del `<a>`) · botón "Guardar en favoritos" en la ficha · acceso con contador en la cabecera | `anime-card`, `detail.page`, `global.scss` `.ir-favoritos` |
| R6 página | `pages/favorites/` + ruta `favoritos`: pide **una ficha por id en serie** (Kitsu 3 req/s), reutiliza lo cargado en `ionViewWillEnter`, estados cargando/vacío/error/**aviso de fallos parciales** | `pages/favorites/` |
| **R7** estructura | `models/ services/ pages/ components/ lib/`; standalone con `imports: []`; rutas lazy; `environment` en uso | `app.routes.ts`, todo `src/app` |

---

## 4. Interfaz (skill `ui-ionic-design`)

- Identidad **medianoche + coral sakura**: fondo `#0d0f16`, superficie `#171a24`, primario `#ff5a76`, secundario aqua `#35d0ba`, estrella `#ffc857`.
- Tema **oscuro por identidad** (`dark.always`), no por `prefers-color-scheme`.
- Estados: skeleton con shimmer · vacío · error con **Reintentar ≥44 px** · fin "Has llegado al final · N de 22 515 títulos".
- Copy del fallo según tipo (`lib/fallos.ts`): red / servidor (5xx) / límite (429) / cliente (4xx) / desconocido (error propio).
- Accesibilidad: `aria-live` en el contador, `aria-busy` en el skeleton, `role="alert"` en errores, `alt` descriptivo, `:focus-visible` en la tarjeta enlazada, `aria-pressed` en la estrella.
- Iconos registrados **una sola vez** en `main.ts` con `addIcons()`: `star`, `heart`, `heart-outline`, `cloud-offline-outline`, `search-outline`, `checkmark-done-outline`, `close-circle`, `calendar-outline`, `albums-outline`. **Si añades un icono, regístralo ahí** o no se verá. (`ion-back-button` trae el suyo.)
- Presupuesto de estilos: `anyComponentStyle` 3 kB warning / 6 kB error. Los bloques compartidos viven en `src/global.scss` (`.cabecera`, `.marca`, `.pulso`, `.fuente`, `.aviso`, `.reintentar-inline`, `.ir-favoritos`) justo para no inflar los `.scss` de página.

---

## 5. Tests: **59 en 7 archivos**

| Archivo | Tests | Qué cubre |
|---|---|---|
| `pages/home/home.page.spec.ts` | 23 | primera página, concat sin duplicados, duplicados intra-página, error sin perder lista + reintento mismo offset, fin por `count` + `disabled`, vacío ≠ error, página vacía corta, guard anti-simultáneas, `complete()` incluso con error, offset por lo recibido, freno si la API repite página, pausa del scroll tras error, mensajes por tipo de fallo, **R3**: reinicio total, respuesta vieja descartada, solo gana la última búsqueda, vacío de búsqueda, paginar tras buscar, `debounce === 400` y `trim()`, `limpiar()`; **R6**: estrella y coherencia del reinicio |
| `pages/detail/detail.page.spec.ts` | 9 | ficha ok con sinopsis, 404 / id vacío, error de red con reintento, recarga al cambiar de id, respuesta vieja descartada, favorito |
| `pages/favorites/favorites.page.spec.ts` | 5 | carga por ids, vacío, error con reintento, fallos parciales, quitar favorito |
| `services/anime.service.spec.ts` | 7 | params de Kitsu + `filter[text]`, normalización JSON:API, `hasMore` por `count`, clasificación red/servidor/429/cliente, `getAnimeById` (+sinopsis), 404 / 200 sin recurso |
| `services/favorites.service.spec.ts` | 9 | `init()` idempotente, unión con toggles en vuelo, toggle alta/baja, persistencia, reversión si falla la escritura, JSON corrupto, ids no string |
| `lib/fallos.spec.ts` | 5 | mensajes y etiquetas por tipo, `aFallo()` defensivo, `esNoEncontrado()` |
| `app.component.spec.ts` | 1 | smoke del shell |

Comandos verdes (25/10, cierre de G2):

```bash
npm run build                          # 0 errores · 0 warnings
npx tsc -p tsconfig.app.json --noEmit  # 0
npx tsc -p tsconfig.spec.json --noEmit # 0
npm run lint                           # All files pass linting
npm test -- --watch=false              # 7 archivos · 59/59
```

---

## 6. Trampas que ya costaron tiempo (no repetirlas)

1. **`fixture.whenStable()` solo avanza un microtask.** Las páginas con carga inicial necesitan `asentar()` (`await new Promise(r => setTimeout(r))`) en los specs; si no, `expectOne` no encuentra la petición.
2. **`reiniciar()` con carga en vuelo.** Ionic pone `isLoading=false` en `disabledChanged()` **sin** resetear `didFire`; vaciar `items` a mitad de carga deja el `ion-infinite-scroll` **mudo**. Solución: `await this.enVuelo` antes de vaciar.
3. **`complete()` dentro del guard de generación** es intencional: cerrar el spinner de una generación vieja apagaría el de la carga nueva.
4. **`[disabled]` incluye `fallo()`** (anti-bucle): `complete()` oculta el spinner → el contenido encoge → salta `scroll` → nueva petición → falla → … Cualquier reintento debe limpiar `fallo` antes de pedir (lo hace `cargar()`).
5. **`effect()` en detalle, no `ngOnInit`**: la vista se reutiliza entre fichas.
6. **Favoritos = ids**, nunca objetos; las fichas se piden a la API.
7. **`Preferences` en tests** se simula con `vi.mock('@capacitor/preferences', …)`.
8. **Presupuesto SCSS**: `detail.page.scss` se recortó dos veces para no pasar de 3 kB (fuera el `@media` de la rejilla del hero y el `transform: scale`). Un estilo nuevo puede volver a disparar el warning.
9. **Iconos** → `addIcons()` en `main.ts`.
10. **Lint/estilo del repo**: standalone con `imports: []`, `OnPush`, signals, `@if/@for/@switch`, prefijo `app`, sufijos `Page`/`Component`, `strictTemplates`, sin `any`.

---

## 7. Lo que queda (fase H, 🟦 MiMo)

| # | Tarea | Nota |
|---|---|---|
| 1 | `verificador-build` + `revisor-rubrica` sobre el estado final | 4 comandos + puntuación R1–R7 |
| 2 | **APK por terminal** | `npm run build` → `npx cap sync android` → `android\gradlew.bat assembleDebug`. El APK actual es **anterior** a R3–R6 |
| 3 | `auditor-muerto` + remediación de `AUDITORIA-DEPS.md` | 5 vulnerabilidades del starter (1 high), build-time |
| 4 | `README.md` | Hoy dice R4/R5/R6 ⏳, "9/9 tests" y un `git clone` de ejemplo. Lo real: **R1–R7 ✅ · 59 tests en 7 archivos** · remote `JimSul16/API-Explorer` · offset por lo recibido · faltan capturas/video |
| 5 | §11 de `PLAN.md` + push final | §11 ya está al día hasta G2 |

---

## 8. Zonas y cierre (acordado con MiMo)

- 🟩 DeepSeek: `src/**`. 🟦 MiMo: raíz, configs, `android/`, `README.md`, `.git/` remoto.
- Antes de cada commit: `npm run build` + `tsc` (app y spec) + `lint` + `npm test` en verde.
- Al cerrar: bloque en `HANDOFF.md`, fila en §11 de `PLAN.md` y commit propio. **No `git init`** (repo existente con remoto en GitHub).
- Nunca `git add` de archivos de MiMo (`android/**`, `README.md`, `AUDITORIA-DEPS.md`, raíz).
