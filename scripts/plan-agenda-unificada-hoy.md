# Plan — unificar la agenda de Hoy (Calendar + Trello en una sola lista)

## Contexto (leer antes de empezar)

- Hoy la sección `#hoy` tiene un bloque "🗓️ Agenda de hoy" (eventos de Google Calendar) y otro bloque "📋 Trello de hoy" (tarjetas de Trello que vencen hoy) — dos listas separadas mostrando lo mismo en el fondo: cosas con hora/fecha hoy. El usuario confirmó que quiere seguir viendo las citas del día en Hoy (no se está sacando la feature), solo consolidada en una sola lista ordenada por hora en vez de dos bloques.
- **Leé `CLAUDE.md` primero** para las convenciones del repo y el estado actual completo de la app.
- Patrón a reusar: `public/js/features/next-step.js` ya resuelve exactamente este problema (dos features independientes — `checklist.js` y `habits.js` — alimentan un tercer módulo sin `initX()` propio, que combina el estado y renderiza). Este plan repite esa misma arquitectura para Calendar + Trello.
- **No tocar** `#calendar-events-list` (la lista completa de "hoy y mañana" en la sección Calendario) ni `#listaTareas` (la lista de "esta semana" en la sección Trello) — el alcance es solo los bloques resumidos que viven en `#hoy`.
- Verificá en el navegador contra el emulador antes de dar por terminado. Como este cambio toca 2 features a la vez, no lo dividas en fases sueltas — es un solo cambio coherente.

---

## Archivos a tocar

- **Nuevo**: `public/js/features/today-agenda.js`
- `public/index.html` (sección `#hoy`, líneas ~131-139)
- `public/js/features/calendar.js` (`loadCalendarEvents`, `resetCalendarState`)
- `public/js/features/trello.js` (`cargarTareasTrello`)
- `public/js/main.js` (import y wiring del nuevo módulo, si hace falta)
- `public/js/auth.js` (línea ~77 y ~84, limpieza al cerrar sesión)

## Diseño

### 1. Nuevo módulo `today-agenda.js`

Mismo patrón que `next-step.js`: sin `initX(db, userId)`, sin ref de Firestore propia — solo mantiene el último estado que le pasan `calendar.js` y `trello.js`, y renderiza.

```js
let latestCalendarEvents = [];
let latestTrelloCards = [];

export function setTodayCalendarEvents(events) {
    // normalizar a { time: Date, label: string, source: 'calendar' }
    latestCalendarEvents = events.map(e => ({
        time: new Date(e.start.dateTime || e.start.date),
        label: e.summary || '(Sin título)',
        source: 'calendar',
    }));
    render();
}

export function setTodayTrelloCards(cards, { openCard } = {}) {
    latestTrelloCards = cards.map(c => ({
        time: new Date(c.due),
        label: c.name,
        source: 'trello',
        onClick: () => openCard(c),
    }));
    render();
}

function render() { /* merge, sort by time, pintar en #today-agenda-list */ }
```

- Merge: `[...latestCalendarEvents, ...latestTrelloCards].sort((a, b) => a.time - b.time)`.
- Cada `<li>`: ícono según `source` (📅 o 📋), hora (`toLocaleTimeString`), texto. Si tiene `onClick` (los de Trello), agregar el mismo patrón de accesibilidad que ya tiene `trello.js` (`tabindex="0"`, `role="button"`, click + keydown Enter/Espacio) — revisar si conviene extraer ese pequeño helper a `ui.js` para no duplicarlo entre `trello.js` y este módulo nuevo.
- **Regla de estado vacío** (importante, ver razón abajo): si el merge queda vacío, mostrar un solo mensaje positivo ("No te queda nada agendado por hoy 🎉") vía `renderEmptyState`. **No mostrar mensajes de "conectá Calendar"/"configurá Trello" acá** — esos prompts de setup quedan en sus secciones respectivas (Calendario, Trello), no en Hoy. Motivo: si Calendar no está conectado pero Trello sí tiene algo hoy, no tiene sentido interrumpir la lista real con un cartel de "conectá Calendar" — así que una fuente desconectada simplemente aporta 0 ítems al merge, sin mensaje.

### 2. `calendar.js`

- Importar `setTodayCalendarEvents` desde `./today-agenda.js`.
- En `loadCalendarEvents()`: donde hoy se manipula `todayEventsList` directamente (bloque `if (todayEventsList) {...}`, ~línea 302-316), reemplazar por `setTodayCalendarEvents(remainingToday)` (o `setTodayCalendarEvents([])` en los casos de error/no-token, en vez de `renderEmptyState(todayEventsList, {...})`).
- Eliminar la constante `const todayEventsList = document.getElementById('today-calendar-events-list');` (ya no existe ese id) y sus otros usos (líneas ~224, ~232-238, ~243, ~285).
- En `resetCalendarState()` (línea ~173-188): reemplazar el bloque que renderiza en `todayEventsList` por `setTodayCalendarEvents([])`.

### 3. `trello.js`

- Importar `setTodayTrelloCards` desde `./today-agenda.js`.
- En `cargarTareasTrello()`, donde hoy se llama `renderTareasList(todayTrelloTasksList, filteredCards.filter(card => isToday(card.due)), 'Nada de Trello vence hoy.')` (línea ~115), reemplazar por `setTodayTrelloCards(filteredCards.filter(card => isToday(card.due)), { openCard: (card) => window.open(card.shortUrl || boardUrl, '_blank') })`.
- Eliminar `const todayTrelloTasksList = document.getElementById('today-trello-tasks-list');` y su uso.
- La lista `#listaTareas` (sección Trello completa) sigue usando `renderTareasList` igual que antes — no tocar esa parte.

### 4. `index.html`

Reemplazar los dos bloques (líneas ~131-139):
```html
<div class="hoy-block">
  <h3>🗓️ Agenda de hoy</h3>
  <ul id="today-calendar-events-list" class="today-agenda-list"></ul>
</div>

<div class="hoy-block">
  <h3>📋 Trello de hoy</h3>
  <ul id="today-trello-tasks-list" class="today-agenda-list"></ul>
</div>
```
por uno solo:
```html
<div class="hoy-block">
  <h3>🗓️ Agenda de hoy</h3>
  <ul id="today-agenda-list" class="today-agenda-list"></ul>
</div>
```

### 5. `main.js` y `auth.js`

- Si `today-agenda.js` necesita algo en `main.js` (probablemente no, ya que no tiene `initX` — solo se importa donde haga falta), revisar si hace falta wiring adicional; si no, no tocar `main.js`.
- `auth.js` línea ~77 y ~84: cambiar `document.getElementById('today-trello-tasks-list')` por `document.getElementById('today-agenda-list')` en la limpieza de logout (ya no existe el id viejo).

## Criterio de aceptación

- Con Calendar y Trello configurados y con ítems hoy: aparecen todos mezclados en un solo `<ul>`, ordenados por hora, cada uno con su ícono de origen.
- Los ítems de Trello siguen siendo clickeables (mouse y teclado) y abren la tarjeta correcta.
- Sin nada agendado hoy (o ninguna de las dos fuentes conectada): un solo mensaje positivo, sin carteles de "conectá esto/configurá aquello" en Hoy.
- La sección Calendario (`#calendar-events-list`) y la sección Trello (`#listaTareas`) siguen funcionando exactamente igual que antes — este cambio es solo sobre los resúmenes de Hoy.
- Cerrar sesión y volver a entrar no deja datos de un usuario anterior en la agenda combinada.
