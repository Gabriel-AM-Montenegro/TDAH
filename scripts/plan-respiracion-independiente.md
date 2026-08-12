# Plan — separar "Respiración" de la configuración del Pomodoro

## Contexto (leer antes de empezar)

- Hoy el patrón de respiración (4-7-8 / Cuadrada / Triangular) vive completamente dentro de `pomodoro.js`: el selector está en la config del Pomodoro, el estado se guarda en `pomodoroSettings/current`, y la guía solo se puede ver durante un descanso activo.
- El usuario quiere una sección nueva "Respiración", independiente, con: (a) una explicación breve de cada fase y de cada patrón, (b) el mismo selector de patrón que hoy está en Pomodoro — pero compartido: cambiarlo desde cualquiera de los dos lugares se refleja en el otro, (c) poder practicar el ejercicio de respiración cuando quiera, sin estar en un descanso del Pomodoro.
- Además, en Pomodoro tiene que aparecer un toggle "¿querés hacer ejercicios de respiración en la pausa?" — si está activado, el comportamiento actual sigue igual (la guía aparece sola durante el descanso); si está desactivado, esa parte no aparece para nada en Pomodoro (ni el selector ni la guía durante el descanso).
- **Leé `CLAUDE.md` primero** para las convenciones del repo y el estado actual completo de la app.
- **Decisión tomada sin confirmar con el usuario (avisado, corregir si no es lo que quiere)**: en el agrupamiento de nav, "Respiración" va dentro del grupo "Reflexionar" (junto a Journal), y "Hábitos" se queda donde está hoy (grupo "Organizar"). El usuario pidió específicamente mover Calendario a "Organizar" (junto a Pomodoro, Checklist y Tareas) y dejar "Reflexionar" solo con Journal — eso sí es una instrucción explícita, no una suposición.
- Este cambio es grande porque toca una arquitectura compartida entre dos secciones — no lo dividas en commits sueltos por archivo, hacé todo el módulo nuevo + su integración en un solo pase, y verificá el conjunto completo en el navegador antes de terminar.

---

## Archivos a tocar

- **Nuevo**: `public/js/features/breathing.js` (reemplaza la lógica de respiración que hoy vive en `pomodoro.js`)
- `public/js/features/pomodoro.js` (sacar todo lo de respiración, consumir el módulo nuevo)
- `public/index.html` (nueva sección `#respiracion`, nuevo botón de nav, ajustar los grupos de nav, quitar el picker viejo de Pomodoro y poner el toggle + picker nuevo)
- `public/js/ui.js` (`SECTION_TITLES`)
- `public/js/main.js` (importar y llamar `initBreathing(db, userId)`)
- `public/css/styles1.css` (estilos del toggle y de la explicación de patrones, si hace falta algo nuevo más allá de lo que ya existe)

## Diseño

### 1. Firestore: nuevo doc compartido

`artifacts/{publicDataDocId}/users/{userId}/breathingSettings/current`, con:
```js
{ pattern: '478' | 'box' | 'triangle', enabledOnBreak: boolean }
```
Reemplaza al campo `breathingPattern` que hoy vive mezclado dentro de `pomodoroSettings/current` (`pomodoro.js` líneas 247 y 359) — no hace falta migrar el valor viejo, que quede huérfano ahí no rompe nada (es solo una preferencia, no datos del usuario). Default si el doc no existe: `{ pattern: '478', enabledOnBreak: true }` (mantiene el comportamiento actual como default, para que a nadie que ya lo tenía activado se le desactive solo).

### 2. `breathing.js` — módulo nuevo, responsabilidades

Mover desde `pomodoro.js` (líneas 19-85: `BREATHING_PATTERNS`, `DEFAULT_BREATHING_PATTERN`, `PATH_WIDTH`/`PATH_Y_HIGH`/`PATH_Y_LOW`, `phaseColorVar`, `getBreathingGeometry`) tal cual, son puramente datos/cálculo, no dependen de nada del Pomodoro.

Agregar a `BREATHING_PATTERNS` un campo de texto explicativo por patrón (para la sección nueva), ej.:
```js
'478': {
  label: '4-7-8 (relajación profunda)',
  description: 'La exhalación larga activa fuerte el sistema nervioso parasimpático — pensada para relajación profunda y ayudar a conciliar el sueño, no para recuperar el foco rápido.',
  phases: [...],
},
box: {
  label: 'Cuadrada (enfoque y calma)',
  description: 'Ritmo simétrico con dos pausas (con aire y sin aire) — ayuda a recuperar la calma y el foco en un momento de estrés agudo.',
  phases: [...],
},
triangle: {
  label: 'Triangular (simple y rápida)',
  description: 'La más corta y simple de las tres (inhalar, sostener y exhalar en partes iguales) — buena puerta de entrada si nunca probaste respiración guiada.',
  phases: [...],
},
```
Y un texto genérico fijo (no por patrón) explicando las 3 fases en general: qué es "inhalar", "sostener" y "exhalar" y por qué cada una importa — para mostrar una sola vez en la sección Respiración, no repetido por patrón.

**`initBreathing(db, userId)`** (mismo patrón `initX(db, userId)` que el resto de la app):
- Crea el doc ref, hace `onSnapshot` sobre `breathingSettings/current`.
- Mantiene el estado compartido en memoria (`currentPattern`, `enabledOnBreak`) dentro del módulo.
- Al cambiar el doc: actualiza el estado en memoria, refresca el resaltado de **todos** los pickers registrados (ver abajo), y si hay algún `runner` activo en ese momento reinicia su animación en fase 0 con el patrón nuevo (mismo comportamiento que ya existe hoy en `pomodoro.js` líneas 188-198, pero generalizado a cualquier runner activo, no solo el de Pomodoro).

**Funciones exportadas**:
- `getCurrentBreathingPattern()` / `isBreathingEnabledOnBreak()`: getters simples para que `pomodoro.js` los consulte.
- `setBreathingPattern(value)` / `setBreathingEnabledOnBreak(bool)`: escriben al doc (`setDoc({...}, {merge: true})`).
- `renderBreathingPatternPicker(containerId)`: pinta los botones de patrón en el contenedor indicado (mismo look que el picker actual, clase `theme-option-btn`), engancha el click a `setBreathingPattern`, y registra ese `containerId` en una lista interna para que se resalte solo cada vez que cambie el patrón (sin importar desde qué picker vino el cambio). Se puede llamar más de una vez con contenedores distintos — es la pieza clave que permite que Pomodoro y Respiración muestren el mismo selector sincronizado.
- `renderBreathingEnabledToggle(containerId)`: pinta el checkbox/toggle "Hacer ejercicios de respiración en la pausa" en el contenedor indicado, engancha a `setBreathingEnabledOnBreak`. Solo se usa en Pomodoro, pero conviene que sea una función del módulo igual (no hardcodear el id del contenedor adentro).
- `createBreathingRunner(guideElements)`: la máquina de animación en sí — extraída de `runBreathingPhase`/`startBreathingGuide`/`stopBreathingGuide` (`pomodoro.js` líneas 109-165), pero generalizada para que reciba como parámetro el array de elementos `.breathing-guide` que tiene que animar (hoy está hardcodeado a `breathingGuides` de Pomodoro). Devuelve `{ start(), stop() }`. Internamente se registra/desregistra como "runner activo" (para el reinicio automático en cambio de patrón, ver arriba).

**Por qué un `createBreathingRunner` en vez de una sola instancia global**: va a haber dos usos independientes al mismo tiempo — el de Pomodoro (que arranca/para solo, atado al descanso) y el de la sección Respiración (que el usuario arranca/para a mano, sin relación con el Pomodoro). Cada uno necesita su propio estado de "en qué fase estoy" y su propio `setTimeout` encadenado, pero ambos comparten el patrón elegido (que viene de `getCurrentBreathingPattern()`).

### 3. `pomodoro.js` — sacar la lógica, consumir el módulo

- Borrar todo lo de la sección "Guía de respiración" (líneas 19-85 y 106-202, más las referencias sueltas: `savePomodoroState` línea 247 saca `breathingPattern`, el `onSnapshot` línea 359-360 saca esa lectura).
- Importar de `./breathing.js`: `isBreathingEnabledOnBreak`, `renderBreathingPatternPicker`, `renderBreathingEnabledToggle`, `createBreathingRunner`.
- Crear un runner propio: `const breathingRunner = createBreathingRunner([document.getElementById('breathing-guide'), document.getElementById('breathing-guide-today')].filter(Boolean));` (mismos dos elementos que hoy).
- En `handleTimerEnd()` (línea ~270, donde hoy dice `startBreathingGuide()`): cambiar por `if (isBreathingEnabledOnBreak()) breathingRunner.start();`.
- En el resume-on-reload del `onSnapshot` (línea ~370, `if (isBreakTime) startBreathingGuide();`): mismo cambio, gatear con `isBreathingEnabledOnBreak()`.
- En `resetTimer()` (línea 312, `stopBreathingGuide()`): cambiar por `breathingRunner.stop()`.
- Llamar `renderBreathingEnabledToggle('breathing-enabled-toggle')` y, condicionalmente, `renderBreathingPatternPicker('breathing-pattern-options')` — el picker solo se pinta/muestra si `isBreathingEnabledOnBreak()` es `true` (ver punto de HTML abajo, es más simple ocultar el contenedor entero por CSS/JS que desmontar y remontar el picker cada vez que cambia el toggle).

### 4. `index.html`

**Nav** (grupo `Organizar` y `Reflexionar`, buscar el bloque de `<details name="nav-accordion">`):
- Mover `btn-calendario` de "Reflexionar" a "Organizar" (junto a Pomodoro, Checklist, Tareas).
- Dejar `btn-journal` solo en "Reflexionar".
- Agregar `btn-respiracion` (🫁 o 🌬️ Respiración) en "Reflexionar", junto a Journal.
- `btn-habitos` se queda en "Organizar" donde está (salvo que el usuario corrija la decisión marcada arriba).

**Sección Pomodoro** (donde hoy está `#breathing-pattern-options`, dentro de `.config-container`):
```html
<div class="config-row">
  <label class="config-label">
    <input type="checkbox" id="breathing-enabled-toggle-input">
    Hacer ejercicios de respiración en la pausa
  </label>
</div>
<div id="breathing-pattern-options-pomodoro" class="theme-options"></div>
```
El `<div id="breathing-pattern-options-pomodoro">` se oculta por completo (JS, `display:none` o similar) cuando el toggle está desactivado — es "esa parte" que el usuario pidió que no aparezca.

**Nueva sección `#respiracion`** (después de Journal, mismo nivel que las demás `<section class="seccion">`):
```html
<section id="respiracion" class="seccion">
  <h2>🫁 Respiración</h2>
  <p class="subtitle">Practicá cuando quieras, no solo en los descansos del Pomodoro.</p>

  <div id="breathing-phases-explanation"></div>

  <h3>Elegí un patrón</h3>
  <div id="breathing-pattern-options-standalone" class="theme-options"></div>
  <div id="breathing-pattern-description"></div>

  <div id="breathing-guide-standalone" class="breathing-guide" hidden>
    <svg class="breathing-path" viewBox="0 0 260 70" width="260" height="70">
      <g class="breathing-segments"></g>
      <circle class="breathing-dot" cx="0" cy="0" r="7"></circle>
    </svg>
    <p class="breathing-label"></p>
  </div>
  <button type="button" id="breathing-standalone-start-btn">▶ Empezar ejercicio</button>
  <button type="button" id="breathing-standalone-stop-btn">⏹ Detener</button>
</section>
```
`breathing.js` es quien pinta `#breathing-phases-explanation` (texto fijo de las 3 fases) y quien actualiza `#breathing-pattern-description` cada vez que el patrón elegido cambia (mostrando `BREATHING_PATTERNS[pattern].description`). El botón de empezar/detener llama al segundo runner: `const standaloneRunner = createBreathingRunner([document.getElementById('breathing-guide-standalone')]);` con sus propios `onclick`.

### 5. `ui.js`

Agregar `respiracion: 'Respiración'` a `SECTION_TITLES` (para el título de pestaña dinámico).

### 6. `main.js`

Importar `initBreathing` de `./features/breathing.js` y llamarlo junto a los demás `initX(db, currentUserId)` en `loadAllUserData` — antes de `initPomodoro` (Pomodoro depende de que `breathing.js` ya tenga su estado listo para leer `isBreathingEnabledOnBreak()`/`getCurrentBreathingPattern()` al iniciar).

## Criterios de aceptación

- Cambiar el patrón desde Pomodoro actualiza el selector de la sección Respiración (y viceversa), sin recargar la página.
- Con el toggle de Pomodoro activado: un descanso muestra la guía exactamente igual que hoy.
- Con el toggle desactivado: ni el selector de patrón ni la guía aparecen en Pomodoro durante el descanso; el Pomodoro funciona igual en todo lo demás.
- En la sección Respiración se puede arrancar y detener el ejercicio en cualquier momento, sin que el Pomodoro esté corriendo ni en descanso, y sin afectar el estado del Pomodoro.
- La explicación de cada fase y de cada patrón se lee ahí, no hace falta ir a Pomodoro para entenderla.
- Cambiar de pestaña durante un ejercicio activo (Pomodoro o standalone) no desincroniza el punto del texto (mismo cuidado que ya existe hoy, verificar que `createBreathingRunner` lo preserve).
