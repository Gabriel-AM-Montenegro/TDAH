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
- **BAJA**: Mensajes/sugerencias en secciones vacías, optimizar contraste de colores (accesibilidad), control global de sonido.
- **MEDIA**: casi todo el bloque de Journal (buscar por palabra clave, registrar ánimo/energía, etiquetar y filtrar) y Checklist (subtareas, etiquetas de color, recordatorios por hora), unificar estilos, temas de color, config. de sonidos/volumen, guías de respiración en Pomodoro, sistema de puntos.
- Hay una tarjeta suelta "traea 2" en la lista "Doing" sin contenido real (parece de prueba, fecha vencida) — confirmar con el usuario si se archiva.

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

## Notas importantes para trabajar en este repo

- **No tocar el backend de producción sin avisar antes.** El proyecto de Firebase es real (`tdah-app-efca9`), no hay emulador configurado todavía. Si hay que probar login/Firestore, avisar primero; usar cuentas anónimas de prueba es aceptable si el usuario lo confirma, pero se acumulan y hay que limpiarlas después.
- Para levantar un servidor local y probar en el navegador: `.claude/launch.json` tiene una config `tdah-app` que sirve `public/` con `python3 -m http.server` (en Mac no existe el comando `python` a secas, solo `python3`; en Windows puede ser al revés, ajustar `runtimeExecutable` según corresponda).
- Para borrar cuentas anónimas de prueba acumuladas: `scripts/delete-anonymous-users.js` (requiere una clave de servicio de Firebase que el usuario descarga y NO se commitea). Quedaron cuentas de prueba de esta sesión de refactor sin limpiar todavía.
- El token de acceso a Google Calendar no tiene refresh — expira cada ~1h y hay que volver a loguearse. Pendiente de decidir una solución (posiblemente requiere backend).
- El token/API key de Trello se guarda en Firestore por usuario (protegido por reglas de seguridad por UID), no es un problema de seguridad grave pero vale la pena tenerlo en cuenta.
