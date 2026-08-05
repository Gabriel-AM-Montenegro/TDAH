# Plan de optimización — Trello y Checklist

## Contexto (leer antes de empezar)

- Este plan surge de una revisión de rendimiento/accesibilidad sobre el código actual, no de un plan de features nuevo. Los 4 ítems son fixes puntuales y acotados — no requieren rediseñar nada, solo cambiar CÓMO se hace algo que ya funciona.
- **Leé `CLAUDE.md` primero** para las convenciones del repo y el estado actual completo de la app.
- Los 4 ítems son independientes entre sí. Verificá cada uno en el navegador (contra el emulador, no producción) antes de pasar al siguiente.
- Hay una decisión abierta al final (ítem 5) que **no se debe implementar sin confirmar con el usuario primero** — está separada a propósito de los 4 fixes de arriba.

---

### Ítem 1 — Paralelizar los fetch de listas de Trello

**Archivo**: `public/js/features/trello.js`, función `cargarTareasTrello()` (líneas ~93-121).

- Hoy: `for (const list of lists) { const cardsResponse = await fetch(...); ... }` (líneas ~99-103) — un round-trip a la API de Trello por cada lista del tablero, en serie. Con un tablero de N listas, la carga tarda N veces más de lo necesario.
- Cambiar a `Promise.all`: mapear `lists` a un array de promesas (`fetch` + `.json()`), esperar todas juntas, y despues aplanar (`.flat()` o `.concat(...)`) el resultado en `allCards`.
- **Criterio de aceptación**: con un tablero de prueba de 2+ listas, las tarjetas siguen apareciendo correctas en Trello/Hoy, pero la carga es visiblemente más rápida (o al menos ya no escala linealmente con la cantidad de listas). Sin cambios en el filtrado ni en la sincronización posterior.

### Ítem 2 — Batch para importar tarjetas de Trello al Checklist

**Archivo**: `public/js/features/trello.js`, función `syncTrelloCardsToChecklist()` (líneas ~54-79).

- Hoy: `for (const card of newCards) { await addDoc(checklistCollectionRef, {...}); }` (línea ~65) — una escritura de red por tarjeta nueva.
- Cambiar a `writeBatch(db)` (ya importado en `checklist.js` para el drag-reorder, mismo patrón a reusar acá): generar un `doc(checklistCollectionRef)` por cada card nueva, `batch.set(...)`, y un solo `batch.commit()` al final.
- Ojo: `nextPosition` se sigue calculando igual (incrementando por cada card antes de armar el batch), no cambia esa lógica — solo cómo se escribe.
- **Criterio de aceptación**: importar 3+ tarjetas nuevas de una sola vez sigue asignando posiciones correlativas correctas y no duplica tarjetas ya importadas (`trelloCardId`) tras recargar.

### Ítem 3 — Evitar una lectura completa de Firestore al tildar "MIT"

**Archivo**: `public/js/features/checklist.js`, handler de `mit-checkbox` (líneas ~286-295) + declaración de estado (cerca de línea ~31, junto a `activeItemsForReminders`).

- Hoy: cada vez que el usuario tilda el checkbox "MIT" de un ítem, se hace `await getDocs(query(checklistCollectionRef))` (línea ~288) — trae TODA la colección solo para contar cuántos ítems tienen `isMIT: true`. Se dispara en cada click, no solo ocasionalmente.
- El dato ya existe en memoria: dentro del `onSnapshot` (línea ~82 en adelante) ya se arma `mitItems` (los MITs activos, tope 3) en cada render (línea ~117-119). Agregar una variable de estado a nivel de `initChecklist` (mismo patrón que `activeItemsForReminders`, línea ~31), ej. `let currentMitCount = 0;`, actualizada en cada render del `onSnapshot` con `mitItems.length`, y usar esa variable en el handler de `mit-checkbox` en vez de `getDocs(...)`.
- **Criterio de aceptación**: seguir sin poder marcar más de 3 MITs a la vez (mismo mensaje de advertencia), pero sin la consulta a Firestore de por medio — confirmable viendo que ya no aparece esa llamada de red al tildar (Network tab del navegador).

### Ítem 4 — Accesibilidad por teclado en las tareas de Trello clickeables

**Archivo**: `public/js/features/trello.js`, función `renderTareasList()` (líneas ~35-49), `public/css/styles1.css` (regla `.trello-task-item`, agregada en el commit "Trello: click en la tarea abre la tarjeta...").

- Hoy: el `<li class="trello-task-item">` (usado tanto en la sección Trello como en el bloque "Trello de hoy") solo tiene `li.onclick = () => window.open(...)` y `cursor: pointer` en CSS — no es alcanzable ni activable por teclado, y no tiene ningún rol semántico que indique que es interactivo.
- Agregar `li.setAttribute('tabindex', '0')`, `li.setAttribute('role', 'button')`, y un listener de `keydown` que dispare la misma acción con `Enter` o `Espacio` (mismo criterio de accesibilidad ya aplicado en otras partes de la app — revisar si hay un helper compartido antes de escribir uno nuevo).
- Verificar que `:focus-visible` ya tenga un estilo visible en `styles1.css` (la app ya tiene una regla `a:focus-visible` cerca de la línea 1604) — si no cubre `li[role="button"]`, extenderla.
- **Criterio de aceptación**: se puede llegar a una tarea de Trello con Tab y abrirla con Enter o Espacio, tanto en la sección Trello como en el bloque de Hoy. El click con mouse sigue funcionando igual.

---

### Ítem 5 (NO implementar sin confirmar antes) — ¿"Esta semana" debería incluir el fin de semana?

**Archivo**: `public/js/features/trello.js`, función `cargarTareasTrello()` (líneas ~104-110).

- Hoy el rango es lunes a viernes (`monday`/`friday`). Una tarjeta de Trello que vence sábado o domingo no aparece nunca en la sección Trello, no aparece en Hoy, y **tampoco se importa al Checklist** — queda invisible sin aviso.
- Puede ser intencional (semana laboral) o un descuido que antes no importaba (cuando Trello era de solo lectura) y ahora sí importa (porque alimenta el Checklist automáticamente).
- **No cambiar esto sin que el usuario confirme explícitamente** si quiere lunes-domingo o mantener lunes-viernes. Si confirma el cambio: extender `friday` a domingo (`monday.getDate() + 6`, ajustar el nombre de la variable y el mensaje vacío que dice "esta semana").

---

**Orden sugerido**: Ítem 3 (más chico, un solo archivo) → Ítem 4 (aislado) → Ítem 1 → Ítem 2 (estos dos tocan las mismas funciones de `trello.js`, hacerlos en el mismo pase evita tocar el archivo dos veces). Ítem 5 solo si el usuario ya confirmó qué quiere.
