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

**Vista Hoy completada**: mostraba solo el Pomodoro pese a prometer "prioridades, foco y agenda". Se agregó `#today-mits` (hasta 3 MITs del Checklist, tildables ahí mismo) en `checklist.js`, y `#today-calendar-events-list` (lo que queda de hoy en Google Calendar) en `calendar.js`. Ambos ya existían como código muerto antes del refactor de la sesión Mac (el HTML nunca los tuvo).

## Notas importantes para trabajar en este repo

- **No tocar el backend de producción sin avisar antes.** El proyecto de Firebase es real (`tdah-app-efca9`).
- **Emulador de Firebase configurado (2026-07-30)**: `firebase.json` tiene bloque `emulators` (auth :9099, firestore :8080, ui :4000). Para probar sin tocar producción: `firebase emulators:start` (sin `--only`, esa combinación de flags rompe con la versión de `firebase-tools` instalada — usar el comando completo arranca auth+firestore+hosting igual) y abrir la app con `?emulator=1` (ej. `http://localhost:8791/?emulator=1`). Sin ese query param, la app se comporta igual que siempre y pega contra producción — es el modo que hay que usar para pruebas de usabilidad reales. La lógica de conexión vive en `public/js/firebase.js`. Requiere Java (JDK) instalado para el emulador de Firestore — ya instalado en la PC de Windows (Temurin 21 vía winget); si en la Mac no está, instalarlo ahí también.
- Para levantar un servidor local y probar en el navegador: `.claude/launch.json` tiene una config `tdah-app` que sirve `public/` con `npx serve` (funciona igual en Windows y Mac, a diferencia de `python`/`python3` que difiere entre sistemas), y una config `firebase-emulators` que corre `firebase emulators:start`.
- Para borrar cuentas anónimas de prueba acumuladas: `scripts/delete-anonymous-users.js` (requiere una clave de servicio de Firebase que el usuario descarga y NO se commitea). Quedaron cuentas de prueba de esta sesión de refactor sin limpiar todavía.
- **Token de Calendar (2026-07-30)**: se agregó refresco silencioso sin backend usando Google Identity Services (`public/js/features/calendar.js`, script GIS cargado en `index.html`). Al conectar con Google se programa una renovación automática (~5 min antes de que expire, cada ~1h) vía `google.accounts.oauth2.initTokenClient(...).requestAccessToken({ prompt: '' })`, que reusa la sesión de Google activa en el navegador sin mostrar popup. Usa el mismo Web Client ID que ya usa Firebase Auth internamente (`765424031369-l9nnoo6q8hcflmpb5vd911cb2lqp9452.apps.googleusercontent.com`, es público, no un secreto). **Limitación conocida**: depende de que el navegador mantenga cookies de terceros/sesión de Google activa; si eso falla (o el usuario cierra la sesión de Google), el refresco silencioso falla y hay que reconectar a mano — no se pudo verificar en un login real todavía porque hacerlo requeriría loguear con una cuenta de Google real, y evitamos tocar producción sin avisar. Falta que el usuario lo prueba en un uso real de un día completo. Si esto no alcanza (ej. por restricciones de cookies de terceros en Safari/Chrome), la solución real pasa a ser un backend (Cloud Function) con refresh token de verdad — evaluar más adelante.
- El token/API key de Trello se guarda en Firestore por usuario (protegido por reglas de seguridad por UID), no es un problema de seguridad grave pero vale la pena tenerlo en cuenta.
