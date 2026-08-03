# Plan de mejoras — neurodivergencia en general (más allá de TDAH)

## Contexto (leer antes de empezar)

- Los dos planes anteriores (`plan-mejoras-ux-adhd.md`, `plan-mejoras-fase2-adhd.md`, ambos completos) se enfocaron en TDAH específicamente. Este plan amplía a neurodivergencia en general — autismo, dislexia, sensibilidad sensorial — que tienen necesidades distintas y a veces opuestas a las de TDAH (ej. alguien con hipersensibilidad sensorial quiere MENOS estímulo, no más feedback inmediato).
- **Leé `CLAUDE.md` primero** para las convenciones del repo y el estado actual completo de la app.
- Evidencia base (2024-2025): entre 37% y 69% de personas autistas reportan sensibilidad sensorial auditiva o a estímulos; WCAG 2.1 SC 1.4.12 exige que tamaño de texto, interlineado y espaciado de letras sean ajustables sin romper el layout; un ensayo de 2024 mostró que simplificar el lenguaje no pierde información y mejora la claridad.
- **Principio de diseño para todo este plan**: preferí un control simple y consolidado antes que muchos controles sueltos — mismo criterio que ya se usó para la paleta fija de etiquetas del Checklist (5 colores, no un selector RGB libre). No multipliques toggles en Configuración si un solo switch cubre el caso de uso real.
- Los 3 ítems son independientes, verificalos en el navegador antes de pasar al siguiente.

---

### Ítem 1 — Reducir movimiento (animaciones y confetti)

**Archivos**: `public/css/styles1.css` (`@keyframes fadeIn` línea ~274, `@keyframes buttonClick` línea ~446, `@keyframes pulse` línea ~1132, `#confetti-container`/`.confetti-piece` línea ~1166-1210, `.breathing-circle` línea ~1780), `public/js/ui.js` (`triggerConfetti()` línea ~52), `public/index.html` (`<head>`, sección `#config`).

- Hoy nada respeta `prefers-reduced-motion`, y no hay ningún control manual para esto — a diferencia del sonido, que ya tiene `sound.js` con toggle persistido.
- Crear un `public/js/motion.js` calcado del patrón de `sound.js` (`isReducedMotionEnabled()`/`setReducedMotionEnabled()`/`wireMotionToggle()`, `localStorage`), **pero además** que el valor por defecto (antes de que el usuario elija algo) respete `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — a diferencia del sonido, acá sí importa el sistema operativo del usuario como señal inicial.
- Aplicar el toggle como atributo en `<html>` (mismo patrón que `theme.js`: `document.documentElement.setAttribute('data-reduced-motion', 'true')`), incluyendo el script inline en `<head>` (línea ~9-16 de `index.html`) para que se aplique antes del primer render, igual que ya hace el tema.
- En CSS, agregar un bloque `:root[data-reduced-motion="true"]` que desactive las animaciones/transiciones de arriba (`animation: none`, `transition: none` donde aplique) — no hace falta un `!important` global si se apunta a los selectores concretos ya identificados.
- En `triggerConfetti()` (`ui.js`), si el modo está activo, no ejecutar la animación (esta no es controlable solo por CSS porque genera y anima 100 elementos por JS con estilos inline).
- Agregar el toggle en `#config` (`index.html` línea ~343-347, mismo bloque que "Sonido"), reusando el mismo patrón visual de `sound-toggle-btn`.
- **Criterio de aceptación**: con el modo activo, no hay confetti al completar un Pomodoro, no hay animación de entrada al cambiar de sección, y el círculo de respiración no se mueve (puede mostrarse estático). El resto de la app sigue funcionando igual.

### Ítem 2 — Tamaño de texto y espaciado ajustables

**Archivos**: `public/css/styles1.css` (línea ~99, `font-family` y el resto de `line-height`/`font-size` del archivo), `public/index.html` (sección `#config`), nuevo o extendido `public/js/features/theme.js` (mismo patrón de `data-*` en `documentElement` + Firestore + localStorage que ya usa para el tema de color).

- Requisito WCAG 1.4.12: el usuario tiene que poder aumentar tamaño de texto, interlineado y espaciado de letras sin que el layout se rompa (texto cortado, elementos superpuestos).
- Como ya se hizo con los temas de color, evitar un slider libre — un solo control de 2 opciones alcanza: "Normal" / "Texto grande y espaciado" (`data-text-size="large"` en `documentElement`). En modo grande, subir `font-size` base, `line-height` y `letter-spacing` un poco vía variables CSS (ej. `--base-font-size`, `--base-line-height`) usadas donde hoy hay valores fijos.
- Verificar especialmente los lugares con texto truncado por `TRUNCATE_LENGTH` (`content-feed.js`) o layouts de una sola línea (nav, botones chicos como `.focus-on-mit-btn`) — con texto más grande no deberían cortarse ni desbordar.
- **Criterio de aceptación**: activar el modo aumenta visiblemente tamaño/interlineado/espaciado en toda la app (no solo en una sección), y ningún botón o tarjeta rompe su layout (probar en Hoy, Checklist, Nutrición con una receta larga).

### Ítem 3 — Auditoría rápida de lenguaje simple

**Archivos**: todos los `showTempMessage(...)` y `showCustomConfirm(...)` del repo (podés listarlos con `grep -rn "showTempMessage(\|showCustomConfirm(" public/js`).

- A diferencia de los ítems 1 y 2, esto **no es una feature nueva**, es una revisión de copy existente. De una lectura rápida ya se ve que los mensajes actuales son bastante literales y cortos (ej. "Tarea actualizada.", "¿Eliminar este hábito?") — es probable que este ítem termine con pocos o ningún cambio, y está bien que así sea.
- Chequeá cada mensaje contra: ¿usa una metáfora o modismo en vez de decir la acción directamente? ¿la oración es corta y tiene un solo verbo principal? ¿el texto de error explica qué pasó sin jerga técnica (ej. `error.message` crudo de Firebase, ver `auth.js` línea ~136 y `main.js` línea ~76, que sí exponen el mensaje técnico del error)?
- Si encontrás algo para simplificar, hacelo ahí mismo; no hace falta un commit separado por mensaje.
- **Criterio de aceptación**: revisaste la lista completa y dejaste registro (en el commit o en `CLAUDE.md`) de qué cambiaste y qué decidiste dejar igual y por qué.

---

**Orden sugerido**: Ítem 3 primero (rápido, sin riesgo, puede no requerir cambios) → Ítem 1 → Ítem 2 (el más grande, toca CSS en todo el archivo).
