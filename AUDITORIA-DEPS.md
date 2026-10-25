# 🔒 Auditoría de dependencias — API Explorer

> 🟦 **MiMo** · skill `codebase-cleanup-deps-audit` · **25/10/2026**.
> Diagnóstico inicial hecho **durante el turno de DeepSeek** (fases E/G) en modo solo lectura; la
> remediación de §4 se ejecutó **al cerrar la fase H**, con `src/**` congelado.
> **Resultado final: `npm audit` → 0 vulnerabilidades** (eran 5).

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

## 3. Vulnerabilidades — `npm audit` → **5 (1 high · 3 moderate · 1 low)** → ✅ **resueltas: hoy `0`**

> Estado inicial el 25/10/2026. La tabla queda como **histórico del diagnóstico**; el resultado final
> de la remediación está en §4.

| # | Paquete | Sev. | Advisory | ¿Dónde corre? | Exposición real |
|---|---|---|---|---|---|
| 1 | `vite` 8.3.0–8.3.2 | **high** | [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) ejecución cross-origin de script · [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) lectura fuera de `server.fs.allow` · [GHSA-vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg) primeros 4 bytes · 3 × `launch-editor` (RCE en Windows) | **solo desarrollo** (`ng serve` / `ng build`) | **Baja para el entregable**: el APK sirve `www/` compilado desde la WebView, no arranca el dev server. Alta si alguien corre `ng serve` expuesto en una red. |
| 2 | `uuid` < 11.1.1 | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) bounds check en v3/v5/v6 | build (`@capacitor/cli` → `xcode`) | **Nula**: solo se usa al generar el proyecto Xcode (iOS), y nunca con `buf` proporcionado |
| 3 | `xcode` 0.9.2–3.0.2 | moderate | depende de `uuid` vulnerable | build | Cadena de la anterior |
| 4 | `@capacitor/cli` | moderate | depende de `xcode` | build | Cadena de la anterior |
| 5 | `@angular/build` | low | depende de `vite` vulnerable | build | Cadena de la #1 |

**Ninguna vulnerabilidad afecta al código que corre en el dispositivo** (todas están en la cadena de
herramientas de desarrollo/compilación). Ninguna es *critical*.

## 4. Remediación — ✅ EJECUTADA el 25/10/2026 (fase H) → `npm audit`: **0**

⚠️ **`npm audit fix --force` NO se usó**: su "solución" es **degradar** `@angular/build` a 22.1.9 y
`@capacitor/cli` a 8.4.3 (rompe semver-major). Se aplicó en su lugar la vía segura:

| Paso | Acción | Efecto |
|---|---|---|
| 1 | `package.json` → `"overrides": { "vite": "^8.3.5" }` | `vite` 8.3.0 → **8.3.5** (`npm ls vite` → `overridden`) ⇒ fuera el **high** (6 advisories de vite/launch-editor) y el **low** |
| 2 | `package.json` → `"overrides": { "uuid": "^11.1.1" }` | rompe la cadena `uuid ← xcode ← @capacitor/cli` ⇒ fuera los **3 moderate** |
| 3 | `package.json` → `"license": "MIT"` | el único paquete "sin licencia" del inventario (el nuestro) queda definido |
| 4 | `npm install` | **`found 0 vulnerabilities`** |

**Verificación obligatoria ejecutada tras la remediación:**

```powershell
npm install                              # found 0 vulnerabilities
npm audit                                # found 0 vulnerabilities
npm run build                            # verde, 0 errores, 0 warnings
npx tsc -p tsconfig.app.json --noEmit    # 0
npx tsc -p tsconfig.spec.json --noEmit   # 0
npm run lint                             # All files pass linting
npm test -- --watch=false                # 7 archivos · 59/59
npx cap sync android                     # √ update android → Sync finished  (ejercita la cadena xcode/uuid)
```

**Por qué `uuid@11.1.1` es seguro aquí:** expone `exports['.'].node.require = ./dist/cjs/index.js`
(o sea sigue siendo *requireable* desde CJS, que es lo que hace `xcode`), y la única consumidora es la
CLI de Capacitor al generar el proyecto Xcode (iOS), que ni siquiera se usa en esta máquina. Se comprobó
con un `npx cap sync android` real, no solo con la teoría.

**Nota:** no se subió `@angular/build`/`@angular/cli` a 22.2.4 porque **no hace falta** para la
seguridad (el advisory venía por `vite`, ya resuelto con el override) y cualquier cambio de versión
añadía riesgo a la entrega sin ganancia.

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
- Efecto visible en el **APK regenerado el 25/10** (4,44 MB): status bar y barra de navegación en
  `#0d0f16`, coherentes con la interfaz.

---

<sub>API Explorer · auditoría de dependencias · 🟦 MiMo · 25/10/2026 · sin cambios en `node_modules` durante el turno de DeepSeek.</sub>
