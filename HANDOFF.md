# HANDOFF — pass the baton entre MiMo y DeepSeek

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el siguiente lo lee antes de tocar un archivo.
> Regla: **un solo escritor a la vez**. Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Alcance del plan** | **R1 + R2 + estructura R7** (fases A–D + F); R3–R6 y APK = etapa posterior (PLAN.md §4.2) |
| **Modo** | **Paralelo** (PLAN.md §3.4): 🟦 MiMo = raíz/config · 🟩 DeepSeek = `src/**` |
| **SCAFFOLD** | ✅ **listo** (22/10 20:12) |
| Fase actual | A ✅ · B ✅ · C ✅ · D ✅ · F ✅ (MiMo, 22/10 20:32) · **P ✅ pulido R1+R2+R7 (DeepSeek)** → **alcance del plan CERRADO** · etapa posterior: E/R3, G/R4+R6 (DeepSeek) |
| Responsable | 🟩 DeepSeek (`deepseek-codigo`) para R3 → R4 → R6 · 🟦 MiMo en espera (etapa posterior: APK, auditoría, GitHub) |
| **BUILD** | ✅ **verde, 0 warnings** — `npm run build` (6 s) · `tsc` app y spec 0 · `ng lint` pass · `npm test` **18/18** (22/10, tras el pulido) |
| **Rúbrica (hoy)** | `revisor-rubrica` → **75/75** evaluables: R1 20/20 · R2 25/25 · R7 20/20 · estados 10/10. Sin bloqueantes ni medios. |
| Commits | `1269883` fase-B · `b7116f2` fase-C-D · `26d550a` limpieza · `0f7bfe8` fase-F · `8b40df9` evidencia-APK · `9c5d1f9` README · `059c4c0` pulido (16/16) · `934c977` REGISTRO-MIMO + registro |
| **🚦 Señal para DeepSeek** | ✅ **`fase-C-D: commiteado (b7116f2)`** → puede arrancar R3 (búsqueda) → R4 (detalle) → R6 (favoritos) |
| **📘 Registros de continuidad** | `REGISTRO-MIMO.md` (🟦 MiMo: todo lo hecho + comandos + lo que falta) · `REGISTRO-DEEPSEEK.md` (🟩 DeepSeek: código e interfaz) → base del **nuevo plan en nueva sesión** (R3–R6) |
| Archivos tocados | raíz + configs (MiMo) · `src/**` completo (DeepSeek) |

---

## Handoff #1 — de MiMo a DeepSeek ✅ ENTREGADO

**Fase completada:** **B — Estructura R7 + dependencias** (fases A y B cerradas).

**Qué quedó hecho (zona MiMo: raíz y configs)**
- [x] `ionic start apptmp blank --type=angular-standalone --capacitor --no-git` → movido a la raíz, temporal eliminada.
- [x] Estructura R7 creada: `src/app/{models,services,pages,components}` (con `.gitkeep`) + `home` movido a `pages/home`.
- [x] `src/main.ts`: `provideHttpClient(withFetch())` + `provideIonicAngular()` + router con preloading.
- [x] `src/app/app.routes.ts`: rutas `'' → home` (lazy) y `** → home`. *R4 `anime/:id` y `favoritos` quedan pendientes en §4.2.*
- [x] `npm i @capacitor/preferences@8.0.1`.
- [x] Identidad: `package.json` → `api-explorer` · `capacitor.config.ts` → `appName: 'API Explorer'`, `appId: 'com.esfot.apiexplorer'`.
- [x] `.browserslistrc` ajustado a `last 2 versions` (Angular 22 avisaba de versiones soportadas).
- [x] `README.md` parcial: API, endpoints, decisión de paginación, instalación, estructura, APK.
- [x] **BUILD: verde** (`npm run build`, 0 errores).

**Decisiones que el siguiente debe respetar**
- API = **Kitsu** (`https://kitsu.io/api/edge/anime`), no Jikan.
- `PAGE_SIZE = 20`; `hasMore = offset + 20 < meta.count`; normalizar JSON:API → `Anime`.
- Rutas: no crear `anime/:id` ni `favoritos` (etapa posterior, PLAN.md §4.2).
- `src/**` es **tuyo en exclusiva**; la raíz es mía.

**⚠️ Aviso para DeepSeek (tu zona, no lo toco yo)**
- `src/app/pages/home/home.page.scss` supera el presupuesto de `angular.json`: **2.49 kB > 2.00 kB** (warning en cada build). Opción: dividir estilos (`anime-card` ya tiene el suyo) o avisarme para subir el budget en `angular.json` (mi zona).

**Preguntas / bloqueos:** ninguno.

---

## Handoff #2 — de DeepSeek a MiMo ✅ FASE C y D CERRADAS

**Fases completadas:** **C (R1 listado real + interfaz)** y **D (R2 infinite scroll robusto)**.

**Qué quedó hecho (zona DeepSeek: `src/**`)**
- `models/anime.model.ts` → `Anime` (id, título, portada, año, rating, episodios, tipo) y `PageResult` (items, offset, total, hasMore).
- `services/anime.service.ts` → único con `HttpClient`. Kitsu + `page[limit]=20` + `page[offset]` + `fields[anime]` + `filter[text]` (listo para R3) + `Accept: application/vnd.api+json`. Normaliza JSON:API y **fin real** `hasMore = items.length > 0 && offset + 20 < meta.count`. URL desde `environment.apiUrl` (los `environment*.ts` ya no son código muerto).
- `components/anime-card/` → tarjeta reutilizable: portada **2:3**, fallback a **monograma con matiz por id** si la imagen falla/`posterImage` es null, nota ★ 8.2/10, año · tipo (TV/Película/OVA/ONA/Especial/Música) · episodios. `loading="lazy"`, `alt` descriptivo, `OnPush`.
- `pages/home/` → listado con `ion-infinite-scroll` + `ion-infinite-scroll-content` (dots, "Cargando más títulos…"): offset acumulado, `Set` de ids anti-duplicados, guard `cargando`, `complete()` en `finally`, `[disabled]` al agotar, error de página **inline sin perder la lista**, reintento del **mismo offset**, "Has llegado al final · N de 22 515".
- Estados: `estado()` (`cargando|error|vacio|lista`) + skeleton con shimmer en formato de tarjeta, vacío, error con **Reintentar ≥44 px**, mensaje de fin. `OnPush` y `aria-live` en el contador.
- `theme/variables.scss` → identidad **medianoche + coral sakura** (`#0d0f16` / `#ff5a76` / aqua `#35d0ba`), los 5 tonos por color custom. `global.scss` → `dark.always` (tema oscuro por identidad) + `ion-content` sin scroll horizontal. `index.html` con título/tema propio.
- `main.ts` → `provideHttpClient(withFetch())` + `addIcons()` (star, cloud-offline, search, checkmark-done) para que `ion-icon` no descargue nada en runtime.
- `home.page.spec.ts` → **9 tests** (primera página, dedupe, error + reintento mismo offset, fin por `count`, vacío ≠ error, página vacía corta la paginación, guard anti-simultáneas, `complete()` incluso con error).
- Limpieza: fuera `app.component.scss` (vacío, sin `styleUrls`) y los `.gitkeep` de carpetas ya pobladas.

**Siguiente (MiMo, fase F)**
- [ ] `verificador-build` + `revisor-rubrica` → commit y evidencia (captura/video del listado + scroll).
- [ ] **Pedido de config (tu zona, `angular.json`)**: subir `anyComponentStyle` a **3 kB warning / 6 kB error**. `home.page.scss` = 2.53 kB → hoy sale 1 WARNING en cada build (0 errores). Preferí no mutilar la UI para caber en 2 kB.
- [ ] README final: pegar captura y la sección de paginación (ya está la base que escribiste).

**Decisiones a respetar**
- Todo el HTTP vive en `AnimeService`; las páginas solo consumen `PageResult`.
- `PAGE_SIZE = 20` (propiedad `pageSize` del servicio, la página la usa para avanzar el offset).
- No crear `anime/:id` ni `favoritos` todavía (R4/R6, §4.2).
- El tema es oscuro por identidad (`dark.always`), no por `prefers-color-scheme`.
- R3 (búsqueda con reinicio) reutiliza `reiniciar()` de `HomePage` y ya tiene `filter[text]` en el servicio.

**BUILD**
```
npm run build                        → verde, 0 errores (1 warning: budget de SCSS)
npx tsc -p tsconfig.app.json --noEmit → 0 errores
npm run lint                         → "All files pass linting"
npm test -- --watch=false            → 9/9 tests
```
Integración real: `ng serve` → `http://localhost:8100/` 200 · `main.js` 200 · `styles.css` 200 · Kitsu responde `ACAO: *` (CORS OK). **Rúbrica (subagente): 73/75 sobre lo evaluado** — R1 20/20, R2 24/25, R7 19/20, estados 10/10; los 2 puntos restados ya están corregidos en este cierre (página vacía corta la paginación; `environment` en uso) y el copy del estado de error dejó de contradecirse.

**Errores conocidos:** ninguno funcional. Solo el warning de presupuesto SCSS.

**Nota de commits:** el baseline `1269883` de MiMo (`git add -A` a las 20:14) ya arrastró los archivos de la fase C que existían en ese momento; por eso C y D se cierran en **un commit atómico** (`fase-C-D`) en vez de dos, para no partir un estado que no compila de forma independiente.

---

## Handoff #3 — de MiMo a DeepSeek ✅ ALCANCE DEL PLAN CERRADO (F)

**Fase completada:** **F — verificación + cierre del alcance R1 + R2 + R7** (A, B, C, D y F cerradas).

**Qué hizo MiMo en este cierre (zona raíz/config)**
- [x] Verificación completa: `npm run build` (0 errores, **0 warnings** tras el budget) · `npx tsc -p tsconfig.app.json --noEmit` → 0 · `npm run lint` → pass · `npm test -- --watch=false` → **9/9**.
- [x] Commit del trabajo de DeepSeek: **`b7116f2` fase-C-D** (él lo preparó; MiMo verificó verde antes de darlo por bueno).
- [x] Limpieza: eliminado `Blo.txt` (archivo vacío accidental) → `26d550a`.
- [x] **Petición atendida**: `angular.json` → `anyComponentStyle` **3 kB warning / 6 kB error** (antes 2/4 kB). `home.page.scss` (2.53 kB) ya no avisa.
- [x] `ionic.config.json` → `"name": "api-explorer"` (aún decía `apptmp`).
- [x] `README.md` → sección de evidencias (comandos verdes, commits, 74/75) + aclaración de puertos (`npm start` :4200 · `ionic serve` :8100).
- [x] `revisor-rubrica` → **74/75** evaluables: R1 20/20 · R2 24/25 · R7 20/20 · estados 10/10 · **sin bloqueantes**.
- [x] §11 de PLAN.md actualizado; commit `fase-F`.

**🚦 Arranque de la etapa posterior**
- Señal dada en la tabla de estado: `fase-C-D: commiteado (b7116f2)`.
- Tu tanda sugerida: **R3** (búsqueda, el servicio ya soporta `filter[text]` y `HomePage` ya tiene `reiniciar()`) → **R4** (`anime/:id`, `withComponentInputBinding()` ya está activo) → **R6** (favoritos con `@capacitor/preferences@8.0.1` ya instalado).

**Pendientes de MiMo en la etapa posterior (tras R3–R6):** regenerar el **APK** con el código nuevo, auditoría `auditor-muerto` + `codebase-cleanup-deps-audit`, README final con capturas y remote GitHub.

**✅ APK ya generado (22/10 20:36) sobre el estado R1+R2+R7:**
`android\app\build\outputs\apk\debug\app-debug.apk` — **4.16 MB** · por terminal (`npm run build` → `npx cap add android` → `gradlew assembleDebug`, 37 s). Nuevo: `@capacitor/android@8.5.3` + carpeta `android/` (con su `.gitignore`; el APK y `local.properties` NO se commitean).

**Puntos del revisor que son de TU zona (opcionales, no bloquean)**
1. `home.page.ts:117` — offset avanza con `pageSize` fijo; con página corta no final se saltaría títulos → sugerido: `res.offset + (res.items.length || this.svc.pageSize)`.
2. `home.page.html:77` — `[disabled]` incluye `error()`: tras un fallo el scroll queda muerto salvo el botón inline.
3. `home.page.html:37` — copy "El catálogo no se ha perdido" no aplica en la primera carga (error inicial).
4. `anime.service.ts` — sin `catchError`: no distingue red caída de 4xx/5xx (útil para los mensajes de R5 cuando hagas el detalle).
5. `home.page.spec.ts:7` — URL de Kitsu hardcodeada en el test en vez de `environment.apiUrl`.

**BUILD**
```
npm run build                        → verde, 0 errores, 0 warnings (5 s)
npx tsc -p tsconfig.app.json --noEmit → 0 errores
npm run lint                         → All files pass linting
npm test -- --watch=false            → 9/9 tests
```

**Errores conocidos:** ninguno. (Diferido para fase H: 5 vulnerabilidades de npm audit del starter, sin relación con el código de la app.)

**NOTA IMPORTANTE SOBRE GIT (para las sesiones siguientes)**
- Ya hay repo local (`main`, 4 commits: `1269883` · `b7116f2` · `26d550a` · `fase-F`). **NO `git init` otra vez.**
- Antes de cada commit: `npm run build` en verde y actualizar §11 + este HANDOFF.
- Nadie hace `git add` de cambios ajenos en curso: `git add -A` solo cuando tu fase está completa.
- El **remote GitHub** lo configura MiMo en la fase H (no subir todavía).

---

## Handoff #4 — de DeepSeek a MiMo ✅ PULIDO R1+R2+R7 CERRADO

**Fase completada:** **P — pulido de R1 + R2 + R7** (los 5 puntos del `revisor-rubrica` + 2 hallazgos de una segunda pasada). Alcance sin cambios: **no** se añadió R3, R4 ni R6.

**Qué quedó hecho (zona DeepSeek: `src/**`)**
- [x] **Offset por lo recibido**: `this.offset = res.offset + res.items.length` (antes `+ pageSize` fijo, que se saltaba títulos si una página venía corta). Test: página de 3 → siguiente petición con `offset=3`.
- [x] **`[disabled]` vuelve a incluir `error()`**: se probó a quitarlo y la revisión demostró un **bucle de reintentos** (`complete()` oculta el spinner → el contenido encoge → salta `scroll` → nueva petición → falla → …). Queda `!hasMore() || error() || items().length === 0`: tras un fallo el scroll se pausa y el reintento es explícito (botón inline ≥44 px, que limpia el fallo). Test discriminante.
- [x] **Freno de progreso**: si la API repite una página (todos duplicados), `hasMore=false` en vez de encadenar peticiones hasta `meta.count`. Test nuevo.
- [x] **Copy del error según contexto**: panel "No pudimos cargar el catálogo" + `mensajeFallo()`; el aviso inline añade "Tu lista sigue aquí." (ya no promete "el catálogo no se ha perdido" en la primera carga). La cabecera usa `etiquetaFallo()`.
- [x] **`FalloApi` tipado**: `catchError` en `AnimeService` clasifica `red` (status 0) · `limite` (429) · `servidor` (5xx) · `cliente` (resto) **sin tocar `PageResult`**; 4 mensajes distintos en la UI.
- [x] **`total` solo se sobrescribe si `> 0`**; **tests usan `environment.apiUrl`**; eliminado el `constructor() {}` vacío del shell.
- [x] **Nuevo `src/app/services/anime.service.spec.ts`** (contrato de params, normalización, `hasMore`, clasificación de fallos) → **18 tests en 3 archivos**.
- [x] **Nits de la 3.ª pasada (revisor)**: deduplicación también **dentro** de una página (evita NG0955 en `track anime.id`), `aFallo()` valida lo capturado en vez de castear a ciegas, copy del fin con `finSinProgreso` ("La API dejó de devolver títulos nuevos") y `resumen` prioriza `items`.
- [x] **`REGISTRO-DEEPSEEK.md`** creado: estado de `src/**`, contrato de datos, R1/R2/R7 con evidencia, tests, trampas para R3–R6 y siguiente tanda.

**Decisiones a respetar**
- Todo el HTTP vive en `AnimeService`; `getAnime(query, offset)` ya acepta búsqueda (`filter[text]` listo para R3).
- `hasMore` real: `items.length > 0 && offset + 20 < meta.count`. **No** simular fin.
- `[disabled]` del infinite scroll incluye `error()` a propósito (anti-bucle); cualquier reintento debe limpiar `fallo` antes de pedir (lo hace `cargar()`).
- El APK actual (`android/app/build/outputs/apk/debug/app-debug.apk`) es del estado **anterior** al pulido: **MiMo debe regenerarlo**.
- Tema oscuro por identidad (`dark.always`); iconos nuevos → `addIcons()` en `main.ts`.

**⚠️ Trampa avisada para R3 (no está resuelta, hoy es inalcanzable)**
- `reiniciar()` vacía `items` mientras podría haber una carga disparada por scroll en vuelo. Ionic pone `isLoading=false` en `disabledChanged()` **sin** resetear `didFire`; el `complete()` posterior sale por el early-return y el scroll **no vuelve a disparar**. Al implementar la búsqueda: esperar la petición en vuelo antes de vaciar, o vaciar al recibir la respuesta.

**BUILD**
```
npm run build                          → verde, 0 errores, 0 warnings (4 s)
npx tsc -p tsconfig.app.json --noEmit  → 0 errores
npx tsc -p tsconfig.spec.json --noEmit → 0 errores
npm run lint                           → All files pass linting
npm test -- --watch=false              → 3 archivos · 18/18 tests
```
`verificador-build` (independiente): **BUILD: verde**, 0 errores / 0 warnings, 8/8 invariantes de R2 OK.

**Rúbrica:** `revisor-rubrica` → **75/75** sobre lo evaluable: R1 20/20 · R2 25/25 · R7 20/20 · estados 10/10. Sin bloqueantes ni medios.

**Errores conocidos:** ninguno funcional.
`README.md` puede seguir diciendo 9/9 tests → lo actual es **18/18** (zona MiMo).

---


## Plantilla para los siguientes handoffs

```
## Handoff #N — de <modelo A> a <modelo B>
Fase completada: ...
Hecho: ...
Siguiente: ...
Decisiones a respetar: ...
BUILD: verde/rojo (+ comando exacto)
Errores conocidos: ...
```
