# TDAH Helper App

App web (HTML/CSS/JS vanilla, sin build step) para ayudar a adultos con TDAH a organizarse: Pomodoro, checklist, journal, hábitos, integración con Google Calendar y Trello. Backend: Firebase (Auth + Firestore), proyecto `tdah-app-efca9`. Deploy: Firebase Hosting, sirviendo desde `public/`.

Backlog de historias de usuario en Trello: https://trello.com/b/v9GQJQUl (board "TDAH - tareas").

## Estado al 2026-07-29

Mejoras técnicas ya resueltas:
- Se eliminó el `index.html` duplicado de la raíz (la app real vive en `public/`).
- Se endureció el uso de `innerHTML` con contenido de usuario (journal, checklist, hábitos) usando `textContent` para evitar XSS.
- Login con email/contraseña implementado vía Firebase Auth (antes solo estaba el placeholder).

Del backlog de Trello, ya implementado y probado en el navegador:
- Favicon (`public/favicon.svg`).
- Título dinámico de la pestaña según la sección activa (`SECTION_TITLES` en `main.js`).
- Mini-calendario en el Journal que marca los días con entradas guardadas.
- "Estilo del Checkbox MIT (Refactorización)" ya estaba resuelto de antes (sin estilos inline) — falta marcarla Done en Trello.

Pendiente en el backlog (lista "To Do" del board):
- **BAJA: hecho** — Mensajes/sugerencias en secciones vacías, contraste de colores (WCAG AA), control global de sonido. Ver sección "Sesión 2026-07-30" más abajo.
- **MEDIA**: bloque de Journal (buscar por palabra clave, registrar ánimo/energía, etiquetar y filtrar), unificar estilos, temas de color, config. de sonidos/volumen, guías de respiración en Pomodoro, sistema de puntos.
- **MEDIA — Checklist: hecho** (subtareas, etiquetas de color, recordatorios por hora) — ver detalle en la sección de sesión Mac más abajo.
- La tarjeta "traea 2" en la lista "Doing" **no es un descarte**: el usuario la usa a propósito como tarjeta de prueba manual (le cambia la fecha de vencimiento para verificar que la app la muestre correctamente como "por vencer"). No tocar/archivar.

Refactor de `public/js/main.js` en módulos por feature: **hecho** (ver sección de abajo).

## Sesión Mac (2026-07-29, continuación de la sesión de arriba)

Housekeeping de git (sin cambios en el código de la app):
- El repo tenía dos ramas totalmente divergentes: `main` era un fósil huérfano creado el 16/5/2025 subiendo 3 archivos sueltos por la interfaz web de GitHub ("Add files via upload"), desconectado del historial real, y resultó ser el sitio publicado en GitHub Pages (`gabriel-am-montenegro.github.io/TDAH`) con una versión vieja de la app (sin Firebase, sin la mayoría de las features). `master` es la historia continua real del proyecto (150+ commits) con la app completa que se despliega en Firebase Hosting (`tdah-app-efca9.web.app`).
- Con confirmación del usuario: se apagó GitHub Pages, se cambió la rama default del repo de `main` a `master`, y se borró la rama `main` (local y remota). Ahora el repo tiene una sola rama, `master`, que es la única fuente de verdad.
- Si en algún momento aparece código o instrucciones referenciando `main` como si fuera la rama activa, es información vieja — ya no existe.

Refactor de `public/js/main.js`: **completado y verificado en el navegador** (login anónimo de prueba, recorriendo las 10 secciones). `main.js` pasó de 1585 a 114 líneas.

**Estructura final** (el HTML carga `<script src="js/main.js" type="module">`, ES modules nativos sin bundler):
```
public/js/
  firebase.js          # firebaseConfig, initializeApp → exporta { app, db, auth, appId, initialAuthToken, publicDataDocId }
  ui.js                # showTempMessage, showCustomConfirm, triggerConfetti, mostrarSeccion, SECTION_TITLES (se mantienen también en window.*)
  listeners.js         # registerListener(unsub), cleanupListeners()
  notifications.js     # requestNotificationPermission(), isNotificationPermissionGranted() — estado del permiso de Notification
  auth.js              # onAuthStateChanged (initAuthStateListener recibe loadAllUserData como callback) + wireAuthButtons() (login Google/anónimo/email y logout)
  features/
    calendar.js        # estado de conexión, loadCalendarEvents, wireCalendarButtons()
    welcome-tour.js     # initWelcomeTour(db, userId)
    journal.js          # initJournal(db, userId)
    pomodoro.js         # initPomodoro(db, userId)
    checklist.js        # initChecklist(db, userId)
    habits.js           # initHabits(db, userId)
    trello.js           # initTrello(db, userId)
    content-feed.js      # factory createContentLoader() + initBlog(db) + initNutricion(db)
  main.js               # entry point: loadAllUserData() orquesta los initX(), Clear Data, Status Counters; DOMContentLoaded wire nav-tabs + notificaciones + wireCalendarButtons()
```
Cada `initX(db, userId)` construye sus propios refs de Firestore y llama a `registerListener()` para sus `onSnapshot`.

**Limpieza hecha durante la migración** (todo confirmado con el usuario antes de aplicar):
- Se eliminaron `#today-mits`, `#today-calendar-events-list`, `#go-to-calendar-from-hoy`: no existían en `index.html`, código muerto.
- Se consolidó el wiring duplicado de los botones "Hoy" del Pomodoro en un solo lugar (`pomodoro.js`).
- `publicDataDocId` (en `firebase.js`, con comentario) **no se tocó**: sigue difiriendo en un dígito de `appId` a propósito, porque cambiarlo movería la ruta de Firestore donde ya vive la data real de producción.

**Bug preexistente encontrado y arreglado durante la verificación** (no lo introdujo el refactor, confirmado contra el commit anterior a esta sesión): la bandera `isLoggingOut` (ahora vive en `auth.js`) solo se reseteaba a `false` en la rama de login (`onAuthStateChanged` con `user` truthy), nunca en la rama de logout. Efecto: cerrar sesión y volver a loguearse sin recargar la página hacía que el primer login no ejecutara `loadAllUserData` (había que loguearse dos veces, o recargar). Se agregó `isLoggingOut = false;` también al final de la rama `else` en `auth.js` y se verificó en el navegador (logout → login anónimo sin recargar, carga los datos al primer intento).

**Checklist: subtareas, etiquetas de color y recordatorios por hora — hecho** (los 3 items MEDIA del backlog para Checklist). Todo vive en `public/js/features/checklist.js` + CSS nuevo en `public/css/styles1.css`, sin tocar `index.html` ni `firestore.rules`:
- Nuevos campos opcionales en el doc de cada ítem: `subtasks: Array<{id, text, completed}>`, `tagColor: 'red'|'orange'|'green'|'blue'|'purple'|null`, `reminderTime: "HH:MM"|null`.
- La fila principal del ítem no cambió (checkbox, texto, MIT, editar, borrar) — se agregó un botón "🔽 Detalles" que abre/cierra un panel por ítem (estado `expandedItemIds` en memoria, se preserva entre re-renders del `onSnapshot` igual que ya se preservaba el foco de edición).
- Etiqueta de color: paleta fija de 5 colores + "sin color" (sin selector RGB libre), se ve como un punto de color en la fila principal.
- Subtareas: agregar/tildar/borrar, mismo patrón que `habits.js` usa para `dailyCompletions` (`getDoc` → mutar array → `updateDoc`).
- Recordatorio: `<input type="time">` por ítem + `setInterval` cada 30s que compara la hora actual contra los recordatorios activos y dispara `showTempMessage` + `Notification` (si el permiso está concedido) una vez por día por ítem. **Limitación**: solo dispara mientras la pestaña esté abierta (no hay service worker/backend), igual que las notificaciones del Pomodoro.
- Verificado en el navegador con cuenta anónima de prueba: panel persiste tras re-render, las 5 etiquetas + "sin color", agregar/tildar/borrar subtarea, disparo del recordatorio, y que MIT/edición inline/borrado/drag-reorder existentes siguen funcionando igual.

## Sesión 2026-07-30 (Windows, tras el pull de la sesión Mac)

Cross-platform y tooling de desarrollo:
- `.claude/launch.json`: el server local pasó de `python`/`python3` (distinto nombre según SO) a `npx serve` (mismo comando en Windows y Mac). Se agregó una segunda config `firebase-emulators`.
- Emulador de Firebase configurado y probado (auth+firestore+ui). Requiere Java — instalado en Windows vía winget (Temurin 21); instalar también en Mac si hace falta.

Backlog — **BAJA completo**:
- **Mensajes en secciones vacías**: `renderEmptyState()` en `ui.js`, usado en checklist/journal/hábitos/trello/blog/nutrición (mensaje + botón de acción que enfoca el input o navega a Configuración). De paso se arregló un bug preexistente en `trello.js`: para un usuario sin `trelloConfig`, la lista quedaba trabada en "Cargando..." para siempre porque `cargarTareasTrello()` nunca se ejecutaba si el doc no existía.
- **Contraste de colores (WCAG AA)**: auditados los pares texto/fondo con la fórmula de luminancia relativa de WCAG. Se oscurecieron `--success-dark`, `--error-dark`, `--warning-dark`, `--info-dark` (mensajes de estado/badges, antes ~2-2.4:1, ahora 5.2-6.8:1), se igualó `--text-light` a `--text-medium` (antes 2.54:1), y se cambió el fondo de `.button-danger` de `#ef4444` a `#dc2626` (el texto blanco no llegaba a 4.5:1). Verificado con script Node que calcula el ratio real, no a ojo.
- **Control global de sonido**: nuevo `public/js/sound.js` (`playSound()`, toggle persistido en localStorage), reemplaza los `.play()` directos en `pomodoro.js` y `checklist.js`. Toggle en Configuración.

**Token de Calendar**: se implementó el refresco silencioso (ver nota más abajo) y se encontró+arregló un bug real de condición de carrera (GIS carga async y el código se rendía antes de que estuviera listo, borrando el token guardado). Confirmado por el usuario en su cuenta real: reconectó una vez después del fix y quedó andando. Falta confirmar que se sostenga sin reconectar durante horas de uso real (si vuelve a fallar solo, ahí sí sería la limitación de fondo — cookies de terceros — y toca evaluar el backend).

Se sacó el UID de Firebase que se mostraba junto al nombre del usuario en el header (`#user-id-display` en `index.html`, y su lógica en `auth.js`) — no aportaba nada al usuario y no correspondía mostrarlo.

**Bloque Journal del backlog MEDIA: completo** (`public/js/features/journal.js`):
- Búsqueda por palabra clave (`#journal-search-input`), filtrado client-side sobre las entradas ya cargadas por el `onSnapshot` (sin query nueva a Firestore).
- Ánimo/energía: 5 opciones fijas con emoji (`MOOD_OPTIONS`), campo `mood` opcional en el doc, se muestra el emoji junto a la fecha de la entrada.
- Etiquetas: campo de texto libre separado por comas (`#journal-tags-input`), normalizadas a minúsculas y sin duplicados (`parseTags`), campo `tags: string[]` en el doc. Se muestran como chips en cada entrada y como filtro clickeable arriba de la lista (`#journal-tag-filters`); búsqueda y filtro por etiqueta se combinan con AND.
- **Decidido con el usuario**: la parte de la historia de Trello que pedía etiquetar los artículos de "Notas Blog" se descarta — son contenido compartido de solo lectura (`firestore.rules`: `write: false`), no tiene sentido taguearlos por usuario. No tocar `content-feed.js` para esto.

**Unificar estilos (MEDIA): hecho.** Auditoría real de `styles1.css` (no solo a ojo), tres hallazgos concretos:
- La regla base de inputs solo cubría `type="text"` — cada input de otro tipo (search, email, password, number) reinventaba el mismo estilo con pequeñas diferencias sin razón. Se amplió el selector compartido; `.email-auth-form input` (que sí necesita verse distinto, vive sobre el header traslúcido sin tarjeta blanca) se reubicó DESPUÉS de la regla compartida en el archivo — con la misma especificidad, el override necesita ganar por orden de aparición, si no la regla general lo pisa (esto pasó y hubo que arreglarlo).
- `.button-danger` tenía un rojo hardcodeado que quedó desalineado de `--error-dark` después del fix de contraste de la sesión anterior — ahora usa la variable.
- Varios `border-radius: 5px` sueltos se consolidaron a `--border-radius-sm`.
- **No se tocaron** `body { border: 5px solid rgb(35,129,23) }` ni `#css-check` — son intencionales, dejarlos así.

**Temas de color (MEDIA): hecho.** Claro/Oscuro/Suave, selector en Configuración (`public/js/features/theme.js`), persistido en `settings/appSettings` (Firestore) + `localStorage` (aplicado por un script inline en el `<head>` de `index.html` antes del primer paint, para evitar parpadeo). Todo vía `document.documentElement.dataset.theme` + overrides `:root[data-theme="dark"]` / `[data-theme="soft"]` en `styles1.css`.

Para que el tema oscuro funcionara de verdad (no solo cambiar 2 variables) hubo que separar variables que antes estaban mezcladas:
- `--white` (color de texto sobre botones/header, no cambia por tema) vs `--surface-bg`/`--card-bg` (fondos de tarjetas, sí cambian).
- `--primary-color`/`--secondary-color` (fondo de botón + texto blanco, no cambian por tema porque ya pasan AA en cualquier tema) vs `--accent-text`/`--accent-text-secondary` (mismo tono pero más claro, usado cuando el color va como TEXTO o BORDE sobre una superficie que sí se oscurece — el primary-color original solo da 2.33:1 sobre el fondo oscuro, muy por debajo de AA).
- `--timer-gradient-start/end` (relleno de texto del cronómetro vía `background-clip: text`) vs `--bg-gradient-start/end` (fondo de página) — si compartieran variable, oscurecer el fondo dejaría el cronómetro illegible.
- `pomodoro.js` fijaba el stroke del anillo por JS con `var(--primary-color)`/`var(--secondary-color)` (pisaba cualquier cambio en la regla CSS) — se cambió a `--accent-text`/`--accent-text-secondary`.

Todos los tonos verificados con cálculo real de contraste (script Node, fórmula WCAG), no a ojo. Si en algún momento se agrega un color nuevo a la paleta, hay que decidir conscientemente si es "texto sobre superficie" (usar `--accent-text`) o "fondo de botón con texto blanco" (usar `--primary-color` directo) — mezclarlos rompe el tema oscuro.

**Vista Hoy completada**: mostraba solo el Pomodoro pese a prometer "prioridades, foco y agenda". Se agregó `#today-mits` (hasta 3 MITs del Checklist, tildables ahí mismo) en `checklist.js`, y `#today-calendar-events-list` (lo que queda de hoy en Google Calendar) en `calendar.js`. Ambos ya existían como código muerto antes del refactor de la sesión Mac (el HTML nunca los tuvo).

## Notas importantes para trabajar en este repo

- **No tocar el backend de producción sin avisar antes.** El proyecto de Firebase es real (`tdah-app-efca9`).
- **Emulador de Firebase configurado (2026-07-30)**: `firebase.json` tiene bloque `emulators` (auth :9099, firestore :8080, ui :4000). Para probar sin tocar producción: `firebase emulators:start` (sin `--only`, esa combinación de flags rompe con la versión de `firebase-tools` instalada — usar el comando completo arranca auth+firestore+hosting igual) y abrir la app con `?emulator=1` (ej. `http://localhost:8791/?emulator=1`). Sin ese query param, la app se comporta igual que siempre y pega contra producción — es el modo que hay que usar para pruebas de usabilidad reales. La lógica de conexión vive en `public/js/firebase.js`. Requiere Java (JDK) instalado para el emulador de Firestore — ya instalado en la PC de Windows (Temurin 21 vía winget); si en la Mac no está, instalarlo ahí también.
- Para levantar un servidor local y probar en el navegador: `.claude/launch.json` tiene una config `tdah-app` que sirve `public/` con `npx serve` (funciona igual en Windows y Mac, a diferencia de `python`/`python3` que difiere entre sistemas), y una config `firebase-emulators` que corre `firebase emulators:start`.
- Para borrar cuentas anónimas de prueba acumuladas: `scripts/delete-anonymous-users.js` (requiere una clave de servicio de Firebase que el usuario descarga y NO se commitea). Quedaron cuentas de prueba de esta sesión de refactor sin limpiar todavía.
- **Token de Calendar (2026-07-30)**: se agregó refresco silencioso sin backend usando Google Identity Services (`public/js/features/calendar.js`, script GIS cargado en `index.html`). Al conectar con Google se programa una renovación automática (~5 min antes de que expire, cada ~1h) vía `google.accounts.oauth2.initTokenClient(...).requestAccessToken({ prompt: '' })`, que reusa la sesión de Google activa en el navegador sin mostrar popup. Usa el mismo Web Client ID que ya usa Firebase Auth internamente (`765424031369-l9nnoo6q8hcflmpb5vd911cb2lqp9452.apps.googleusercontent.com`, es público, no un secreto). **Limitación conocida**: depende de que el navegador mantenga cookies de terceros/sesión de Google activa; si eso falla (o el usuario cierra la sesión de Google), el refresco silencioso falla y hay que reconectar a mano — no se pudo verificar en un login real todavía porque hacerlo requeriría loguear con una cuenta de Google real, y evitamos tocar producción sin avisar. Falta que el usuario lo prueba en un uso real de un día completo. Si esto no alcanza (ej. por restricciones de cookies de terceros en Safari/Chrome), la solución real pasa a ser un backend (Cloud Function) con refresh token de verdad — evaluar más adelante.
- El token/API key de Trello se guarda en Firestore por usuario (protegido por reglas de seguridad por UID), no es un problema de seguridad grave pero vale la pena tenerlo en cuenta.

## Sesión 2026-07-31

**Contenido de Blog/Nutrición renovado**: el usuario trabajó en paralelo con otra sesión de Claude (enfocada en neurodivergencia) que armó `scripts/seed-content.js` — carga 5 artículos de Blog y 4 de Nutrición curados con fuentes 2024-2026 (percepción del tiempo, ejercicio, sueño/circadiano, autocompasión, gamificación, omega-3, ultraprocesados, déficits nutricionales, dietas de eliminación). Mismo patrón que los otros scripts de mantenimiento (firebase-admin, dry-run por defecto, `--confirm` para escribir). Ya corrido en producción con éxito.

Como las colecciones ya tenían contenido de placeholder viejo, se sumó `scripts/cleanup-old-content.js`: borra los documentos de `blogArticles`/`nutritionContent` cuyo `title` no está en la lista "nueva" (hardcodeada, debe coincidir con los títulos de `seed-content.js`). Ya corrido con `--confirm`, confirmado por el usuario que solo quedan las notas nuevas. **Sin backup**: Firestore no tiene undo ni papelera, y el proyecto no tiene Point-in-Time Recovery habilitado — el contenido viejo no es recuperable, decisión aceptada por el usuario.

**Fix de configuración en Google Cloud (no en código)**: al probar el refresco silencioso de Calendar en `localhost:8791`, saltó `Error 400: origin_mismatch` de Google. Causa: el refresco silencioso usa `google.accounts.oauth2` (GIS) directamente, que valida contra la lista **"Authorized JavaScript origins"** del OAuth Client ID en Google Cloud Console — una lista *distinta* de los "Authorized domains" de Firebase Auth (que ya incluye `localhost` por defecto, por eso el login normal con Google nunca tuvo este problema). Se agregó `http://localhost:8791` a esa lista (Google Cloud Console → APIs & Services → Credenciales → **"Web client (auto created by Google Service)"**, ID `765424031369-l9nnoo6q8hcflmpb5vd911cb2lqp9452...`). Los dominios de producción (`tdah-app-efca9.web.app` y `.firebaseapp.com`) ya estaban en esa lista de antes, así que el refresco silencioso no debería tener este problema una vez deployado — esto solo afectaba a las pruebas locales. **Ojo**: si en la Mac se prueba Calendar en un puerto distinto a 8791, va a hacer falta agregar ese origen también (la config es a nivel de proyecto de Google Cloud, no por máquina, así que una vez agregado un origen funciona para cualquier PC que lo use).

**Plan de mejoras UX/ADHD (5 fases): completo.** El usuario dividió el trabajo con otra sesión de Claude (la misma de Blog/Nutrición): esa sesión analizó la app desde una consultoría UX/neurodivergencia y armó el plan completo en `scripts/plan-mejoras-ux-adhd.md` (queda ahí de referencia); esta sesión implementó el código. Las 5 fases, verificadas en el navegador contra el emulador antes de cada commit:

- **Fase 1 — Agrupar nav**: los 8 botones (menos Hoy y Configuración) se agrupan en 3 `<details name="nav-accordion">` (Organizar/Reflexionar/Aprender) — acordeón nativo del navegador, sin JS nuevo. `mostrarSeccion()` cierra cualquier grupo abierto después de navegar. IDs de botones sin cambios.
- **Fase 3 — Barras de progreso**: `renderProgressSummary()` compartido en `ui.js` ("X/Y + barra"), usado en Hábitos (completados hoy) y Checklist (completados sobre el total, no hay concepto de "día" en esos ítems).
- **Fase 4 — Truncar Blog/Nutrición**: tarjetas truncadas a 120 caracteres con "Leer más"/"Leer menos" (toggle en memoria). De paso se sacó el `innerHTML` con contenido directo en `content-feed.js` (quedaba pendiente, mismo criterio que el resto de la app) y se agregó `rel="noopener noreferrer"` al link externo.
- **Fase 2 — Enfocarme desde un MIT**: `pomodoro.js` exporta `startFocusOn(text)` (guarda un handler asignado dentro de `initPomodoro`, evita import circular); botón en cada MIT de `#today-mits` lo llama. Muestra la tarea en `#pomodoro-today-focus-label` y arranca el timer solo si no estaba corriendo (si ya corría, solo actualiza el label).
- **Fase 5 — "Próximo paso"**: nuevo `public/js/features/next-step.js`, sin `initX()` propio ni Firestore ref propia — solo reacciona a `setMitsState()`/`setHabitsState()` que `checklist.js`/`habits.js` llaman desde sus `onSnapshot` ya activos. Prioridad: MIT sin completar > hábito de hoy sin marcar > refuerzo positivo (o mensaje neutral si no hay nada configurado todavía).

**Plan de mejoras UX/ADHD, segunda tanda (4 ítems): completo.** Mismo reparto de trabajo que la primera tanda (plan en `scripts/plan-mejoras-fase2-adhd.md`). Los 4 ítems, verificados en el navegador contra el emulador antes de cada commit:

- **Ítem 3 — Enfocarme desde un hábito**: `next-step.js` ahora también ofrece, cuando no hay MITs pendientes pero sí un hábito de hoy sin marcar, dos botones ("Ir a Hábitos" y "Enfocarme ahora" vía `startFocusOn`).
- **Ítem 1 — Guía de respiración 4-7-8**: en `pomodoro.js`, al empezar un descanso (o al resumir uno en curso vía `onSnapshot`) se muestra `#breathing-guide`/`#breathing-guide-today` (círculo, texto de fase actual, encadenado con `setTimeout`). Se oculta al pausar/reiniciar. **Nota de testing**: probar esto con el timer real en tiempo real no funciona bien con el navegador automatizado — las pestañas en segundo plano tiran mucho el `setInterval`. Para verificar el resume-path hay que escribir directamente el doc `pomodoroSettings/current` en el emulador (vía `firebase-admin` con `FIRESTORE_EMULATOR_HOST`) simulando un descanso en curso, dejando bastante margen de `timeLeft` (100+ segundos) para absorber la latencia de las llamadas — con poco margen (ej. 15s) el descanso ya termina antes de poder leer el estado resultante. **Actualizado 2026-08-03**: el círculo originalmente usaba `@keyframes breathe` en loop; se reemplazó por `transform`/`transition` fijados por JS por fase (ver sección de esa fecha) porque la animación CSS se reiniciaba desde 0% si la sección quedaba en `display:none`, desincronizándose del texto.
- **Ítem 4 — Filtrar recetas por nutriente**: `seed-content.js` ahora tiene `nutrients: string[]` en cada receta (vocabulario fijo: hierro, magnesio, omega-3, vitamina-b, zinc, según lo que menciona el propio texto de cada receta). `content-feed.js` arma chips de filtro (mismo patrón que las etiquetas del Journal) sobre `#nutricion-nutrient-filters`, solo para Nutrición — Blog no tiene filtro. Un filtro activo oculta los artículos informativos (no tienen `nutrients`), vuelven al sacar el filtro. **Resuelto (2026-08-03)**: se corrió `seed-content.js --confirm` contra producción (con autorización explícita del usuario) — las recetas ya tienen `nutrients` en prod, los chips de filtro funcionan ahí también.
- **Ítem 2 — Sistema de puntos**: nuevo `public/js/features/points.js`. +10 puntos al completar un MIT (desde Checklist o desde Hoy), +5 al marcar un hábito como hecho HOY (marcar un día pasado no cuenta). Nunca resta al destildar — el signo de la transición (false→true) ya lo garantiza el evento `change` de un checkbox / el chequeo explícito `!wasCompleted` en el click del hábito. Contador simple en Vista Hoy (`#points-display`), persistido en `points/current` vía `increment()` atómico de Firestore (evita el patrón getDoc→mutar→setDoc que sí usan subtasks/hábitos, porque acá no hace falta leer el valor actual). A propósito sin niveles, rachas ni tablas de posiciones.

## Sesión 2026-08-03

**Plan de mejoras — neurodivergencia en general (3 ítems): completo.** Nueva sesión paralela del "otro agente" (mismo reparto de trabajo que los planes anteriores), esta vez con foco en autismo/dislexia/sensibilidad sensorial en vez de TDAH específicamente — plan completo en `scripts/plan-mejoras-neurodivergencia.md`. Antes de arrancar, se encontró y verificó un fix ya hecho por esa sesión paralela en el working tree: la guía de respiración (`.breathing-circle`) pasó de `@keyframes breathe` en CSS a `transform`/`transition` fijados por JS en `pomodoro.js` (`runBreathingPhase`), porque la animación CSS se reiniciaba desde 0% si la pestaña/sección estaba oculta al momento de mostrarse, desincronizando el círculo del texto de fase. Verificado en el emulador antes de commitear junto con el plan nuevo.

Los 3 ítems del plan nuevo, verificados en el navegador contra el emulador antes de cada commit:

- **Ítem 3 (hecho primero, orden sugerido por el plan) — Auditoría de lenguaje simple**: revisados todos los `showTempMessage()`/`showCustomConfirm()` del repo. La mayoría ya eran oraciones cortas y directas — no se tocaron. Se encontraron y arreglaron 4 casos que exponían `error.message` crudo de Firebase al usuario (login con Google, login anónimo, fallback de `getEmailAuthErrorMessage`, Clear Data, guardar entrada de Journal) reemplazados por un mensaje genérico + `console.error` para debugging, y 2 casos más con el mismo problema en `trello.js` (fuera del scope literal del audit — usan `innerHTML`/`textContent` en vez de `showTempMessage`, pero misma categoría de jerga técnica).
- **Ítem 1 — Reducir movimiento**: nuevo `public/js/motion.js`, mismo patrón que `sound.js` (localStorage + toggle en Configuración), pero el default respeta `prefers-reduced-motion` del sistema operativo hasta que el usuario elige algo a propósito. Aplicado como `data-reduced-motion` en `<html>` vía script inline en el `<head>` (antes del primer render, igual que el tema). Con el modo activo: sin animación de entrada de sección (`.seccion.active`), sin pulso del timer activo, sin animación de "botón clickeado", círculo de respiración estático (requiere `!important` en CSS porque `pomodoro.js` le fija `transform`/`transition` por JS — un estilo inline siempre gana sobre una regla de hoja de estilos sin `!important`), y `triggerConfetti()` en `ui.js` no genera las 100 piezas (gateado en JS: no es controlable solo por CSS).
- **Ítem 2 — Tamaño de texto y espaciado ajustables**: `theme.js` (renombrado en la práctica a manejar tema + tamaño de texto, mismo doc de Firestore `settings/appSettings` y un solo `onSnapshot`) agrega un segundo control "Normal"/"Aa Grande" (`data-text-size` en `documentElement`, mismo patrón de script inline en `<head>`). Variables `--base-font-size`/`--base-line-height`/`--base-letter-spacing` aplicadas en `body`; como la mayoría del CSS ya usa `em` relativo a su propio ancestro, escalar el body en cascada escala casi toda la app sin tocar cada regla. Se convirtieron a `em` los pocos `px` que no habrían escalado solos en zonas de riesgo marcadas por el plan (nav, botón "▶ Enfocarme" de los MITs). Verificado que nav, tarjetas de Nutrición (truncadas y expandidas) y chips de filtro no desbordan con el modo grande activo.

**A pedido del usuario probando la guía de respiración**: se agregó un selector de patrón (4-7-8 / Cuadrada 4-4-4-4 / Triangular 4-4-4) en la config del Pomodoro (`#breathing-pattern-options`), persistido en `pomodoroSettings/current` junto a focusTime/breakTime. Cada fase declara su propio `scale` (1 expandido, 0.7 contraído) en vez de asumir "la última fase siempre contrae", para soportar patrones con distinta cantidad de fases. Elegir un patrón nuevo mientras el círculo ya está animando reinicia la animación al instante. Después, en paralelo, la otra sesión reemplazó el círculo pulsante por un gráfico de línea SVG (zigzag proporcional a la duración real de cada fase, coloreado por tipo, con un punto que se desliza) — más legible que un círculo que solo cambia de tamaño; mismo mecanismo de transform/transition por JS (no `@keyframes`) para no desincronizarse si la pestaña estuvo oculta.

**Backlog original: completo.** Único ítem MEDIA que quedaba pendiente — "configuración de sonidos/volumen" — resuelto: slider global de volumen (`#sound-volume-input` en Configuración, 0-100%, un solo control para todos los sonidos en vez de uno por sonido, mismo criterio de simplicidad que el resto de la app) en `sound.js`, persistido en `localStorage`, aplicado en `playSound()` antes de reproducir. Con esto no queda nada pendiente del backlog original de Trello — solo falta el housekeeping manual de marcar como Done en el board las tarjetas ya resueltas en código ("Estilo del Checkbox MIT", y ahora esta).

**Bug real encontrado al probar el volumen**: el usuario reportó no escuchar ningún sonido (ni al completar un Pomodoro ni al empezar el descanso). Causa: `public/sounds/*.mp3` (los 3 archivos) eran placeholders de texto de 28 bytes (`<binary content placeholder>`) desde que se agregó la feature de sonido — nunca hubo audio real, en ningún entorno, no era un problema nuevo ni del emulador. Se reemplazaron por 3 tonos sintetizados a mano en WAV (PCM 16-bit, sin dependencias — el generador quedó en el scratchpad de la sesión, no en el repo) y las referencias en `index.html` pasaron de `.mp3` a `.wav`. De paso se agregaron 3 botones "▶ Probar sonido" en Configuración (uno por evento: tarea completada, foco terminado, empieza el descanso) vía `playSoundPreview()` en `sound.js` — sí suenan aunque el toggle esté silenciado, a diferencia de `playSound()` — porque antes no había forma de escuchar un sonido sin completar una tarea o un Pomodoro real. **Si en algún momento se quieren sonidos más elaborados** (no simples tonos sintetizados), hay que reemplazar esos 3 `.wav` por archivos de audio reales — el usuario los tendría que conseguir/subir él mismo, ninguna sesión de Claude tiene forma de descargar audio de internet.

**Deploy y push**: se corrió `firebase deploy --only hosting` (todo lo de esta sesión ya está en `tdah-app-efca9.web.app`) y se hizo push de todos los commits acumulados.

**Housekeeping de Trello: completo.** Nuevo `scripts/trello-mark-done.js` (mismo patrón dry-run/`--confirm` que los otros scripts, pero lee la Trello API Key/Token desde Firestore en vez de pedirlos por parámetro — así nunca hace falta escribirlos en la terminal ni en el chat). Corrido con `--confirm`: las 19 tarjetas de "To Do"/"Doing" ya resueltas en código se movieron a "Done", dejando "traea 2" (tarjeta de prueba manual del usuario) intacta. Tres tarjetas se movieron con una diferencia de matiz entre el título literal y lo implementado (decisión consciente, no un pendiente real):
- "Etiquetar y Filtrar Entradas del Journal **y Artículos del Blog**": la parte de Journal está hecha; la de Blog se descartó a propósito con el usuario (contenido de solo lectura, no tiene sentido taguearlo por usuario).
- "Configuración de Sonidos y Volumen **Individuales**": se implementó un volumen global (un solo slider para los 3 sonidos), no uno por sonido — mismo criterio de simplicidad que el resto de la app.
- "Sistema de Puntos **por Pomodoros Completados**": el sistema de puntos final (decidido en el plan UX/ADHD segunda tanda) suma por completar MITs/hábitos, no por Pomodoros completados en sí.

**Bug de Trello encontrado en el camino**: al intentar correr el script, la Trello API Key/Token guardados devolvían `401: invalid key`. Causa real: el usuario había guardado el **"Secreto"** (OAuth Secret de la app, visible en `trello.com/power-ups/admin`) en el campo Token de la app, en vez de un **Token de miembro real** (que se genera visitando `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=API_KEY`, un valor que no aparece en ningún lado de la página de administración). Son dos strings distintos que casualmente truncados se parecían. Una vez generado el Token correcto y regrabado en Configuración > Trello, el script funcionó.
