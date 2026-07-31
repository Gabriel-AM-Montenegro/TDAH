// =================================================================================
// VISTA HOY: bloque "Próximo paso" (Fase 5 del plan UX ADHD)
//
// Cruza el estado de MITs (checklist.js) y Hábitos (habits.js), que llegan acá
// vía setMitsState()/setHabitsState() cada vez que sus propios onSnapshot
// disparan — sin queries nuevas a Firestore. Prioridad: 1) primer MIT sin
// completar, 2) primer hábito de hoy sin marcar, 3) refuerzo positivo.
// =================================================================================
import { startFocusOn } from './pomodoro.js';
import { mostrarSeccion } from '../ui.js';

let latestMits = [];
let latestHabits = { total: 0, firstIncomplete: null };

function renderCard(message, actions = []) {
    const container = document.getElementById('today-next-step');
    if (!container) return;

    container.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'next-step-card';

    const p = document.createElement('p');
    p.textContent = message;
    card.appendChild(p);

    actions.forEach(({ label, onAction }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.onclick = onAction;
        card.appendChild(btn);
    });

    container.appendChild(card);
}

function render() {
    if (latestMits.length) {
        const next = latestMits[0];
        renderCard(`👉 Próximo paso: ${next.text}`, [
            { label: '▶ Enfocarme ahora', onAction: () => startFocusOn(next.text) }
        ]);
        return;
    }

    if (latestHabits.firstIncomplete) {
        const habitName = latestHabits.firstIncomplete.name;
        renderCard(`👉 Próximo paso: marcar el hábito "${habitName}"`, [
            { label: '🌱 Ir a Hábitos', onAction: () => mostrarSeccion('habitos') },
            { label: '▶ Enfocarme ahora', onAction: () => startFocusOn(habitName) }
        ]);
        return;
    }

    if (!latestHabits.total) {
        renderCard('Definí tus MITs o tus hábitos para ver acá tu próximo paso.');
        return;
    }

    renderCard('Ya hiciste lo importante hoy 🎉');
}

export function setMitsState(mitItems) {
    latestMits = mitItems;
    render();
}

export function setHabitsState(habits, todayString) {
    const firstIncomplete = habits.find(h => !h.dailyCompletions?.[todayString]);
    latestHabits = {
        total: habits.length,
        firstIncomplete: firstIncomplete ? { id: firstIncomplete.id, name: firstIncomplete.name } : null
    };
    render();
}
