// =================================================================================
// AGENDA UNIFICADA DE HOY: combina eventos de Google Calendar y tarjetas de
// Trello que vencen hoy en una sola lista ordenada por hora, en
// #today-agenda-list. Mismo patrón que next-step.js: sin initX() propio ni
// ref de Firestore propia — calendar.js y trello.js empujan su último estado
// acá desde sus propios onSnapshot/fetch ya activos.
// =================================================================================
import { renderEmptyState, makeClickable } from '../ui.js';

let latestCalendarEvents = [];
let latestTrelloCards = [];

export function setTodayCalendarEvents(events) {
    latestCalendarEvents = events.map(event => ({
        time: new Date(event.start.dateTime || event.start.date),
        label: event.summary || '(Sin título)',
        source: 'calendar',
    }));
    render();
}

// Limpia ambas fuentes a la vez (logout) — setTodayCalendarEvents([]) solo
// no alcanza porque dejaría intactas las tarjetas de Trello ya cargadas.
export function resetTodayAgenda() {
    latestCalendarEvents = [];
    latestTrelloCards = [];
    render();
}

export function setTodayTrelloCards(cards, { openCard } = {}) {
    latestTrelloCards = cards.map(card => ({
        time: new Date(card.due),
        label: card.name,
        source: 'trello',
        onClick: () => openCard(card),
    }));
    render();
}

function render() {
    const container = document.getElementById('today-agenda-list');
    if (!container) return;

    const items = [...latestCalendarEvents, ...latestTrelloCards].sort((a, b) => a.time - b.time);

    // Sin ítems (nada agendado, o ninguna fuente conectada): un solo mensaje
    // positivo. Los carteles de "conectá Calendar"/"configurá Trello" quedan
    // en sus secciones respectivas, no acá — una fuente desconectada
    // simplemente no aporta ítems al merge.
    if (!items.length) {
        renderEmptyState(container, { message: 'No te queda nada agendado por hoy 🎉' });
        return;
    }

    container.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'calendar-event';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        const icon = item.source === 'calendar' ? '📅' : '📋';
        timeSpan.textContent = `${icon} ${item.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

        const summarySpan = document.createElement('span');
        summarySpan.className = 'event-summary';
        summarySpan.textContent = item.label;

        li.appendChild(timeSpan);
        li.appendChild(summarySpan);

        if (item.onClick) {
            li.classList.add('trello-task-item');
            makeClickable(li, item.onClick);
        }

        container.appendChild(li);
    });
}
