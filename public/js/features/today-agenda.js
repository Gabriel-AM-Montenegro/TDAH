// =================================================================================
// AGENDA UNIFICADA DE HOY: combina eventos de Google Calendar, Outlook
// Calendar y tarjetas de Trello que vencen hoy en una sola lista ordenada
// por hora, en #today-agenda-list. Mismo patrón que next-step.js: sin
// initX() propio ni ref de Firestore propia — calendar.js/outlook-
// calendar.js/trello.js empujan su último estado acá desde sus propios
// onSnapshot/fetch ya activos.
// =================================================================================
import { renderEmptyState, makeClickable } from '../ui.js';

const SOURCE_ICONS = { calendar: '📅', outlook: '📆', trello: '📋' };

// Microsoft Graph devuelve las fechas sin sufijo de zona horaria cuando se
// pide un timezone explícito (ver outlook-calendar.js, Prefer: outlook.
// timezone="UTC") — hay que agregarle "Z" a mano, si no Date la interpreta
// como hora local.
function parseGraphDateTime(dateTimeStr) {
    return new Date(dateTimeStr.endsWith('Z') ? dateTimeStr : `${dateTimeStr}Z`);
}

let latestCalendarEvents = [];
let latestOutlookEvents = [];
let latestTrelloCards = [];

export function setTodayCalendarEvents(events) {
    latestCalendarEvents = events.map(event => ({
        time: new Date(event.start.dateTime || event.start.date),
        label: event.summary || '(Sin título)',
        source: 'calendar',
    }));
    render();
}

export function setTodayOutlookEvents(events) {
    latestOutlookEvents = events.map(event => ({
        time: parseGraphDateTime(event.start.dateTime),
        label: event.subject || '(Sin título)',
        source: 'outlook',
    }));
    render();
}

// Limpia las tres fuentes a la vez (logout) — setTodayCalendarEvents([])
// sola no alcanza porque dejaría intactas las otras dos.
export function resetTodayAgenda() {
    latestCalendarEvents = [];
    latestOutlookEvents = [];
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

    const items = [...latestCalendarEvents, ...latestOutlookEvents, ...latestTrelloCards].sort((a, b) => a.time - b.time);

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
        const icon = SOURCE_ICONS[item.source] || '📅';
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
