// =================================================================================
// GOOGLE CALENDAR: estado de conexión y carga de eventos
// =================================================================================
import { showTempMessage } from '../ui.js';

export const CALENDAR_API_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const CALENDAR_TOKEN_STORAGE_KEY = 'calendarAccessToken';

let calendarAccessToken = null;

export function hasCalendarAccessToken() {
    return !!calendarAccessToken;
}

export function wireCalendarButtons() {
    const connectBtn = document.getElementById('connect-calendar-btn');
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.onclick = () => {
            if (!hasCalendarAccessToken()) {
                showTempMessage(
                    'Primero inicia sesión con Google usando el botón "Iniciar con Google" en la parte superior.',
                    'warning'
                );
                return;
            }
            updateCalendarConnectionStatus(true);
            loadCalendarEvents();
            showTempMessage('Cargando eventos de Google Calendar...', 'info');
        };
    }

    const disconnectBtn = document.getElementById('disconnect-calendar-btn');
    if (disconnectBtn) {
        disconnectBtn.onclick = handleDisconnectCalendar;
    }
}

export function setCalendarAccessToken(token) {
    calendarAccessToken = token;
    localStorage.setItem(CALENDAR_TOKEN_STORAGE_KEY, token);
}

export function restoreCalendarToken() {
    const storedToken = localStorage.getItem(CALENDAR_TOKEN_STORAGE_KEY);
    if (storedToken) {
        calendarAccessToken = storedToken;
        updateCalendarConnectionStatus(true);
    } else {
        updateCalendarConnectionStatus(false);
    }
}

export function updateCalendarConnectionStatus(connected) {
    const status = document.getElementById('calendar-connection-status');
    const connectBtn = document.getElementById('connect-calendar-btn');
    const disconnectBtn = document.getElementById('disconnect-calendar-btn');
    const eventsList = document.getElementById('calendar-events-list');
    if (!status || !connectBtn || !disconnectBtn || !eventsList) return;

    if (connected) {
        status.textContent = 'Estado: Conectado a Google Calendar.';
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-block';
        eventsList.style.display = 'block';
    } else {
        status.textContent = 'Estado: No conectado.';
        connectBtn.style.display = 'inline-block';
        disconnectBtn.style.display = 'none';
        eventsList.style.display = 'none';
    }
}

export function resetCalendarState() {
    calendarAccessToken = null;
    localStorage.removeItem(CALENDAR_TOKEN_STORAGE_KEY);
    const eventsList = document.getElementById('calendar-events-list');
    if (eventsList) eventsList.innerHTML = '';
    updateCalendarConnectionStatus(false);
}

export function handleDisconnectCalendar() {
    console.log('[Calendar] Disconnecting from Google Calendar...');
    resetCalendarState();
    showTempMessage('Desconectado de Google Calendar.', 'info');
}

export async function loadCalendarEvents() {
    console.log('[Calendar] Loading events. calendarAccessToken exists:', !!calendarAccessToken);
    const eventsList = document.getElementById('calendar-events-list');

    if (!eventsList) return;

    if (!calendarAccessToken) {
        eventsList.innerHTML = '<li>Para ver tu calendario, haz clic en "Iniciar con Google" en la parte superior de la página.</li>';
        return;
    }

    eventsList.innerHTML = '<li>Cargando eventos...</li>';

    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const timeMin = now.toISOString();
        const timeMax = new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate() + 1
        ).toISOString();

        const params = new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            showDeleted: 'false',
            orderBy: 'startTime',
            maxResults: '10'
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${calendarAccessToken}`
                }
            }
        );

        if (!response.ok) {
            console.error('[Calendar] Error response:', await response.text());
            if (response.status === 401 || response.status === 403) {
                showTempMessage(
                    'El acceso a Calendar expiró o no es válido. Vuelve a iniciar sesión con Google.',
                    'warning'
                );
                updateCalendarConnectionStatus(false);
            }
            eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
            return;
        }

        const data = await response.json();
        const events = data.items || [];
        console.log('[Calendar] Events received:', events);

        if (!events.length) {
            eventsList.innerHTML = '<li>No hay eventos para hoy o mañana.</li>';
            return;
        }

        eventsList.innerHTML = '';

        events.forEach(event => {
            const li = document.createElement('li');
            li.className = 'calendar-event';
            const start = event.start.dateTime || event.start.date;
            const dateObj = new Date(start);
            const timeStr = dateObj.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            });
            li.innerHTML = `
                <span class="event-time">${timeStr}</span>
                <span class="event-summary">${event.summary || '(Sin título)'}</span>
            `;
            eventsList.appendChild(li);
        });

    } catch (err) {
        console.error('[Calendar] Error loading events:', err);
        eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
        showTempMessage('Error al cargar eventos de Google Calendar.', 'error');
    }
}
