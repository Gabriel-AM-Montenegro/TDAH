# Plan — "Técnicas" interactivas (elegís cómo te sentís, te ofrece qué probar)

## Contexto

Idea del usuario: en vez de un artículo para leer (como Blog/Nutrición), algo interactivo — elegís cómo te sentís respecto a una tarea puntual, y la app te ofrece 2-3 técnicas concretas para probar, con acciones reales cuando se puede (no solo texto).

Nota clínica para quien redacte/ajuste el copy: el guion que motivó esto (aburrimiento a los 10 minutos de una tarea repetitiva) describe un mecanismo de **altas capacidades** — el cerebro reconoce el patrón de la tarea más rápido de lo normal y "la termina" cognitivamente antes de que termine en la realidad —, distinto del aburrimiento típico de TDAH (más ligado a dopamina basal baja que a velocidad de procesamiento). Se parecen en el síntoma, no en la causa. El copy de la categoría "aburrida/repetitiva" de abajo ya está redactado teniendo esto en cuenta.

Leer `CLAUDE.md` antes de empezar. **Esta feature no necesita Firestore ni cambios en `firestore.rules`** — el contenido (categorías y técnicas) es fijo, como `BREATHING_PATTERNS` en `breathing.js`, no datos de usuario. Eso simplifica mucho el trabajo comparado con el plan de Garage de Ideas.

## Flujo

1. La sección arranca con una pregunta: **"¿Cómo te sentís con la tarea que tenés que hacer?"** + 4 botones (una sola elección, no checkboxes):
   - 🏔️ **Es enorme, no sé por dónde arrancar**
   - 🔁 **Es aburrida o repetitiva**
   - 🙈 **La vengo evitando**
   - 🔋 **No tengo energía hoy**
2. Al elegir una, aparecen las técnicas de esa categoría (2-3 tarjetas: título corto + explicación de 1-2 oraciones + botón de acción cuando corresponde).
3. Se puede volver a elegir otra categoría sin recargar la página (botón "‹ Elegir otra" arriba de las tarjetas).

Cap de 4 categorías a propósito — más opciones acá es contraproducente (es exactamente el tipo de decisión de más que la sección busca evitarle a la persona).

## Contenido (copy ya redactado, usar tal cual)

### 🏔️ Es enorme, no sé por dónde arrancar
**Dividila en pasos chicos.** Una tarea grande abruma porque el cerebro no puede sostener el plan completo en la memoria de trabajo a la vez — partirla en pasos de 5-15 minutos cada uno hace que cada paso individual sea manejable, aunque el total sea el mismo.
→ Botón: **"Dividir una tarea ahora"** — abre un mini-formulario (pide el nombre de la tarea grande), crea un ítem nuevo en el Checklist con ese texto, y abre directamente su panel de "Detalles" con el foco puesto en el campo de subtareas — para que la persona empiece a listar los pasos ahí mismo, sin tener que ir a buscar el ítem después.

### 🔁 Es aburrida o repetitiva
Con altas capacidades, esto pasa porque el patrón de la tarea ya se resolvió mentalmente antes de terminarla en la práctica — no hay nada nuevo para el cerebro ahí. Tres cosas que ayudan:
- **Agrupala con otras tareas parecidas en un solo bloque** — así el aburrimiento aparece una vez, no cada vez que la hacés.
- **Agregale una restricción propia** — un límite de tiempo, o hacerla distinto a como la hacés siempre.
- **Combinala con algo que sí te estimule** — un podcast, música — mientras la hacés (esto ayuda a algunas personas y a otras las satura; probar y ver).
→ Botón: **"Empezar un bloque de enfoque"** — arranca el Pomodoro con el foco puesto en "Tareas repetitivas" (reusa `startFocusOn()`, ver más abajo).

### 🙈 La vengo evitando
Cuanto más tiempo pasa, más grande se siente en la cabeza — no porque la tarea haya cambiado, sino porque evitarla la convirtió en una fuente de culpa además de la tarea en sí. El primer paso no tiene que ser "hacerla" — puede ser solo abrirla, mirarla 2 minutos, y decidir después si seguís.
→ Sin botón de acción en la v1 (contenido solamente) — si más adelante se quiere una acción, la más natural es un Pomodoro de foco corto (5 minutos) en vez de los 25 de siempre, para bajar la barrera de entrada; eso requiere que Pomodoro permita un foco corto puntual sin cambiar la configuración guardada — dejarlo para una iteración futura, no meterlo en esta.

### 🔋 No tengo energía hoy
Está bien que hoy la versión de la tarea sea la mínima posible, no la ideal. Hacer un 20% de algo sigue siendo más que no hacer nada, y mañana con más energía se retoma. No es indisciplina, es que la energía ejecutiva varía día a día — igual que ya se dice en Pomodoro sobre ajustar los tiempos de foco/descanso.
→ Sin botón de acción — es contenido de autocompasión, no una acción con la que integrarse.

## Integración con features existentes (ya existen, no hay que crear nada nuevo del lado de Pomodoro/Checklist)

- **`startFocusOn(text)`** ya está exportado desde `public/js/features/pomodoro.js` (lo usa hoy `checklist.js` y `next-step.js` para "Enfocarme ahora" en un MIT/hábito) — el botón de la categoría "aburrida" solo necesita importarlo y llamarlo.
- **Subtareas de Checklist**: ya existen (`item-details-panel`, `subtask-input`, `add-subtask-btn` en `checklist.js`) — el botón de "dividir en pasos" no necesita reinventar la UI de subtareas, solo: crear el ítem (mismo `addDoc` de siempre), después ubicar ese `<li>` en el DOM (`checkListUl.querySelector('[data-id="..."]')`), simular el click en su botón de "Detalles" para abrir el panel, y poner el foco en su `.subtask-input`. Puede hacer falta esperar al próximo render del `onSnapshot` del Checklist (que es async) antes de que el `<li>` exista en el DOM — revisar el timing al implementar.

## Archivos a tocar

- **Nuevo**: `public/js/features/techniques.js` (`initTechniques()` — no necesita `db`/`userId`, es contenido fijo + acciones sobre otras features ya inicializadas).
- `public/index.html`: nueva sección `#tecnicas` + botón de nav (recomiendo grupo "Reflexionar", junto a Journal/Respiración — es una herramienta de autorregulación, no de organización pura; ajustable).
- `public/js/ui.js`: agregar `tecnicas: 'Técnicas'` a `SECTION_TITLES`.
- `public/js/main.js`: importar y llamar `initTechniques()`.

## Criterios de aceptación

- Elegir una categoría muestra sus técnicas sin recargar la página; "‹ Elegir otra" vuelve a las 4 opciones.
- El botón de la categoría "enorme" crea el ítem en Checklist y deja el campo de subtareas listo para escribir, sin que la persona tenga que buscarlo.
- El botón de la categoría "aburrida" arranca el Pomodoro igual que ya lo hace "Enfocarme ahora" en otros lados de la app.
- Las categorías "evitando" y "sin energía" muestran su contenido, sin botón de acción (a propósito, ver nota de la sección "evitando" sobre por qué queda para después).
