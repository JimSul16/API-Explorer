# PLAN DE TRABAJO — API Explorer

> Reto práctico: **Desarrollo de Aplicaciones Móviles (ESFOT)** · Ionic + Angular Standalone + Capacitor
> Fuente: `Actividad_Ionic_APIs_Infinite_Scroll.pdf` · Modalidad: individual o parejas · Taller: 120 min
> Equipo de modelos: 🟦 **MiMo** (`opencode/mimo-v2.6-flash-free`) + 🟩 **DeepSeek** (`opencode/deepseek-v4.1-flash-free`)

---

## 0. Decisiones cerradas

| Decisión | Elección | Motivo |
|---|---|---|
| API | **Kitsu** — `https://kitsu.io/api/edge/anime` | Verificada (HTTP 200): sin clave, CORS habilitado, datos reales de anime, paginación real por offset/limit con `meta.count` = 22 515 registros. |
| Descartada | Jikan (MyAnimeList) | No responde desde la red local (timeout en 4 intentos). Respaldo si carga en el navegador. |
| Respaldos | Open Library / AniList | Conectan desde esta red, por si hay que justificar un cambio ante el docente. |
| Stack | Ionic 7 + Angular standalone + Capacitor | CLI 7.2.1, Node 22, npm 10 ya instalados. |
| Repositorio Git/GitHub | **Al final** | Commit por fase para seguridad, remote al cierre. |
| Reparto de modelos | 🟦 MiMo = entorno/deps/build/evidencia · 🟩 DeepSeek = programación e interfaz | Turnos por fase, **un solo escritor a la vez**. |
| **Alcance de este plan** | **R1 + R2 + estructura R7** (fases A–D + cierre) | Es la meta prioritaria de las 2 horas según el PDF §4. R3–R6 quedan como etapa posterior (§4.2). |
| **Interfaz (UI)** | 🟩 **DeepSeek**, con la skill `ui-ionic-design` | No había skills de diseño instaladas → se crearon 2 para el proyecto (§1). |
| **APK** | 🟦 **MiMo**, **por terminal** | `npm run build` → `npx cap sync android` → `android\gradlew.bat assembleDebug` (etapa posterior, §4.2). |
| Skills | 4 skills de `SKILLS_INSTALADAS` + 2 creadas (`ionic-app-setup`, `ui-ionic-design`) | §1 de este plan |
| Agentes | 2 primarios + 4 subagentes en `.opencode/agents/` | §2 de este plan |
| Coordinación | Turnos por fase + `HANDOFF.md` + build verde obligatorio | §3 de este plan |

### Endpoints de Kitsu (probados)

```
GET https://kitsu.io/api/edge/anime?page[limit]=20&page[offset]=0
     &fields[anime]=canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype
GET https://kitsu.io/api/edge/anime/{id}          ← detalle (sinopsis, rating, episodios)
GET https://kitsu.io/api/edge/anime?filter[text]=Naruto&page[limit]=20&page[offset]=0   ← búsqueda
```

Respuesta (JSON:API):
```json
{
  "links": { "first": "...", "next": "...page%5Boffset%5D=20", "last": "...page%5Boffset%5D=22513" },
  "meta":  { "count": 22515 },
  "data":  [ { "id": "1", "attributes": {
                 "canonicalTitle": "Cowboy Bebop",
                 "posterImage": { "large": "https://media.kitsu.app/..." },
                 "startDate": "1998-04-03", "averageRating": "82.28",
                 "episodeCount": 26, "subtype": "TV" } } ]
}
```

**Criterio de fin de paginación (real, no simulado):** `offset + page[limit] >= meta.count` → cumple la condición del PDF de no repetir datos.

---

## 1. Skills: qué usa cada modelo

Importadas desde `C:/Users/Asus Tuf/Documents/Proyecto/Pruebas/SKILLS_INSTALADAS` mediante el array `skills` de `opencode.jsonc` (cada subcarpeta con `SKILL.md` = 1 skill). Ya aparecen en la lista de skills de la sesión.

| Skill (ID) | Qué aporta | 🟦 MiMo la usa en | 🟩 DeepSeek la usa en |
|---|---|---|---|
| `pruebas-frontend-esfot` | Criterios de "verde": build, typecheck, lint, contrato de tipos, integración real y CORS | **B, F, H** — compilar/instalar y cerrar evidencia | **C, D, E, G** — tras cada fase de código, antes de darla por terminada |
| `refactor-seguro` | Protocolo evidencia → clasificación A/B/C/D → verificación → ejecución antes de **cualquier** borrado | **B** (limpiar plantilla base), **H** (quitar código sobrante) | **C–G** antes de refactorizar o eliminar un export/archivo |
| `deteccion-codigo-muerto` | Inventario de código no usado con evidencia de grep y clasificación de riesgo | **H** — auditoría final con el subagente `auditor-muerto` | Al cerrar **C, D, E, G**: no dejar exports, componentes ni tipos sin usar |
| `pruebas-backend-esfot` | Playbook Jest/Newman/Neo4j del backend ESFOT | ⚠️ **Reserva**: no aplica (no hay backend). Se activa solo si aparece un proxy/evita CORS | ⚠️ **Reserva**: idem |
| **`ionic-app-setup`** *(creada para este proyecto)* | Creación de la app móvil: `ionic start` en carpeta no vacía, estructura standalone (R7), `app.config.ts`, rutas, dependencias y **compilación del APK por terminal** | **B** y **APK** (§4.2) — su skill principal | Solo lectura, para respetar la estructura |
| **`ui-ionic-design`** *(creada para este proyecto)* | Interfaz **no genérica**: paleta e identidad, tema oscuro/claro, tarjetas con portada y fallback, estados skeleton/vacío/error, jerarquía, accesibilidad táctil, checklist visual | — (opcional) | **C y D — es la skill de la interfaz**: 🟩 DeepSeek es quien hace la UI |

> **Dato verificado:** en `SKILLS_INSTALADAS` hay 4 skills y en las globales 7 — **ninguna de diseño ni de creación de apps móviles**. Por eso se crearon `ionic-app-setup` y `ui-ionic-design` en `.opencode/skills/` (descubrimiento automático, sin tocar `opencode.jsonc`).

**Notas de adaptación (honestidad de uso):**
- `pruebas-frontend-esfot` está escrita para el stack React/Vite/Vitest de ESFOT. De ella se toman los **criterios de verde y la regla de contrato de tipos**; los comandos se adaptan a Angular: `npm run build` (`ng build`), `npm run lint`, `npx tsc --noEmit`.
- `pruebas-backend-esfot` no se fuerza: Kitsu tiene CORS habilitado, así que no hace falta backend. Queda documentada por si el docente pide un proxy o si el reto se extiende.
- Cómo invocarlas: `@refactor-seguro`, `@deteccion-codigo-muerto`, `@pruebas-frontend-esfot` en el prompt, o dejar que el agente las cargue solo con la herramienta `skill`.

**✅ Verificado en la API de OpenCode:** las 4 skills anteriores quedan registradas para esta carpeta (junto a las globales de `~/.config/opencode/skills`).

### 1.1 Otras skills globales instaladas (opcionales, no son de SKILLS_INSTALADAS)

| Skill | Cuándo sirve aquí | Quién la usa |
|---|---|---|
| `debugger` | Cuando `verificador-build` marque **rojo**: causa raíz, fix mínimo y prevención | 🟩 DeepSeek (al corregir errores) · 🟦 MiMo (errores de build/Capacitor) |
| `codebase-cleanup-refactor-clean` | Refactor limpio por fases, cambios revisables y reversibles | 🟩 DeepSeek antes de cerrar G |
| `codebase-cleanup-deps-audit` | Auditoría de dependencias antes del entregable (licencias/vulnerabilidades) | 🟦 MiMo en fase H |
| `code-refactoring-tech-debt` / `codebase-cleanup-tech-debt` | Solo si aparece deuda real; no es un requisito de la rúbrica | cualquiera, bajo petición |
| `javascript-testing-patterns` / `e2e-testing-patterns` | Si decides sumar tests (extensión opcional, no puntúa) | 🟩 DeepSeek, opcional |

---

## 2. Agentes y subagentes

Definidos en `.opencode/agents/*.md` (Markdown con frontmatter + prompt del sistema). **Se cargan al iniciar una sesión nueva en esta carpeta.**

### 2.1 Agentes primarios — uno por sesión (cada uno con su modelo)

| Archivo | ID | Modelo | Rol | Fases |
|---|---|---|---|---|
| `.opencode/agents/mimo-infra.md` | **`mimo-infra`** | `opencode/mimo-v2.6-flash-free` 🟦 | Proyecto Ionic, dependencias, configuración, build, git, README y **APK por terminal** | **A, B, F** (alcance) · APK/auditoría/GitHub: etapa posterior |
| `.opencode/agents/deepseek-codigo.md` | **`deepseek-codigo`** | `opencode/deepseek-v4.1-flash-free` 🟩 | Modelos, servicio HTTP, componentes, páginas, **interfaz**, infinite scroll | **C, D** (alcance) · búsqueda, detalle y favoritos: etapa posterior |

- Cómo usarlo: en una sesión nueva selecciona el agente (`mimo-infra` o `deepseek-codigo`). El agente trae fijado su modelo; si la sesión no lo aplica, selecciónalo tú con el selector de modelos.
- Las dos sesiones **nunca** escriben a la vez en la carpeta (regla de un solo escritor).

### 2.2 Subagentes — se lanzan desde cualquiera de los dos primarios

| Archivo | ID | Modelo | Qué hace | Permisos |
|---|---|---|---|---|
| `verificador-api.md` | **`verificador-api`** | 🟦 MiMo | Prueba los 3 escenarios de endpoint (página 1, página 2, búsqueda agotada), devuelve estado HTTP, cómo se calcula `hasMore`, límites y JSON de muestra. **Fase A.** | Sin edición · `webfetch` + `Invoke-WebRequest`/`curl`/`Resolve-DnsName` |
| `verificador-build.md` | **`verificador-build`** | 🟦 MiMo | Ejecuta `npm run build` / `ng build` / `lint` / `tsc --noEmit` y reporta `BUILD: verde|rojo` con errores `archivo:línea`. **Tras cada fase.** | Sin edición · shell `npm*`, `npx*`, `node*` |
| `revisor-rubrica.md` | **`revisor-rubrica`** | 🟩 DeepSeek | Revisa contra R1–R7 y la rúbrica de 100 pts: `complete()` en `finally`, anti-duplicados, reinicio de búsqueda, estados, etc. Devuelve hallazgos por severidad + puntuación estimada. **Al cerrar C, D, E, G.** | Solo lectura · puede cargar skills |
| `auditor-muerto.md` | **`auditor-muerto`** | 🟩 DeepSeek | Aplica `deteccion-codigo-muerto` + `refactor-seguro` a `src/app/**` (imports, `app.routes.ts`, `imports: []` standalone, `routerLink` por string). Reporta con evidencia, **no borra**. **Fase H / limpiezas.** | Sin edición · `grep`/`Select-String`, `npm run*` |

**Subagentes nativos de OpenCode** (disponibles sin crear nada, útiles de referencia):
- `explore` — lee/busca código o referencias sin editar → usarlo para leer la PDF, plantillas de Ionic o ejemplos.
- `general` — investigación o tareas de varios pasos con acceso amplio de herramientas.

**Profundidad:** `experimental.subagent_depth = 2` en `opencode.jsonc` permite que un subagente lance a su vez a otro (p. ej. `revisor-rubrica` → `explore` para mirar un archivo).

### 2.3 Cómo se invocan

```
Usa el subagente verificador-api para probar los endpoints de Kitsu.
Usa el subagente verificador-build y dame el veredicto.
Usa el subagente revisor-rubrica para revisar la fase D.
Carga @refactor-seguro antes de borrar ese archivo.
```

---

## 3. Coordinación MiMo ↔ DeepSeek

### 3.1 Secuencia de turnos

```
[Sesión 1 · mimo-infra 🟦]              [Sesión 2 · deepseek-codigo 🟩]
 Fase A → subagente verificador-api
 Fase B → scaffold + deps + rutas
   └─ build verde ──► commit ──► HANDOFF ──►  Fase C → modelo + servicio + tarjetas
                                                        └─ verificador-build + revisor-rubrica
                                                        └─ build verde ──► commit ──► HANDOFF
 ◄────────────────────────────────────────────────  Fase D → infinite scroll
 ◄────────────────────────────────────────────────  Fase E → búsqueda
 Fase F → build + README parcial + evidencia ◄───
                                                        Fase G → detalle + errores + favoritos
 Fase H → auditor-muerto + cap sync + APK + README final
```

### 3.2 Protocolo obligatorio de cierre de turno (los 4 pasos)

1. **Build verde**: lanza `verificador-build`; si está rojo, no se pasa el testigo.
2. **Actualiza `PLAN.md`**: tabla *Progreso por fase* (§11).
3. **Escribe tu bloque en `HANDOFF.md`**: fase hecha, archivos tocados, decisiones a respetar, errores conocidos, siguiente paso.
4. **Commit atómico**: `git add -A && git commit -m "fase-X: descripción"`.

Quien arranca la siguiente fase: lee `PLAN.md` + `HANDOFF.md` (ambos se cargan solos como instrucciones), verifica que el bloque anterior diga `BUILD: verde` y solo entonces edita.

### 3.3 Reglas de no-colisión

1. **Un solo escritor a la vez**: si la sesión MiMo está aberta y trabajando, no abras la de DeepSeek (y viceversa).
2. **Zonas por modelo**: MiMo toca `package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts`, `README.md`, `.git/`, raíz. DeepSeek toca `src/app/**`. Si uno necesita algo del otro, lo anota en `HANDOFF.md` en vez de tocarlo.
3. **Nada de build rojo al pasar el testigo.**
4. **Conflicto**: si ambos tocaron lo mismo, el usuario decide; se revierte con git (`git checkout -- <archivo>`).
5. **Subagentes en paralelo**: se pueden lanzar varios a la vez **solo** si son de solo lectura (`verificador-build`, `revisor-rubrica`, `verificador-api`, `auditor-muerto`).

### 3.4 Ejecución simultánea — los dos modelos a la vez

Para correr MiMo y DeepSeek **al mismo tiempo** sin pisarse se divide por **zonas exclusivas**:

| | 🟦 MiMo (`mimo-infra`) | 🟩 DeepSeek (`deepseek-codigo`) |
|---|---|---|
| **Zona exclusiva** | raíz: `package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts`, `README.md`, `.git/`, `.opencode/`, `PLAN.md`, `HANDOFF.md` | `src/**` en su totalidad (models, services, pages, components, theme, `app.routes.ts`) |
| **Primer movimiento** | **Fase B (desbloqueo, ~3-5 min):** scaffold con `ionic-app-setup` | **Espera** a que `HANDOFF.md` diga `SCAFFOLD: listo` |
| **En paralelo** | README parcial, `.gitignore`, `git init`, build de verificación (**solo lectura**) | Fases C (R1 + interfaz) y D (R2) completas |
| **Cierre** | `verificador-build` → tabla §11 → commit `fase-F` | build verde → tabla §11 → handoff → commits `fase-C` / `fase-D` |

**Marcador de arranque** (en la tabla *Último estado* de `HANDOFF.md`, lo escribe MiMo):

```
SCAFFOLD: listo | pendiente
```

**Reglas del modo paralelo:**
1. Nadie edita archivos de la zona del otro — si necesitas algo de la ajena, va escrito en `HANDOFF.md`.
2. Los builds que corra MiMo mientras DeepSeek programa son **solo lectura**: si sale rojo, **no arregles** el código de DeepSeek, anótalo en `HANDOFF.md`.
3. Si `SCAFFOLD: listo` no aparece en 5 minutos, DeepSeek se detiene y avisa (no crea el proyecto por su cuenta).
4. Commits por fase de cada uno; nadie hace `git add` de cambios ajenos en curso.

---

## 4. Reparto de trabajo por fase

### 4.1 Alcance de ESTE plan — R1 + R2 + estructura R7

| Fase | Tiempo | Agente | Subagente(s) | Skills | Tarea | Requisito / meta |
|---|---|---|---|---|---|---|
| **A** | 0–15 min | 🟦 `mimo-infra` | `verificador-api` | `ionic-app-setup` | Probar endpoints, JSON y paginación de Kitsu | Endpoint probado y campos identificados |
| **B** | 15–40 min | 🟦 `mimo-infra` | `verificador-build` | **`ionic-app-setup`**, `pruebas-frontend-esfot` | `ionic start`, estructura `models/services/pages/components`, rutas, `app.config.ts`, stubs | **Estructura R7** creada y app arrancando |
| **C** | 40–70 min | 🟩 `deepseek-codigo` | `verificador-build` + `revisor-rubrica` | **`ui-ionic-design`**, `pruebas-frontend-esfot`, `refactor-seguro` | Modelo + `AnimeService` + `anime-card` + **interfaz del listado** | **R1**: 1.ª página con datos reales y tarjetas no genéricas |
| **D** | 70–100 min | 🟩 `deepseek-codigo` | `verificador-build` + `revisor-rubrica` | **`ui-ionic-design`**, `pruebas-frontend-esfot`, `deteccion-codigo-muerto` | `ion-infinite-scroll`, estado de paginación + **estados skeleton/error** | **R2**: ≥2 páginas sin duplicados y con fin real |
| **F** | 100–120 min | 🟦 `mimo-infra` | `verificador-build` | `pruebas-frontend-esfot` | Build final, commit, README parcial, captura/video | Evidencia de la clase (§10) |

> El tiempo que el PDF dedica a búsqueda (95–110 min) **se libera al dejar R3 fuera**: se reinvierte en robustecer R2 (deduplicación, fin de datos, error en la 3.ª página) y en la interfaz.

**Interfaz (UI): quién la hace** → **🟩 DeepSeek, dentro de las fases C y D**, con la skill `ui-ionic-design`. MiMo solo interviene si la UI necesita un cambio de configuración (tema en `variables.scss` vive en `src/`, así que también es zona de DeepSeek).

**Prioridad de las 2 horas:** `R1 + R2 + estructura R7`. No se exige terminar los demás requisitos en la sesión.

### 4.2 Etapa posterior — NO forma parte de este plan (queda asignada)

| Qué | Requisito | Agente | Detalle |
|---|---|---|---|
| Búsqueda con reinicio | R3 | 🟩 `deepseek-codigo` | `ion-searchbar` + reset de lista/paginación/ids |
| Detalle + estados + favoritos | R4, R5, R6 | 🟩 `deepseek-codigo` | `:id`, loading/vacío/error con reintento, Preferences |
| **APK por terminal** | Evidencia | 🟦 `mimo-infra` | Skill `ionic-app-setup` §5: `npm run build` → `npx cap sync android` → `cd android` → `.\gradlew.bat assembleDebug` → `android\app\build\outputs\apk\debug\app-debug.apk`. **Siempre por terminal**, no desde Android Studio. ✅ **Generado 22/10 20:36 (4.16 MB) sobre el estado R1+R2+R7** — se regenera tras R3–R6. |
| Auditoría y limpieza final | — | 🟦 `mimo-infra` + `auditor-muerto` | Skills `deteccion-codigo-muerto` + `refactor-seguro` |
| README final + GitHub | — | 🟦 `mimo-infra` | §10 Entregables |

---

## 5. Estructura del proyecto

```
API-Explorer/
├── .opencode/
│   ├── agents/
│   │   ├── mimo-infra.md          ← primario 🟦 MiMo (fases A, B, F + APK)
│   │   ├── deepseek-codigo.md     ← primario 🟩 DeepSeek (fases C, D — incluye la interfaz)
│   │   ├── verificador-api.md     ← subagente (endpoints, solo lectura)
│   │   ├── verificador-build.md   ← subagente (build/lint, no edita)
│   │   ├── revisor-rubrica.md     ← subagente (revisión R1-R7, solo lectura)
│   │   └── auditor-muerto.md      ← subagente (dead code, no borra)
│   └── skills/
│       ├── ionic-app-setup/SKILL.md    ← creación de la app + APK por terminal (MiMo)
│       └── ui-ionic-design/SKILL.md    ← interfaz no genérica (DeepSeek)
├── src/app/
│   ├── app.config.ts           ← provideRouter, provideHttpClient(withFetch), animations
│   ├── app.routes.ts           ← '', 'anime/:id', 'favoritos', '**'
│   ├── app.component.ts        ← ion-app + menú
│   ├── models/anime.model.ts   ← interfaces Anime y PageResult (R7)
│   ├── services/
│   │   ├── anime.service.ts    ← HTTP + paginación + búsqueda + normalización (R7)
│   │   └── favorites.service.ts← Capacitor Preferences (R6, etapa posterior)
│   ├── components/anime-card/  ← tarjeta reutilizable (≥2 atributos)
│   └── pages/
│       ├── home/               ← listado + infinite scroll (R1, R2) — aquí se aplica ui-ionic-design
│       ├── detail/             ← detalle por :id (R4, etapa posterior)
│       └── favorites/          ← favoritos locales (R6, etapa posterior)
├── src/theme/variables.scss    ← paleta e identidad (ui-ionic-design §1)
├── opencode.jsonc              ← skills importadas + instructions (PLAN/HANDOFF) + subagent_depth
├── PLAN.md                     ← este plan (se carga en cada sesión)
├── HANDOFF.md                  ← pass the baton entre modelos (se carga en cada sesión)
├── capacitor.config.ts
├── ionic.config.json
├── package.json
└── README.md                   ← API, endpoints, paginación, instalación, capturas, dificultades
```

---

## 6. Esqueleto de código

### 6.1 Modelo (`models/anime.model.ts`)

```ts
export interface Anime {
  id: string;
  titulo: string;
  portada: string;
  anio: string;
  rating: number | null;
  episodios: number | null;
  tipo: string;          // TV, Película, OVA...
}

export interface PageResult {
  items: Anime[];
  offset: number;
  total: number;
  hasMore: boolean;
}
```

### 6.2 Servicio (`services/anime.service.ts`)

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Anime, PageResult } from '../models/anime.model';

@Injectable({ providedIn: 'root' })
export class AnimeService {
  private readonly BASE = 'https://kitsu.io/api/edge/anime';
  private readonly SIZE = 20;

  constructor(private http: HttpClient) {}

  getAnime(query: string, offset: number): Observable<PageResult> {
    let params = new HttpParams()
      .set('page[limit]', this.SIZE)
      .set('page[offset]', offset)
      .set('fields[anime]', 'canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype');
    if (query) params = params.set('filter[text]', query);

    return this.http.get<any>(this.BASE, { params }).pipe(
      map((r) => ({
        items: (r.data ?? []).map((d: any) => this.toAnime(d)),
        offset,
        total: r.meta?.count ?? 0,
        hasMore: offset + this.SIZE < (r.meta?.count ?? 0),   // fin real
      })),
      catchError((err) => throwError(() => ({ tipo: 'red', detalle: err })))
    );
  }

  getAnimeById(id: string): Observable<Anime> {
    return this.http.get<any>(`${this.BASE}/${id}`).pipe(map((r) => this.toAnime(r.data)));
  }

  private toAnime(d: any): Anime {
    const a = d.attributes ?? {};
    return {
      id: d.id,
      titulo: a.canonicalTitle ?? 'Sin título',
      portada: a.posterImage?.medium ?? a.posterImage?.small ?? '',
      anio: a.startDate ? a.startDate.slice(0, 4) : '—',
      rating: a.averageRating ? Number(a.averageRating) : null,
      episodios: a.episodeCount ?? null,
      tipo: a.subtype ?? '—',
    };
  }
}
```

### 6.3 Estado del listado (`pages/home/home.page.ts`) — núcleo de R2 (25 pts)

```ts
items: Anime[] = [];
private ids = new Set<string>();
page = 0; hasMore = true; cargando = false; error = false; query = '';
@ViewChild(IonInfiniteScroll) infinite?: IonInfiniteScroll;

async cargar(): Promise<void> {
  if (this.cargando || !this.hasMore) return;          // 1. sin peticiones simultáneas
  this.cargando = true; this.error = false;
  try {
    const res = await firstValueFrom(this.svc.getAnime(this.query, this.page * 20));
    for (const a of res.items) {                        // 2. concat + deduplicación
      if (!this.ids.has(a.id)) { this.ids.add(a.id); this.items.push(a); }
    }
    this.page++;
    this.hasMore = res.hasMore;
  } catch {
    this.error = true;                                  // 3. error sin bloquear la UI
  } finally {
    this.cargando = false;
    this.infinite?.complete();                          // 4. siempre, incluso con error
    if (this.infinite) this.infinite.disabled = !this.hasMore;  // 5. deshabilitar al agotar
  }
}

async buscar(ev: any): Promise<void> {                  // R3: reinicio total
  this.query = (ev.target.value ?? '').trim();
  this.items = []; this.ids.clear(); this.page = 0; this.hasMore = true;
  await this.cargar();
}
```

### 6.4 Plantilla (`pages/home/home.html`)

```html
<ion-searchbar debounce="400" placeholder="Buscar anime..." (ionInput)="buscar($event)">
</ion-searchbar>

<ng-container [ngSwitch]="estadoActual">
  <ion-skeleton-text *ngSwitchCase="'cargando'" animated></ion-skeleton-text>
  <div   *ngSwitchCase="'vacio'">Sin resultados para "{{ query }}"</div>
  <div   *ngSwitchCase="'error'">
    Error de conexión <ion-button size="small" (click)="cargar()">Reintentar</ion-button>
  </div>

  <ion-card *ngSwitchDefault *ngFor="let a of items" [routerLink]="['/anime', a.id]">
    <img [src]="a.portada" alt="portada" />
    <ion-card-header>
      <ion-card-title>{{ a.titulo }}</ion-card-title>
      <ion-card-subtle>{{ a.anio }} · {{ a.tipo }} · ⭐ {{ a.rating }}</ion-card-subtle>
    </ion-card-header>
  </ion-card>
</ng-container>

<ion-infinite-scroll threshold="120px" [disabled]="!hasMore" (ionInfinite)="cargar()">
  <ion-infinite-scroll-content></ion-infinite-scroll-content>
</ion-infinite-scroll>
```

### 6.5 Rutas (`app.routes.ts`)

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'anime/:id', loadComponent: () => import('./pages/detail/detail.page').then(m => m.DetailPage) },
  { path: 'favoritos', loadComponent: () => import('./pages/favorites/favorites.page').then(m => m.FavoritesPage) },
  { path: '**', redirectTo: '' },
];
```

### 6.6 Favoritos (`services/favorites.service.ts`, R6)

```ts
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly KEY = 'favoritos';
  private _ids = signal<string[]>([]);
  ids = this._ids.asReadonly();

  async init() {
    const { value } = await Preferences.get({ key: this.KEY });
    this._ids.set(value ? JSON.parse(value) : []);
  }

  async toggle(a: Anime) {
    const actuales = this._ids();
    const nuevo = actuales.includes(a.id)
      ? actuales.filter((x) => x !== a.id)
      : [...actuales, a.id];
    this._ids.set(nuevo);
    await Preferences.set({ key: this.KEY, value: JSON.stringify(nuevo) });
  }
}
```

---

## 7. Checklist de la rúbrica (100 pts)

- [ ] **20** — Consumo real de API + modelos/servicio separados (R1, R7)
- [ ] **25** — Infinite scrolling robusto: `ion-infinite-scroll`, sin duplicados, `complete()` siempre, deshabilitado al agotar (R2)
- [ ] **15** — Búsqueda con reinicio de resultados y paginación (R3)
- [ ] **10** — Navegación y pantalla de detalle con `:id` + regreso (R4)
- [ ] **10** — Favoritos con Capacitor Preferences (R6)
- [ ] **10** — Loading, lista vacía, error de red y reintento sin bloquear (R5)
- [ ] **10** — GitHub + README (API, endpoints, paginación, instalación, capturas, dificultades)

**Extensión opcional:** pull-to-refresh (`ion-refresher`), caché local, filtros combinados.

---

## 8. Advertencias técnicas

1. **`complete()` obligatorio en `finally`** — si falla la 3.ª página y no lo llamas, el scroll queda congelado.
2. **No concatenar en el reset ni reemplazar al paginar** — los dos errores más comunes.
3. **`debounce` ≥ 400 ms** en el searchbar (Kitsu: límite de 3 req/s, compartido con MyAnimeList).
4. **Descartar respuestas viejas** al cambiar la búsqueda: token de búsqueda o `switchMap`.
5. **"Sin resultados" ≠ "error de conexión"**: 200 con `data: []` es vacío; el `catch` es error.
6. **Local vs remoto:** solo los ids de favoritos se guardan en Preferences; el catálogo viene de la API.
7. **No simular infinite scroll** repitiendo la misma petición: el fin se calcula con `meta.count`.

---

## 9. Preguntas de autoevaluación (para la prueba)

1. ¿Por qué consumir la API desde un servicio en vez de directamente desde cada página?
2. ¿Qué cambia entre reemplazar un arreglo y concatenar nuevos resultados?
3. ¿Cómo evitar duplicados y solicitudes simultáneas al llegar al final?
4. ¿Qué se debe reiniciar cuando cambia el texto de búsqueda?
5. ¿Qué ocurre si falla la tercera página? ¿Cómo recuperar la interfaz?
6. ¿Cómo diferenciar "sin resultados" de "error de conexión"?
7. ¿Qué información se almacena localmente y qué se obtiene de la API?

**Debe poder reproducir sin copiar:** crear proyecto/páginas/servicios, `HttpClient`, interfaces, async/await u Observables, rutas, binding, eventos, condicionales, listas, estados de carga y el ciclo del infinite scrolling.

---

## 10. Entregables

**Al terminar la clase:** URL del repositorio, commit del avance, captura o video corto del listado (+ infinite scroll si se alcanza).

**Antes de la prueba:** repositorio actualizado · README completo · APK de Android o evidencia en dispositivo/emulador · demostración individual explicando servicio, búsqueda, paginación y manejo de errores.

---

## 11. Progreso por fase

**Alcance de este plan (R1 + R2 + estructura R7):**

| Fase | Agente | Subagente | Skills | Estado |
|---|---|---|---|---|
| A — Verificar API | 🟦 `mimo-infra` | `verificador-api` | `ionic-app-setup` | ✅ Kitsu probada (200 OK, paginación confirmada) |
| B — Estructura R7 + deps | 🟦 `mimo-infra` | `verificador-build` | `ionic-app-setup`, `pruebas-frontend-esfot` | ✅ **Cerrada 22/10 20:14** — scaffold, `provideHttpClient`, rutas, `@capacitor/preferences`, README parcial, `BUILD: verde`, commit `1269883` |
| C — R1 listado + **interfaz** | 🟩 `deepseek-codigo` | `verificador-build` + `revisor-rubrica` | **`ui-ionic-design`**, `pruebas-frontend-esfot` | ✅ **Cerrada 22/10 20:20** — Kitsu real (`page[limit]`/`page[offset]`/`fields[anime]`), `Anime`/`PageResult`, `AnimeService`, `anime-card` (portada 2:3 + monograma), paleta medianoche/coral, `BUILD: verde` · **R1 20/20** |
| D — R2 infinite scroll + estados | 🟩 `deepseek-codigo` | `verificador-build` + `revisor-rubrica` | **`ui-ionic-design`**, `pruebas-frontend-esfot` | ✅ **Cerrada 22/10 20:20** — `ion-infinite-scroll`, `Set` anti-duplicados, guard, `complete()` en `finally`, `[disabled]` al agotar, error inline + reintento mismo offset, skeleton/vacío/error, **9/9 tests** · **R2 24/25** |
| **P — Pulido R1+R2+R7** | 🟩 `deepseek-codigo` | `verificador-build` + `revisor-rubrica` | `pruebas-frontend-esfot`, `refactor-seguro` | ✅ **Cerrada 22/10** — 5 puntos del revisor + 5 hallazgos más de las pasadas 2.ª/3.ª: offset por lo recibido, pausa del scroll tras fallo (sin bucle), copy del error, `FalloApi` tipado (red/429/5xx/4xx), URL desde `environment`, freno si la API repite página, dedupe intra-página · **18/18 tests** · `BUILD: verde` 0 warnings · **75/75** · `REGISTRO-DEEPSEEK.md` |
| F — Commit + README parcial + demo | 🟦 `mimo-infra` | `verificador-build` | `pruebas-frontend-esfot` | ✅ **Cerrada 22/10 20:32** — build/tsc/lint/test verdes · budget SCSS 3 kB/6 kB · `revisor-rubrica` **74/75** (antes del pulido) · `ionic.config.json` identidad + README evidencias · commits `b7116f2` + `26d550a` + `fase-F` |

**Plan de cierre §13 (activo desde 25/10):**

| Fase | Requisito | Agente | Estado |
|---|---|---|---|
| **E — Búsqueda con reinicio** | **R3** | 🟩 `deepseek-codigo` | ✅ **Cerrada 25/10** — `ion-searchbar [debounce]="400"` + `query` en estado + `reiniciar()` limpia items/ids/offset/hasMore/fallo/total + **token de generación** que descarta respuestas y fallos viejos + `enVuelo` esperado antes de vaciar (no deja mudo el infinite scroll) + vacío ≠ error + `PanelEstadoComponent` compartido (home/detalle) + `close-circle` registrado · **25/25 tests** (7 nuevos de R3) · `BUILD: verde` 0 errores / 0 warnings · commit `fase-E-R3` |
| G1 — Detalle + estados | R4, R5 | 🟩 `deepseek-codigo` | ✅ **Cerrada 25/10** — ruta lazy `anime/:id` (input binding) + `getAnimeById()` con `synopsis` reutilizando `toAnime` + `pages/detail/` (hero con backdrop, monograma de reserva, ficha, sinopsis) + `ion-back-button` + estados cargando/`noEncontrado`(404)/error con Reintentar + token de generación al cambiar de id + tarjeta del catálogo enlazada · **36/36 tests** · `BUILD: verde` 0 warnings · commit `fase-G-R4R5` |
| G2 — Favoritos | R6 | 🟩 `deepseek-codigo` | ⏳ tras G1 |
| **H — Verificación + APK + auditoría + README + push** | Evidencia | 🟦 `mimo-infra` | ⏳ **en espera de la señal `FASE-G: commiteado`** · **parcial ✅ 25/10** (`29b2195`): `AUDITORIA-DEPS.md` (478 paquetes, licencias, `npm audit` = 5 vulns de build-time, plan de remediación) · status bar Android corregida (`values/colors.xml` + `statusBarColor` en `styles.xml`) · README con huecos de R4/R5/R6 y tabla de capturas · **falta al llegar la señal:** verificador-build + revisor-rubrica + APK por terminal + ejecutar la remediación de deps + cifras finales del README + push final |

---

## 12. Cómo arrancar (ejecución)

1. **Abre una sesión nueva en esta carpeta** para que carguen `opencode.jsonc`, los agentes y las skills.
   - Agentes esperados → `mimo-infra`, `deepseek-codigo`, `verificador-api`, `verificador-build`, `revisor-rubrica`, `auditor-muerto`.
   - Skills esperadas → de SKILLS_INSTALADAS: `pruebas-frontend-esfot`, `refactor-seguro`, `deteccion-codigo-muerto`, `pruebas-backend-esfot`; **creadas para este proyecto: `ionic-app-setup`, `ui-ionic-design`**.
   - **✅ Ya verificado por API:** los 6 agentes (2 primarios con su modelo fijado + 4 subagentes con sus permisos) y las 6 skills del proyecto están registrados.
   - **Importante:** la lista de subagentes se congela al abrir la sesión → los subagentes nuevos se usan desde una sesión abierta **después** de crear los archivos.
2. **Sesión 1 (Azul)** — agente `mimo-infra` con skill `ionic-app-setup`: *"Ejecuta las fases A y B del PLAN.md"*.
3. Cierre de fase: `verificador-build` → tabla §11 → `HANDOFF.md` → commit.
4. **Sesión 2 (Verde)** — agente `deepseek-codigo` con skill `ui-ionic-design`: *"Fase C (listado + interfaz) y luego D (infinite scroll)"*. La interfaz es suya: debe pasar el checklist "¿quedó genérico?" de `ui-ionic-design`.
5. Cierre de la clase (fase F): `verificador-build` + `revisor-rubrica` → commit, README parcial y captura/video.
6. **Etapa posterior (§4.2)** — R3–R6 con DeepSeek y, **con MiMo por terminal**, el APK: `npm run build` → `npx cap sync android` → `android\gradlew.bat assembleDebug`.
7. Al final: **repo en GitHub + README + APK**, y prepararse para explicar servicio, paginación y manejo de errores sin copiar.

---

## 13. Plan de cierre — R3 a R6 + entrega final (sesión 25/10/2026)

> Reemplaza a §4.2 como **plan activo**. Estado verificado el **25/10**: `git status` limpio · 8 commits · remote `origin` = `https://github.com/JimSul16/API-Explorer` · `npm run build` 0 errores/0 warnings · **`npm test` 18/18** · lint pass.
> Documentos de contexto obligatorios: **`REGISTRO-MIMO.md`** + **`REGISTRO-DEEPSEEK.md`** + bloques #1–#5 de `HANDOFF.md`.

### 13.1 Orden de ejecución (secuencial, no paralelo)

```
PASO 1 → 🟩 DeepSeek (deepseek-codigo):  E (R3 búsqueda)  →  G (R4 detalle + R5 estados + R6 favoritos)
PASO 2 → 🟦 MiMo   (mimo-infra):         H (verificación + rúbrica + APK + auditoría + README final + push)
```

Motivo del orden: el APK y el README final documentan código que **todavía cambia**; hacerlos antes obliga a repetirlos. Zonas intactas: 🟩 `src/**` · 🟦 raíz/configs/`android/`/`README.md`/`.git/`.

### 13.2 Turno 🟩 DeepSeek — fases E y G

| Fase | Req. | Pts | Tarea | Criterio de fin |
|---|---|---|---|---|
| **E** | **R3** búsqueda | 15 | `ion-searchbar debounce="400"` + query en estado + `reiniciar(query)` limpia `items`/`ids`/`offset`/`hasMore`/`fallo` + descartar respuestas viejas (token de generación o `switchMap`) + vacío ≠ error | Escribir "naruto" muestra resultados de Kitsu; borrar el texto vuelve al catálogo completo; paginar **después** de buscar no mezcla catálogo y resultados |
| **G1** | **R4** detalle | 10 | ruta `anime/:id` (lazy) + `getAnimeById()` en `AnimeService` + `pages/detail/` con `withComponentInputBinding()` + `ion-back-button` | La lista conserva scroll/posición al regresar; id inválido → "no encontrado" |
| **G1** | **R5** estados | 10 | loading / vacío / error con **Reintentar** en la pantalla de detalle (patrón de `home`) | Los 3 estados se ven y el reintento funciona |
| **G2** | **R6** favoritos | 10 | `FavoritesService` (`@capacitor/preferences`, ids en `signal`) + ★ en `anime-card` o detalle + página `favoritos` + ruta | Marcar → salir y volver → sigue marcado (persistencia real en el dispositivo) |

**Trampas ya documentadas (leer `REGISTRO-DEEPSEEK.md` §7 antes de escribir):**
1. `reiniciar()` con una carga de scroll en vuelo deja el `ion-infinite-scroll` mudo → esperar la respuesta o vaciar tras recibirla.
2. `getAnime(query, offset)` ya existe: **no** dupliques el servicio.
3. `getAnimeById` va en el servicio (misma `toAnime`), no en la página.
4. Favoritos: guardar **ids**, no objetos.
5. Iconos nuevos → `addIcons()` en `main.ts`; si no, no se ven.
6. Presupuesto de estilos: 3 kB warning / 6 kB error por componente (`home.page.scss` ya está en ~2.8 kB).
7. `[disabled]` incluye `error()` a propósito (anti-bucle): cualquier reintento limpia `fallo` antes de pedir.
8. Debounce ≥ 400 ms (Kitsu: 3 req/s) → mensaje `'limite'` ya existente para el 429.

**Cierre de cada fase (obligatorio):** `npm run build` + `tsc` (app y spec) + `npm run lint` + `npm test` en verde → bloque nuevo en `HANDOFF.md` → tabla §11 → **commit atómico** (`fase-E-R3`, `fase-G-R4R5`, `fase-G-R6`) → **push**. Nada de trabajo de MiMo en el `git add`.

**Tests nuevos mínimos esperados:** R3 (reset de lista/offset/ids al buscar, respuesta vieja descartada, vacío ≠ error en búsqueda, paginar tras buscar sin mezclar) · R4/R5 (detalle ok, 404, error de red con reintento) · R6 (toggle, persistencia simulando `Preferences`).

### 13.3 Turno 🟦 MiMo — fase H (cierre y entrega)

1. `verificador-build` → 4 comandos verdes + `revisor-rubrica` → puntuación final sobre R1–R7.
2. **APK por terminal** (skill `ionic-app-setup` §5): `npm run build` → `npx cap sync android` → `cd android` → `.\gradlew.bat assembleDebug` → verificar `app-debug.apk` (el actual es del estado anterior: regenerar **siempre**).
3. Auditoría: `auditor-muerto` + `codebase-cleanup-deps-audit` (5 vulnerabilidades del starter, 1 high).
4. `README.md` final: **hoy dice 9/9 tests y 74/75** → actualizar a los tests reales, marcar R3/R4/R5/R6 ✅, añadir capturas/video y la sección de dificultades de esta etapa.
5. Señales de fase en `HANDOFF.md` §Último estado + §11 + commit + **push final**.

### 13.4 Meta de rúbrica

Con R1 (20) + R2 (25) + R7 (20) + estados (10) ya asegurados → **75/75**. Sumando R3 (15) + R4 (10) + R5 (10) + R6 (10) + README/GitHub (10) = **100/100** posibles.
