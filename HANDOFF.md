# HANDOFF — pass the baton entre MiMo y DeepSeek

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el siguiente lo lee antes de tocar un archivo.
> Regla: **un solo escritor a la vez**. Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Alcance del plan** | **R1 + R2 + estructura R7** (fases A–D + F); R3–R6 y APK = etapa posterior (PLAN.md §4.2) |
| **Modo** | **Paralelo** (PLAN.md §3.4): 🟦 MiMo = raíz/config · 🟩 DeepSeek = `src/**` |
| **SCAFFOLD** | ✅ **listo** (22/10 20:12) — señal de arranque dada; DeepSeek ya trabaja |
| Fase actual | A ✅ · **B ✅ cerrada por MiMo** · **C y D en curso (DeepSeek)** |
| Responsable | 🟩 DeepSeek (`deepseek-codigo`) en `src/**` · 🟦 MiMo en espera de cierre |
| **BUILD** | ✅ **verde** — `npm run build` → 0 errores (22/10 20:14) · 1 warning (ver abajo) |
| Commits | pendiente el baseline (fase B) |
| Archivos tocados | `PLAN.md`, `HANDOFF.md`, `opencode.jsonc`, `.opencode/*`, raíz (configs, `README.md`, `.browserslistrc`), y en fase B: scaffold completo |

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
