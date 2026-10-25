# 🔒 Auditoría de dependencias — API Explorer

> 🟦 **MiMo** · skill `codebase-cleanup-deps-audit` · **25/10/2026** · solo lectura.
> Ejecutada **durante el turno de DeepSeek** (fases E/G): por eso **no se modificó `package.json`
> ni `node_modules`** — hacerlo habría podido romper sus builds a mitad de tarea.
> La remediación (§4) queda agendada para la **Fase H** (PLAN.md §13.3).

---

## 1. Inventario

| Métrica | Valor |
|---|---|
| Paquetes totales (directos + transitivos) | **478** |
| Dependencias directas (`dependencies`) | 16 — Angular 22.2.3 · Ionic 9 · Capacitor 8.5.3 · RxJS 7.8 · ionicons 8 · `@capacitor/preferences` 8.0.1 |
| Dependencias directas (`devDependencies`) | 14 — `@angular/build`/`cli` 22.2.3 · ESLint 10 · angular-eslint 22.6 · Vitest 5.0.5 · TypeScript 6.0.3 · jsdom 30 |
| Obsoletas (`npm outdated`) | 3 → `@angular/build` **22.2.3 → 22.2.4** (patch) · `@angular/cli` **22.2.3 → 22.2.4** (patch) · `typescript` 6.0.3 → 7.0.2 (**mayor: NO actualizar**) |

## 2. Licencias (478 paquetes)

| Licencia | Paquetes | Tipo |
|---|---:|---|
| MIT | 378 | permisiva |
| Apache-2.0 | 30 | permisiva |
| ISC | 29 | permisiva |
| BSD-2-Clause | 14 | permisiva |
| BlueOak-1.0.0 | 10 | permisiva |
| BSD-3-Clause | 6 | permisiva |
| MIT-0 | 2 | permisiva |
| **MPL-2.0** | **2** | copyleft **débil por archivo** (`lightningcss` + `lightningcss-win32-x64-msvc`) |
| Unlicense / 0BSD / CC0-1.0 | 4 | dominio público |
| CC-BY-4.0 | 1 | `caniuse-lite` (datos de navegadores) |
| (Apache-2.0 AND BSD-3-Clause) | 1 | permisiva |
| *(sin licencia)* | 1 | **nuestro propio `package.json`** ← falta `license` |

**Veredicto:** ✅ **sin GPL / AGPL / SSPL / Commons Clause** → el proyecto se puede publicar en GitHub
sin problema de licencia. Los dos MPL-2.0 son *weak copyleft* (solo obligan si modificas esos binarios;
aquí se usan como dependencias sin tocar su código).

**Acción menor:** añadir `"license": "MIT"` (o la que corresponda) a `package.json`.

## 3. Vulnerabilidades — `npm audit` → **5 (1 high · 3 moderate · 1 low)**

| # | Paquete | Sev. | Advisory | ¿Dónde corre? | Exposición real |
|---|---|---|---|---|---|
| 1 | `vite` 8.3.0–8.3.2 | **high** | [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) ejecución cross-origin de script · [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) lectura fuera de `server.fs.allow` · [GHSA-vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg) primeros 4 bytes · 3 × `launch-editor` (RCE en Windows) | **solo desarrollo** (`ng serve` / `ng build`) | **Baja para el entregable**: el APK sirve `www/` compilado desde la WebView, no arranca el dev server. Alta si alguien corre `ng serve` expuesto en una red. |
| 2 | `uuid` < 11.1.1 | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) bounds check en v3/v5/v6 | build (`@capacitor/cli` → `xcode`) | **Nula**: solo se usa al generar el proyecto Xcode (iOS), y nunca con `buf` proporcionado |
| 3 | `xcode` 0.9.2–3.0.2 | moderate | depende de `uuid` vulnerable | build | Cadena de la anterior |
| 4 | `@capacitor/cli` | moderate | depende de `xcode` | build | Cadena de la anterior |
| 5 | `@angular/build` | low | depende de `vite` vulnerable | build | Cadena de la #1 |

**Ninguna vulnerabilidad afecta al código que corre en el dispositivo** (todas están en la cadena de
herramientas de desarrollo/compilación). Ninguna es *critical*.

## 4. Plan de remediación (agendado para la Fase H — ejecutar con `src/**` congelado)

⚠️ **`npm audit fix --force` NO se debe usar**: su "solución" es **degradar** `@angular/build` a
22.1.9 y `@capacitor/cli` a 8.4.3 (rompe semver-major). Plan correcto, en orden:

```powershell
# 1) Parches seguros (no rompen nada)
npm i -D @angular/build@22.2.4 @angular/cli@22.2.4

# 2) vite: el advisory afecta 8.3.0-8.3.2; @angular/build@22.2.4 aún trae 8.3.0
#    → forzar versión sana con "overrides" en package.json:
#      "overrides": { "vite": "^8.3.5" }
#    (8.3.5 = última; 8.3.3+ ya está parcheada)

# 3) uuid: mismo mecanismo, sólo si se quiere 0 vulns
#      "overrides": { "uuid": "^11.1.1" }
#    xcode pide uuid@^7.0.3; es build-time y no se usa con `buf` → riesgo bajo,
#    pero como es un salto de mayor, verificar con `npx cap --version` y un `npx cap sync android`.

# 4) Verificación obligatoria tras cada paso
npm run build; npx tsc -p tsconfig.app.json --noEmit; npm run lint; npm test -- --watch=false
npx cap sync android   # y, si todo verde, el APK de la Fase H
```

**Alternativa conservadora (la recomendada para la entrega):** aplicar solo el **paso 1 + 2**
(resuelve el *high* y el *low*) y **documentar** los 3 moderados de `uuid`/`xcode` como riesgo de
build-time no explotable en este proyecto. Es lo que se propone en la sección "Dificultades" del README.

**Otras acciones:**
- Añadir `"license": "MIT"` a `package.json`.
- **No** subir a TypeScript 7 (mayor, incompatible con `angular-eslint`/`typescript-eslint` actuales).
- Plugins Capacitor instalados y **sin uso en `src/`**: `@capacitor/app`, `@capacitor/haptics`,
  `@capacitor/keyboard`, `@capacitor/status-bar` (herencia del starter).
  → `@capacitor/preferences` también está en 0 usos **a día de hoy**, pero es el que usará R6.
  Limpieza a valorar en la fase H **después** de R6 (haptics puede acabar usándose en el toggle ★;
  status-bar quedó resuelto por XML, ver abajo).

## 5. Hallazgo cruzado: status bar de Android (zona 🟦, corregido en esta pasada)

No es una vulnerabilidad, salió del mismo diagnóstico:

- `android/.../values/styles.xml` referenciaba `@color/colorPrimaryDark` **sin que la app definiera
  colores**: los heredaba de `@capacitor/android` → **`#303F9F` (azul índigo Material)**.
- La app es medianoche `#0d0f16` → la status bar salía **azul sobre interfaz oscura** (era el
  "aviso histórico" anotado en `REGISTRO-MIMO.md §10`).
- **Fix aplicado:** nuevo `values/colors.xml` con la paleta de la app + `android:statusBarColor`,
  `android:navigationBarColor` y `windowLightStatusBar/Light = false` en `AppTheme.NoActionBar`.
- Efecto visible **recién tras** regenerar el APK en la Fase H.

---

<sub>API Explorer · auditoría de dependencias · 🟦 MiMo · 25/10/2026 · sin cambios en `node_modules` durante el turno de DeepSeek.</sub>
