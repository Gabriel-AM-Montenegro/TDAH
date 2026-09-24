// =================================================================================
// TÉCNICAS: elegís cómo te sentís con una tarea puntual y la app ofrece 2-3
// técnicas concretas para probar, con acciones reales sobre Pomodoro/Checklist
// cuando corresponde. Contenido fijo (como BREATHING_PATTERNS en breathing.js),
// sin colección propia en Firestore — por eso initTechniques() no recibe
// db/userId, solo actúa sobre otras features ya inicializadas.
// =================================================================================
import { startFocusOn } from './pomodoro.js';
import { showTempMessage, mostrarSeccion } from '../ui.js';

const CATEGORIES = [
    { id: 'enorme', emoji: '🏔️', label: 'Es enorme, no sé por dónde arrancar' },
    { id: 'aburrida', emoji: '🔁', label: 'Es aburrida o repetitiva' },
    { id: 'evitando', emoji: '🙈', label: 'La vengo evitando' },
    { id: 'energia', emoji: '🔋', label: 'No tengo energía hoy' },
    { id: 'multiples', emoji: '🌪️', label: 'Tengo mil cosas y no sé por cuál arrancar' },
];

const CONTENT = {
    enorme: {
        cards: [
            { title: 'Dividila en pasos chicos.', text: 'Una tarea grande abruma porque el cerebro no puede sostener el plan completo en la memoria de trabajo a la vez. Partirla en pasos de 5 a 15 minutos hace que cada paso sea manejable, aunque el total sea el mismo.' },
            { title: 'Empezá por la parte más fácil, no por el principio.', text: 'El cerebro no exige orden lógico para arrancar. Elegir el paso que menos cuesta, aunque no sea "el primero", rompe la parálisis más rápido que forzarte a empezar por donde "corresponde".' },
            { title: 'Definí solo el próximo paso, no todo el plan.', text: 'Sobreplanificar antes de arrancar genera más carga que la tarea en sí. Alcanza con saber qué hacés en los próximos 15 minutos, el resto se decide después (mismo criterio que ya usa "Próximo paso" en Hoy).' },
        ],
    },
    aburrida: {
        intro: 'Con altas capacidades, esto pasa porque el patrón de la tarea ya se resolvió mentalmente antes de terminarla en la práctica. No hay nada nuevo ahí para el cerebro. Tres cosas que ayudan:',
        cards: [
            { title: 'Agrupala con otras tareas parecidas en un solo bloque', text: 'Así el aburrimiento aparece una vez, no cada vez que la hacés.' },
            { title: 'Agregale una restricción propia', text: 'Un límite de tiempo, o hacerla distinto a como la hacés siempre.' },
            { title: 'Combinala con algo que sí te estimule', text: 'Un podcast, música, mientras la hacés (esto ayuda a algunas personas y a otras las satura; probar y ver).' },
            { title: 'Hacela acompañado (body doubling).', text: 'Tener a alguien cerca, en persona o por videollamada, sin que interactúe con vos, ayuda a sostener el foco en tareas tediosas. Es de las técnicas con más evidencia real en TDAH, aunque suene raro que "funcione solo por estar alguien ahí".' },
        ],
    },
    evitando: {
        cards: [
            { text: 'Cuanto más tiempo pasa, más grande se siente en la cabeza. No es que la tarea haya cambiado, es que evitarla la convirtió en una fuente de culpa además de la tarea en sí. El primer paso no tiene que ser "hacerla": puede ser solo abrirla, mirarla 2 minutos, y decidir después si seguís.' },
            { title: 'Nombrá lo que es, sin juzgarlo.', text: '"Esto es evitación, no pereza." Ponerle el nombre correcto saca la culpa de encima: la culpa agranda la evitación, no la resuelve.' },
            { title: 'Comprometete con alguien.', text: 'Decirle a otra persona "voy a hacer X a las Y" sube mucho la probabilidad real de arrancar. El compromiso externo pesa más que el interno acá.' },
        ],
    },
    energia: {
        cards: [
            { text: 'Está bien que hoy la versión de la tarea sea la mínima posible, no la ideal. Hacer un 20% de algo sigue siendo más que no hacer nada, y mañana se retoma con más energía. No es indisciplina: la energía ejecutiva varía día a día, igual que ya se dice en Pomodoro sobre ajustar los tiempos de foco y descanso.' },
            { title: 'Chequeá lo básico antes de asumir que es falta de voluntad.', text: '¿Comiste? ¿Dormiste? ¿Tomaste agua? La energía ejecutiva depende de esto más de lo que parece.' },
            { title: 'Elegí por costo, no por importancia.', text: 'En un día de baja energía, hacer la tarea más liviana de la lista mantiene la sensación de progreso sin exigirte de más.' },
        ],
    },
    multiples: {
        cards: [
            { title: 'No necesitás priorizar todo de una.', text: 'Cuando todo compite por tu atención a la vez, elegir se vuelve tan pesado como hacer la tarea. La vista de Hoy ya calcula un solo próximo paso por vos (tu primer MIT sin completar, o un hábito pendiente): no hace falta que armes el orden completo en tu cabeza.' },
        ],
    },
};

// El Checklist re-renderiza su <ul> entera en cada onSnapshot (async), así que
// el <li> del ítem recién creado no existe todavía en el momento del click —
// reintenta por un rato corto hasta que aparezca.
function waitForChecklistItem(text, callback, attemptsLeft = 30) {
    const checkListUl = document.getElementById('checkList');
    if (!checkListUl) return;
    const items = checkListUl.querySelectorAll('li[data-id]');
    for (let i = items.length - 1; i >= 0; i--) {
        const textSpan = items[i].querySelector('.item-text');
        if (textSpan && textSpan.textContent === text) {
            callback(items[i]);
            return;
        }
    }
    if (attemptsLeft > 0) {
        setTimeout(() => waitForChecklistItem(text, callback, attemptsLeft - 1), 100);
    }
}

function focusSubtaskInput(li) {
    const detailsBtn = li.querySelector('.details-toggle-btn');
    if (detailsBtn && !li.classList.contains('expanded')) detailsBtn.click();
    const subtaskInput = li.querySelector('.subtask-input');
    if (subtaskInput) subtaskInput.focus();
}

// Reusa el input/botón real del Checklist (mismo addDoc de siempre, vía
// checklist.js) en vez de escribir en Firestore acá — por eso esta feature no
// necesita su propia referencia a db/userId.
function divideTaskIntoSteps(taskName) {
    const checkItemInput = document.getElementById('checkItem');
    const addCheckItemBtn = document.getElementById('add-check-item-btn');
    if (!checkItemInput || !addCheckItemBtn) return;

    checkItemInput.value = taskName;
    addCheckItemBtn.click();
    showTempMessage('Tarea agregada al Checklist.', 'success');

    // La sección Checklist está oculta (display:none) mientras se ve Técnicas
    // — un elemento sin caja de layout no puede recibir foco, así que hay que
    // llevar a la persona ahí para que el foco (y ver el panel abierto) sea
    // real, no solo un cambio de clase invisible.
    mostrarSeccion('checklist');

    // El onSnapshot del Checklist puede re-renderizar más de una vez para el
    // mismo cambio (dato optimista de caché, después confirmación real del
    // servidor) — cada re-render reconstruye los <li> desde cero, así que un
    // solo focus() se puede perder si llega justo antes del segundo render.
    // Reaplicar un par de veces más cubre esa carrera sin depender de un
    // timing exacto.
    const reapply = (checksLeft) => {
        waitForChecklistItem(taskName, (li) => {
            focusSubtaskInput(li);
            if (checksLeft > 0) setTimeout(() => reapply(checksLeft - 1), 300);
        });
    };
    reapply(3);
}

function renderCard(container, card) {
    const div = document.createElement('div');
    div.className = 'tecnica-card';
    if (card.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'tecnica-card-title';
        titleEl.textContent = card.title;
        div.appendChild(titleEl);
    }
    const textEl = document.createElement('div');
    textEl.className = 'tecnica-card-text';
    textEl.textContent = card.text;
    div.appendChild(textEl);
    container.appendChild(div);
}

function renderCategoryResult(container, categoryId) {
    container.innerHTML = '';
    const content = CONTENT[categoryId];
    if (!content) return;

    const category = CATEGORIES.find(cat => cat.id === categoryId);
    if (category) {
        const titleEl = document.createElement('p');
        titleEl.className = 'tecnicas-category-title';
        titleEl.textContent = `${category.emoji} ${category.label}`;
        container.appendChild(titleEl);
    }

    if (content.intro) {
        const introEl = document.createElement('p');
        introEl.className = 'tecnicas-intro';
        introEl.textContent = content.intro;
        container.appendChild(introEl);
    }

    content.cards.forEach(card => renderCard(container, card));

    if (categoryId === 'enorme') {
        const divideBtn = document.createElement('button');
        divideBtn.type = 'button';
        divideBtn.className = 'tecnica-action-btn';
        divideBtn.textContent = 'Dividir una tarea ahora';

        const form = document.createElement('div');
        form.className = 'tecnicas-divide-form';
        form.hidden = true;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Nombre de la tarea grande...';

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.textContent = 'Crear y dividir en pasos';
        confirmBtn.onclick = () => {
            const taskName = input.value.trim();
            if (!taskName) return;
            divideTaskIntoSteps(taskName);
            input.value = '';
            form.hidden = true;
        };

        form.appendChild(input);
        form.appendChild(confirmBtn);

        divideBtn.onclick = () => {
            form.hidden = !form.hidden;
            if (!form.hidden) input.focus();
        };

        container.appendChild(divideBtn);
        container.appendChild(form);
    } else if (categoryId === 'aburrida') {
        const focusBtn = document.createElement('button');
        focusBtn.type = 'button';
        focusBtn.className = 'tecnica-action-btn';
        focusBtn.textContent = 'Empezar un bloque de enfoque';
        focusBtn.onclick = () => {
            startFocusOn('Tareas repetitivas');
            mostrarSeccion('hoy');
        };
        container.appendChild(focusBtn);
    } else if (categoryId === 'multiples') {
        const goToHoyBtn = document.createElement('button');
        goToHoyBtn.type = 'button';
        goToHoyBtn.className = 'tecnica-action-btn';
        goToHoyBtn.textContent = 'Ver mi próximo paso';
        goToHoyBtn.onclick = () => mostrarSeccion('hoy');
        container.appendChild(goToHoyBtn);
    }
}

export function initTechniques() {
    const picker = document.getElementById('tecnicas-picker');
    const categoriesContainer = document.getElementById('tecnicas-categories');
    const result = document.getElementById('tecnicas-result');
    const cardsContainer = document.getElementById('tecnicas-cards');
    const backBtn = document.getElementById('tecnicas-back-btn');
    if (!picker || !categoriesContainer || !result || !cardsContainer || !backBtn) return;

    categoriesContainer.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tecnicas-cat-btn';

        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'tecnicas-cat-emoji';
        emojiSpan.textContent = cat.emoji;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = cat.label;

        btn.appendChild(emojiSpan);
        btn.appendChild(labelSpan);
        btn.onclick = () => {
            renderCategoryResult(cardsContainer, cat.id);
            picker.hidden = true;
            result.hidden = false;
        };
        categoriesContainer.appendChild(btn);
    });

    backBtn.onclick = () => {
        result.hidden = true;
        picker.hidden = false;
    };
}
