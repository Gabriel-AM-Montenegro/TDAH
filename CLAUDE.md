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

Refactor pendiente (no urgente, decidido a propósito para más adelante): separar `public/js/main.js` (~1500 líneas) en módulos por feature.

## Notas importantes para trabajar en este repo

- **No tocar el backend de producción sin avisar antes.** El proyecto de Firebase es real (`tdah-app-efca9`), no hay emulador configurado todavía. Si hay que probar login/Firestore, avisar primero; usar cuentas anónimas de prueba es aceptable si el usuario lo confirma, pero se acumulan y hay que limpiarlas después.
- Para levantar un servidor local y probar en el navegador: `.claude/launch.json` tiene una config `tdah-app` que sirve `public/` con `python -m http.server`.
- Para borrar cuentas anónimas de prueba acumuladas: `scripts/delete-anonymous-users.js` (requiere una clave de servicio de Firebase que el usuario descarga y NO se commitea).
- El token de acceso a Google Calendar no tiene refresh — expira cada ~1h y hay que volver a loguearse. Pendiente de decidir una solución (posiblemente requiere backend).
- El token/API key de Trello se guarda en Firestore por usuario (protegido por reglas de seguridad por UID), no es un problema de seguridad grave pero vale la pena tenerlo en cuenta.
