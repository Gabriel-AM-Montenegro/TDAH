# Plan — "Garage de Ideas"

## Contexto

Pedido de un consultor de neuroinclusión que vio NeuroKit: un lugar para volcar cualquier idea apenas aparece, separado del Checklist (que es para tareas a hacer), para después decidir si se "ataca" o no. Fundamento clínico (para el copy de la sección, no solo referencia): capturar una idea libera memoria de trabajo — mientras el cerebro "recuerda que tiene que acordarse", compite por los mismos recursos atencionales que la tarea en curso. Es el mismo mecanismo que ya usa la app en otros lados (ej. "Próximo paso" en Hoy: sacarle una decisión a la persona en el momento).

**Regla de diseño no negociable**: la fricción de captura tiene que ser casi cero. Un campo de texto y guardar — nada de categoría/prioridad/tag obligatorio al escribir la idea. Si eso se le pide al usuario en el momento, dejan de usarlo.

Leer `CLAUDE.md` antes de empezar (estado actual completo de la app, convenciones del repo).

## Dato importante de seguridad (ya cambió desde planes anteriores)

`firestore.rules` **ya no es fail-open** — desde la auditoría de seguridad del 2026-09-16, cada colección bajo `users/{userId}` necesita su propia regla explícita con validación de tipos, o queda **denegada por default**. Este plan incluye la regla nueva que hace falta agregar (ver más abajo) — sin eso, guardar una idea va a tirar "permission denied".

## Datos: nueva colección `ideas`

`artifacts/{publicDataDocId}/users/{userId}/ideas/{ideaId}`:
```js
{ text: string, timestamp: string (ISO), status: 'nueva' | 'atacada' }
```
- `status` siempre se escribe (default `'nueva'` al crear) — no hace falta un estado intermedio "en revisión" para la v1, simplifica bastante y se puede agregar después si hace falta.
- Mismo patrón que `checklistItems`/`habits`: `timestamp` como string ISO, no `serverTimestamp()`.

**Agregar a `firestore.rules`** (mismo bloque `match /artifacts/{appId}/users/{userId}`, junto a las demás colecciones):
```js
function isValidIdea(data) {
  return data.keys().hasOnly(['text', 'timestamp', 'status'])
    && (!('text' in data) || (data.text is string && data.text.size() > 0 && data.text.size() <= 2000))
    && (!('timestamp' in data) || data.timestamp is string)
    && (!('status' in data) || data.status in ['nueva', 'atacada']);
}

function isValidIdeaCreate(data) {
  return data.keys().hasAll(['text', 'timestamp', 'status'])
    && isValidIdea(data);
}
```
```js
match /ideas/{ideaId} {
  allow read, delete: if isOwner();
  allow create: if isOwner() && isValidIdeaCreate(request.resource.data);
  allow update: if isOwner() && isValidIdea(request.resource.data);
}
```

**Además**, la promoción a Checklist agrega un campo nuevo a `checklistItems` (`ideaId`, para trazabilidad — mismo criterio que `trelloCardId`). Hay que sumar `'ideaId'` a la lista de `hasOnly` en `isValidChecklistItemFields` (`firestore.rules`, función ya existente) — si no, promover una idea va a fallar la validación.

## UI

**Nueva sección `#garage-ideas`** (nav: recomiendo grupo "Organizar", junto a Checklist — las ideas terminan siendo tareas; es una sugerencia, no una restricción, se puede mover a "Reflexionar" si se prefiere ese lado).

Copy exacto para el encabezado (ya redactado, usar tal cual o ajustar el tono si hace falta):
```
🧰 Garage de Ideas
Anotá cualquier idea apenas se te ocurra, sin compromiso de hacerla ya. Guardarla acá le saca a tu cabeza el trabajo de "no te olvides de esto" — así podés seguir con lo que estabas haciendo, y volver a esta idea cuando quieras, con la cabeza despejada.
```

**Captura**: un `<input type="text">` + botón "➕ Guardar idea" — nada más. Al guardar, limpia el campo y listo (mismo patrón que agregar un ítem del Checklist).

**Lista de ideas** (`orderBy('timestamp', 'desc')`, mismo patrón `onSnapshot` que el resto de la app):
- Ideas con `status: 'nueva'` arriba, ideas `'atacada'` colapsadas en una sección aparte más abajo ("Ya atacadas", plegable) — no se borran solas, para no perder el registro de qué se logró convertir en acción (visibilidad de progreso).
- Cada ítem "nueva" tiene dos acciones:
  - **"→ Pasar al Checklist"**: crea un ítem nuevo en `checklistItems` (`addDoc`, mismos 5 campos que ya usa `checklist.js`/`trello.js`: `text: idea.text, completed: false, isMIT: false, timestamp: new Date().toISOString(), position: nextPosition`, más `ideaId: idea.id`), y actualiza la idea a `status: 'atacada'` (`updateDoc`, no se borra). Mensaje de confirmación corto (`showTempMessage`, mismo patrón del resto de la app): `"Idea agregada al Checklist."`.
  - **"🗑 Descartar"**: `deleteDoc` directo, con el mismo `showCustomConfirm` que ya usa el resto de la app para borrados (`"¿Descartar esta idea?"`).
- Estado vacío (`renderEmptyState`, ya existe en `ui.js`): `"Todavía no anotaste ninguna idea. La próxima vez que se te ocurra algo, escribila acá antes de que se te escape."`.

## Archivos a tocar (para quien lo implemente)

- **Nuevo**: `public/js/features/ideas.js` (`initIdeas(db, userId)`, mismo patrón `initX` que el resto de features).
- `public/index.html`: nueva sección + botón de nav.
- `public/js/ui.js`: agregar `garage-ideas: 'Garage de Ideas'` a `SECTION_TITLES`.
- `public/js/main.js`: importar y llamar `initIdeas(db, currentUserId)`.
- `firestore.rules`: la función + regla de arriba, y el campo `ideaId` sumado a `isValidChecklistItemFields`.

## Criterios de aceptación

- Escribir una idea y guardarla no pide nada más que el texto.
- "Pasar al Checklist" crea el ítem, y la idea original queda marcada como atacada (no desaparece).
- Con las reglas de Firestore actualizadas, todo lo de arriba funciona sin "permission denied" — probarlo específicamente, es el error más probable si se olvida ese paso.
