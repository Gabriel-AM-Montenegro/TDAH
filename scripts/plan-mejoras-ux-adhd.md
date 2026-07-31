# Plan de mejoras UX/visuales — enfoque ADHD

## Contexto (leer antes de empezar)

- Este plan viene de una consultoría de UX enfocada en TDAH/neurodivergencia (evidencia científica 2024-2026 sobre carga cognitiva ejecutiva, "activación de tareas" y feedback dopaminérgico inmediato en adultos con TDAH). Las 5 fases de abajo no son estética por estética: cada una ataca un obstáculo cognitivo específico de la condición. Si en algún punto hay que decidir algo ambiguo, priorizá la opción que reduzca pasos/decisiones para el usuario, no la que se vea "más completa".
- **Antes de tocar código, leé `CLAUDE.md`** en la raíz del repo: tiene las convenciones del proyecto (no usar `innerHTML` con contenido de usuario — usar `textContent`, patrón de módulos por feature en `public/js/features/`, no tocar `firestore.rules` sin avisar al usuario) y el estado actual de la app.
- Los números de línea de abajo son aproximados (pueden haber cambiado si ya tocaste esos archivos) — ubicá por el contenido citado (IDs, nombres de función), no por el número exacto.
- Cada fase es independiente y debe verificarse en el navegador antes de pasar a la siguiente — no las hagas todas en un solo commit.
- Fase 1 (agrupar nav): si tenés que elegir mecanismo, usá `<details>`/`<summary>` nativo del navegador — es la opción más simple, sin JS nuevo, y ya es un patrón accesible por defecto. Solo desviate de eso si el usuario te pide otra cosa.

---

### Fase 1 — Agrupar la navegación (reduce carga de decisión)

**Archivos**: `public/index.html` (líneas ~49-61, `<nav class="nav-tabs">`), `public/css/styles1.css`, `public/js/ui.js` (`mostrarSeccion`).

- Mantener `#btn-hoy` suelto y fuera de cualquier grupo (es el home).
- Agrupar los 8 botones restantes en 3 grupos colapsables (`<details>`/`<summary>` nativo, ver nota de contexto arriba):
  - **Organizar**: Pomodoro, Checklist, Hábitos, Trello
  - **Reflexionar**: Journal, Calendario
  - **Aprender**: Notas Blog, Nutrición
  - Configuración queda aparte (ícono de engranaje, no en un grupo).
- `mostrarSeccion()` no necesita cambiar su lógica de `.active` — solo hay que decidir si un grupo se abre/cierra visualmente al elegir una sección (UX: cerrar el grupo abierto al navegar, para no dejar menús flotando).
- **Criterio de aceptación**: las 10 secciones existentes siguen siendo alcanzables por click, IDs de botones (`btn-pomodoro`, etc.) no cambian (los usa `mostrarSeccion` y el wiring en `main.js`/features).

### Fase 2 — Iniciar Pomodoro directo desde un MIT (baja fricción de arranque)

**Archivos**: `public/js/features/checklist.js` (dueño de `#today-mits`), `public/js/features/pomodoro.js` (dueño del timer `-today`).

- En cada `<li>` de `#today-mits`, agregar un botón "▶ Enfocarme" junto al texto del MIT.
- Al clickear: setear una variable de estado (ej. `currentFocusItem` en `pomodoro.js`, exportada o vía un pequeño evento/callback) con el texto del MIT, mostrarlo arriba del timer en Hoy (ej. `<p id="pomodoro-today-focus-label">`), y arrancar el timer (reusar el mismo handler que ya dispara `pomodoro-start-today`).
- **Depende de**: nada, pero requiere que `checklist.js` y `pomodoro.js` puedan comunicarse — la forma más simple es exportar una función `startFocusOn(text)` desde `pomodoro.js` e importarla en `checklist.js` (mismo patrón ES modules que ya usan).
- **Criterio de aceptación**: click en "Enfocarme" en un MIT arranca el timer de Hoy y muestra qué tarea se está enfocando; no rompe el flujo existente de iniciar el timer sin elegir MIT.

### Fase 3 — Progreso visual en Hábitos y Checklist diario

**Archivos**: `public/js/features/habits.js`, `public/js/features/checklist.js`, `public/css/styles1.css`.

- Reusar el mismo patrón SVG que ya existe en `index.html` para el anillo del Pomodoro (`pomodoro-progress-ring`) como referencia visual, pero no hace falta que sea un anillo idéntico — puede ser una barra simple `<div class="progress-bar"><div class="progress-bar-fill"></div></div>` con `width` calculado en JS.
- Hábitos: agregar un indicador "X/Y completados hoy" con barra, calculado sobre los hábitos que ya trae `dailyCompletions`.
- Checklist: barra similar sobre el total de ítems del día vs. completados.
- **Criterio de aceptación**: la barra se actualiza en tiempo real al tildar/destildar (mismo `onSnapshot` que ya dispara el re-render), sin queries nuevas a Firestore.

### Fase 4 — Recortar texto largo en Blog/Nutrición

**Archivos**: `public/js/features/content-feed.js` (línea ~22-30, template del `blog-article-card`), `public/css/styles1.css`.

- Cambiar el render de `<p>${item.content}</p>` por: mostrar solo las primeras ~120 caracteres o primera oración, con botón "Leer más" que expande el resto (toggle de una clase CSS `.expanded`, sin re-fetch).
- Como el `content` ya viene como texto plano (ver `scripts/seed-content.js`), no hace falta cambiar el esquema de datos, solo el render.
- **Criterio de aceptación**: las tarjetas nuevas cargadas por `seed-content.js` se ven truncadas por defecto y expanden al click, sin perder el link "Leer Más ↗" externo que ya existe.

### Fase 5 — "Próximo paso" único en Vista Hoy

**Archivos**: `public/index.html` (sección `#hoy`), `public/js/features/checklist.js` + `public/js/features/habits.js` (o un nuevo `public/js/features/hoy-next-step.js` si la lógica de prioridad cruza features).

- Agregar un bloque destacado arriba de todo en `#hoy` (antes de `#today-mits`): `<div id="today-next-step" class="next-step-card"></div>`.
- Lógica de prioridad simple (primera que aplique, en este orden): 1) primer MIT sin completar, 2) primer hábito de hoy sin marcar, 3) mensaje de refuerzo positivo si todo está hecho (ej. "Ya hiciste lo importante hoy 🎉").
- **Depende de**: Fase 2 si querés que el botón del "próximo paso" también dispare "Enfocarme" directo.
- **Criterio de aceptación**: el bloque se recalcula cada vez que cambia el estado de MITs o hábitos (mismos listeners de Firestore ya activos, sin nuevas queries).

---

**Orden sugerido**: Fase 1 (aislada, bajo riesgo) → Fase 3 (aislada) → Fase 4 (aislada) → Fase 2 → Fase 5 (usa lo de Fase 2). Cada fase es un cambio chico y verificable por separado en el navegador antes de pasar a la siguiente.
