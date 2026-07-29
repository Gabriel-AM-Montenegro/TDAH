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

Refactor pendiente (no urgente, decidido a propósito para más adelante): separar `public/js/main.js` (~1500 líneas) en módulos por feature. Ver plan detallado más abajo — quedó diseñado pero **sin implementar todavía**.

## Sesión Mac (2026-07-29, continuación de la sesión de arriba)

Housekeeping de git (sin cambios en el código de la app):
- El repo tenía dos ramas totalmente divergentes: `main` era un fósil huérfano creado el 16/5/2025 subiendo 3 archivos sueltos por la interfaz web de GitHub ("Add files via upload"), desconectado del historial real, y resultó ser el sitio publicado en GitHub Pages (`gabriel-am-montenegro.github.io/TDAH`) con una versión vieja de la app (sin Firebase, sin la mayoría de las features). `master` es la historia continua real del proyecto (150+ commits) con la app completa que se despliega en Firebase Hosting (`tdah-app-efca9.web.app`).
- Con confirmación del usuario: se apagó GitHub Pages, se cambió la rama default del repo de `main` a `master`, y se borró la rama `main` (local y remota). Ahora el repo tiene una sola rama, `master`, que es la única fuente de verdad.
- Si en algún momento aparece código o instrucciones referenciando `main` como si fuera la rama activa, es información vieja — ya no existe.

Refactor de `public/js/main.js` — plan diseñado, pendiente de ejecución:

**Diagnóstico**: `loadAllUserData` (L323-1284 del archivo actual) mete Pomodoro, Checklist/MITs, Journal, Hábitos, Trello, Blog, Nutrición y el tour de bienvenida como IIFEs anidadas en un mismo scope gigante, cada una con su propio `onSnapshot`.

**Estructura de archivos objetivo** (el HTML ya carga `<script src="js/main.js" type="module">`, así que ES modules nativos funcionan sin bundler):
```
public/js/
  firebase.js          # firebaseConfig, initializeApp → exporta { app, db, auth }
  ui.js                # showTempMessage, showCustomConfirm, triggerConfetti, mostrarSeccion, SECTION_TITLES
  listeners.js          # registerListener(unsub), cleanupListeners() — reemplaza el array unsubscribeListeners module-scope
  auth.js               # onAuthStateChanged + wiring de login (Google/anónimo/email) y logout; recibe loadAllUserData como callback param (evita import circular con main.js)
  features/
    calendar.js         # updateCalendarConnectionStatus, handleDisconnectCalendar, loadCalendarEvents, calendarAccessToken
    welcome-tour.js
    journal.js
    pomodoro.js
    checklist.js
    habits.js
    trello.js
    content-feed.js     # factory createContentLoader() + initBlog() + initNutricion()
  main.js               # entry point: importa todo, define loadAllUserData() como orquestador delgado, wiring de DOMContentLoaded que no es de ninguna feature (nav tabs, permiso de notificaciones)
```
Cada módulo de `features/` expone `initX(db, userId, deps)`, hace su propio wiring/`onSnapshot` y llama a `registerListener()` en vez de empujar a un array compartido a mano.

**Decisiones ya tomadas (confirmadas con el usuario, no volver a preguntar)**:
- `#today-mits`, `#today-calendar-events-list`, `#go-to-calendar-from-hoy`: referenciados en `main.js` pero **no existen** en `index.html` actual (código muerto con guards `if(el)`) → se eliminan al migrar Checklist y Calendar.
- El wiring duplicado de los botones "Hoy" del Pomodoro (cableado dos veces: dentro del IIFE del Pomodoro y de nuevo en `DOMContentLoaded` como proxies `.click()`) se consolida en un solo lugar dentro de `pomodoro.js`.
- `publicDataDocId` (línea ~338, string hardcodeado) difiere en un dígito del `appId` real de Firebase (línea ~43) — probable bug preexistente, pero determina la ruta de Firestore donde ya vive la data de producción. **NO tocar** al migrar — copiar el literal tal cual. Si se quiere arreglar, es una tarea aparte y separada, no parte de este refactor.
- Los 4 helpers de `ui.js` se mantienen expuestos en `window.*` como hoy (no hay uso interno que lo requiera, pero minimiza riesgo de romper algo externo no visto).

**Orden de migración sugerido** (extraer → probar en navegador → seguir): 1) `firebase.js`/`ui.js`/`listeners.js` (solo relocalización) → 2) `calendar.js` → 3) `welcome-tour.js` → 4) `journal.js` → 5) `habits.js` → 6) `trello.js` → 7) `content-feed.js` (blog+nutrición) → 8) `pomodoro.js` → 9) `checklist.js` → 10) `auth.js` → 11) reducir `main.js` al orquestador → 12) pasada final recorriendo las 8 secciones en el navegador.

**Verificación acordada con el usuario**: levantar server local con la config `tdah-app` de `.claude/launch.json`, revisar consola por errores de import en cada paso, y usar **login anónimo de prueba** para validar Journal/Checklist/Hábitos/Pomodoro/Trello contra Firestore real. Al terminar toda la migración, avisar para correr `scripts/delete-anonymous-users.js` y limpiar esas cuentas de prueba.

## Notas importantes para trabajar en este repo

- **No tocar el backend de producción sin avisar antes.** El proyecto de Firebase es real (`tdah-app-efca9`), no hay emulador configurado todavía. Si hay que probar login/Firestore, avisar primero; usar cuentas anónimas de prueba es aceptable si el usuario lo confirma, pero se acumulan y hay que limpiarlas después.
- Para levantar un servidor local y probar en el navegador: `.claude/launch.json` tiene una config `tdah-app` que sirve `public/` con `python -m http.server`.
- Para borrar cuentas anónimas de prueba acumuladas: `scripts/delete-anonymous-users.js` (requiere una clave de servicio de Firebase que el usuario descarga y NO se commitea).
- El token de acceso a Google Calendar no tiene refresh — expira cada ~1h y hay que volver a loguearse. Pendiente de decidir una solución (posiblemente requiere backend).
- El token/API key de Trello se guarda en Firestore por usuario (protegido por reglas de seguridad por UID), no es un problema de seguridad grave pero vale la pena tenerlo en cuenta.
