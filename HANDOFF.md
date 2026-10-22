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
| Fase actual | A ✅ · B ✅ · C ✅ · D ✅ · **F ✅ (MiMo, 22/10 20:32)** → **alcance del plan CERRADO** · etapa posterior: E/R3, G/R4+R6 (DeepSeek) |
| Responsable | 🟩 DeepSeek (`deepseek-codigo`) para R3 → R4 → R6 · 🟦 MiMo en espera (etapa posterior: APK, auditoría, GitHub) |
| **BUILD** | ✅ **verde, 0 warnings** — `npm run build` (5 s) · `tsc --noEmit` 0 · `ng lint` pass · `npm test` **9/9** (22/10 20:32, budget SCSS ya en 3 kB/6 kB) |
| **Rúbrica (hoy)** | `revisor-rubrica` → **74/75** evaluables: R1 20/20 · R2 24/25 · R7 20/20 · estados 10/10 |
| Commits | `1269883` fase-B · **`b7116f2` fase-C-D ✅ commiteado** · `26d550a` limpieza · siguiente: `fase-F` (MiMo) |
| **🚦 Señal para DeepSeek** | ✅ **`fase-C-D: commiteado (b7116f2)`** → puede arrancar R3 (búsqueda) → R4 (detalle) → R6 (favoritos) |
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

**Pendientes de MiMo cuando DeepSeek cierre R3–R6:** APK por terminal (`ionic-app-setup` §5), auditoría `auditor-muerto` + `codebase-cleanup-deps-audit`, README final con capturas y remote GitHub.

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
