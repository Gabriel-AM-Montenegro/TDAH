# Plan — sumar técnicas a las 4 categorías existentes + 5ta categoría nueva

## Contexto

Contenido nuevo para `CONTENT`/`CATEGORIES` en `public/js/features/techniques.js` (ya implementado, estructura confirmada leyendo el archivo actual). Confirmado con el usuario: se suman técnicas a las 4 categorías existentes Y una 5ta categoría nueva. Sin cambios de Firestore; la 5ta categoría no necesita CSS nuevo (reusa `.tecnicas-cat-btn`/`.tecnica-card`/`.tecnica-action-btn` ya existentes).

Leer `CLAUDE.md` antes de tocar nada, como siempre.

## Cambios (agregar estos objetos al final del array `cards` correspondiente)

**`enorme`** (agregar 2):
```js
{ title: 'Empezá por la parte más fácil, no por el principio.', text: 'El cerebro no exige orden lógico para arrancar — elegir el paso que menos cuesta, aunque no sea "el primero", rompe la parálisis más rápido que forzarte a empezar por donde "corresponde".' },
{ title: 'Definí solo el próximo paso, no todo el plan.', text: 'Sobreplanificar antes de arrancar genera más carga que la tarea en sí. Alcanza con saber qué hacés en los próximos 15 minutos — el resto se decide después (mismo criterio que ya usa "Próximo paso" en Hoy).' },
```

**`aburrida`** (agregar 1, como 4ta card):
```js
{ title: 'Hacela acompañado (body doubling).', text: 'Tener a alguien cerca (en persona o por videollamada, sin que interactúe con vos) ayuda a sostener el foco en tareas tediosas — es de las técnicas con más evidencia real en TDAH, aunque suene raro que "funcione solo por estar alguien ahí".' },
```

**`evitando`** (agregar 2 — la card existente queda igual, sin título; estas sí llevan título, mismo criterio que `aburrida`):
```js
{ title: 'Nombrá lo que es, sin juzgarlo.', text: '"Esto es evitación, no pereza." Ponerle el nombre correcto saca la culpa de encima — la culpa agranda la evitación, no la resuelve.' },
{ title: 'Comprometete con alguien.', text: 'Decirle a otra persona "voy a hacer X a las Y" sube mucho la probabilidad real de arrancar — el compromiso externo pesa más que el interno acá.' },
```

**`energia`** (agregar 2):
```js
{ title: 'Chequeá lo básico antes de asumir que es falta de voluntad.', text: '¿Comiste? ¿Dormiste? ¿Tomaste agua? La energía ejecutiva depende de esto más de lo que parece.' },
{ title: 'Elegí por costo, no por importancia.', text: 'En un día de baja energía, hacer la tarea más liviana de la lista mantiene la sensación de progreso sin exigirte de más.' },
```

## Criterio de aceptación

Cada categoría muestra sus cards nuevas al elegirla, en el mismo orden que quedaron en el array, sin romper las cards existentes ni los botones de acción (`enorme` y `aburrida` los mantienen igual).

---

## 5ta categoría (confirmada) — "Tengo mil cosas y no sé por cuál arrancar"

Distinto de `enorme` (que es UNA tarea grande): acá el problema es prioridad entre varias tareas. No duplica lógica de priorización — manda a Hoy, que ya la resuelve (`next-step.js`).

**Agregar a `CATEGORIES`** (array al principio del archivo, después de la entrada `energia`):
```js
{ id: 'multiples', emoji: '🌪️', label: 'Tengo mil cosas y no sé por cuál arrancar' },
```

**Agregar a `CONTENT`** (objeto junto a las otras 4 entradas):
```js
multiples: {
    cards: [
        { title: 'No necesitás priorizar todo de una.', text: 'Cuando todo compite por tu atención a la vez, elegir se vuelve tan pesado como hacer la tarea. La vista de Hoy ya calcula un solo próximo paso por vos (tu primer MIT sin completar, o un hábito pendiente) — no hace falta que armes el orden completo en tu cabeza.' },
    ],
},
```

**Agregar el botón de acción** en `renderCategoryResult()` (`techniques.js`, junto a los `if (categoryId === 'enorme')` / `else if (categoryId === 'aburrida')` ya existentes — mismo patrón, un `else if` más):
```js
} else if (categoryId === 'multiples') {
    const goToHoyBtn = document.createElement('button');
    goToHoyBtn.type = 'button';
    goToHoyBtn.className = 'tecnica-action-btn';
    goToHoyBtn.textContent = 'Ver mi próximo paso';
    goToHoyBtn.onclick = () => mostrarSeccion('hoy');
    container.appendChild(goToHoyBtn);
}
```
`mostrarSeccion` ya está importado en `techniques.js` (se usa en `backBtn`/`divideTaskIntoSteps`), no hace falta agregar el import.

### Criterio de aceptación (5ta categoría)

Aparece como 5to botón en el picker de categorías, con el mismo estilo que las otras 4. Al elegirla, muestra la card y el botón "Ver mi próximo paso", que lleva a la sección Hoy sin romper el flujo de "‹ Elegir otra".
