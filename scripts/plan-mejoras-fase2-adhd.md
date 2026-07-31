# Plan de mejoras UX/ADHD — segunda tanda

## Contexto (leer antes de empezar)

- Este plan continúa el de `scripts/plan-mejoras-ux-adhd.md` (ya completo, ver commits "UX ADHD Fase 1-5"). Mismo criterio: cada ítem ataca un obstáculo cognitivo concreto de TDAH (activación de tareas, carga ejecutiva, feedback dopaminérgico), no es estética porque sí.
- **Leé `CLAUDE.md` primero** — tiene las convenciones del repo (no `innerHTML` con contenido de usuario, patrón de módulos por feature en `public/js/features/`, no tocar `firestore.rules` sin avisar al usuario) y el estado actual completo de la app.
- Los 4 ítems de abajo son independientes entre sí — se pueden hacer en cualquier orden, y cada uno se verifica en el navegador antes de pasar al siguiente. No hagas todos en un solo commit.
- Sobre el sistema de puntos (ítem 2): la evidencia de apps de salud digital (2024-2025) muestra que la gamificación ayuda a la adherencia solo cuando está ligada a comportamientos concretos y sostenidos — no a "abrir la app" o a métricas vacías. Si en algún punto hay que elegir entre "más mecánica de puntos" o "menos pero ligada a un hábito real", elegí lo segundo.

---

### Ítem 1 — Guía de respiración durante el descanso del Pomodoro

**Archivos**: `public/js/features/pomodoro.js`, `public/index.html` (sección `#pomodoro` y bloque `.pomodoro-timer-container` de `#hoy`), `public/css/styles1.css`.

- En `pomodoro.js`, la función `handleTimerEnd()` (línea ~91) ya tiene la rama `else` que corre cuando termina el descanso (`isBreakTime === true`, línea ~112). El momento de *arrancar* el descanso está en la rama `if (!isBreakTime)` (línea ~101-111), justo después de `isBreakTime = true; ... startTimer();` (línea ~103-107) — ahí es donde hay que mostrar la guía.
- Agregar un elemento nuevo (ej. `<div id="breathing-guide">`) que aparezca solo durante el descanso, con una animación simple de expandir/contraer (CSS `@keyframes`, sin librería) sincronizada a un patrón fijo tipo 4-7-8 (inhalar 4s, sostener 7s, exhalar 8s) o "caja" (4-4-4-4) — elegí uno solo, no hace falta que sea configurable.
- Ocultar el elemento cuando `isBreakTime` vuelve a `false` (mismo lugar donde ya se resetea el label de foco en `resetTimer()`, línea ~148).
- **Criterio de aceptación**: al terminar un pomodoro de foco y aceptar el descanso, aparece la guía de respiración; al terminar el descanso o resetear el timer, desaparece. No interfiere con el timer numérico existente ni con las notificaciones.

### Ítem 2 — Sistema de puntos ligado a MITs y hábitos

**Archivos**: nuevo `public/js/features/points.js`, `public/js/features/checklist.js`, `public/js/features/habits.js`, `public/index.html` (agregar un contador visible, ej. en el header o en `#hoy`).

- Un solo contador acumulado (no por sección), guardado en Firestore en un doc nuevo por usuario (ej. `artifacts/{publicDataDocId}/users/{userId}/points/current`, mismo patrón que `pomodoroSettings`).
- Sumar puntos en dos momentos concretos que ya existen y son observables:
  - Completar un MIT en `checklist.js` (buscar dónde ya se marca `completed: true` en el ítem).
  - Marcar un hábito del día en `habits.js` (línea ~76, `newCompletions = { ...completions, [date]: !completions[date] }` — sumar solo cuando pasa de `false`/`undefined` a `true`, no al destildar).
- Mostrar el total en un lugar visible pero no invasivo (ej. junto al logout en el header, o en Vista Hoy). Nada de niveles, rachas ni tablas de posiciones todavía — esa complejidad no está validada por la evidencia y puede esperar a ver si el contador simple ya ayuda.
- **Criterio de aceptación**: completar un MIT o marcar un hábito de hoy suma puntos visibles de inmediato; destildar un hábito no resta (para no castigar); el total persiste entre sesiones (Firestore, no solo memoria).

### Ítem 3 — Conectar "Enfocarme ahora" con Hábitos

**Archivos**: `public/js/features/next-step.js` (función `render()`, línea ~38-60, rama de `latestHabits.firstIncomplete` en línea ~45-52).

- Hoy esa rama solo ofrece el botón "🌱 Ir a Hábitos" (`mostrarSeccion('habitos')`). Agregar un segundo botón "▶ Enfocarme ahora" que llame a `startFocusOn(latestHabits.firstIncomplete.name)` (mismo import que ya usa `next-step.js` desde `pomodoro.js`, línea ~9) — igual que ya hace la rama de MITs en la línea ~41.
- `renderCard()` (línea ~15-36) hoy solo acepta un botón de acción — hay que extenderla para aceptar un segundo botón opcional, o llamarla dos veces con contenedores distintos (lo primero es más simple, mismo patrón que ya existe).
- **Criterio de aceptación**: cuando el próximo paso es un hábito, aparecen ambos botones ("Ir a Hábitos" y "Enfocarme ahora"); clickear "Enfocarme ahora" arranca el Pomodoro con el nombre del hábito como foco, igual que ya pasa con un MIT.

### Ítem 4 — Filtrar recetas/artículos de Nutrición por nutriente

**Archivos**: `public/js/features/content-feed.js` (`buildArticleCard`, `createContentLoader`), `public/index.html` (sección `#nutricion`), `public/css/styles1.css`.

- Ya existe el campo `type: 'recipe'` en los items de `nutritionContent` (ver `scripts/seed-content.js`) y el campo `source` con texto libre tipo "Aporta hierro, B12 y magnesio — ver...". No hay todavía un campo estructurado de nutrientes — antes de programar el filtro, agregar un campo `nutrients: string[]` (ej. `['hierro', 'omega-3']`) a cada receta en `seed-content.js`, en vez de tratar de parsear el texto de `source`.
- En `content-feed.js`, agregar chips de filtro arriba de `#nutricion-content` (mismo patrón que ya usa `journal.js` para `#journal-tag-filters` — filtrado client-side sobre los items ya cargados por `getDocs`, sin query nueva a Firestore).
- Reusar el mismo patrón de normalización de tags que ya tiene `journal.js` (minúsculas, sin duplicados) si conviene extraerlo a un helper compartido en `ui.js` — evaluar si vale la pena o si es solo 3 líneas y no amerita abstraer.
- **Criterio de aceptación**: aparecen chips con los nutrientes presentes en las recetas cargadas; clickear uno filtra la lista a los items que lo incluyen; el filtro no afecta a los artículos de evidencia (que no tienen `nutrients`, quedan visibles siempre o se ocultan según decidas — dejalo explícito en el commit).

---

**Orden sugerido**: Ítem 3 (más chico, une algo que ya existe) → Ítem 1 (aislado) → Ítem 4 (aislado, requiere primero tocar `seed-content.js` y volver a correr `node seed-content.js ./service-account.json --confirm`) → Ítem 2 (el más grande, toca dos features + Firestore).
