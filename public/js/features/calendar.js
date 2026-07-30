// =================================================================================
// GOOGLE CALENDAR: estado de conexión, carga de eventos y refresco silencioso
// del access token vía Google Identity Services (GIS). El token que da
// signInWithPopup dura ~1h y no incluye refresh token (eso requiere un backend,
// ver CLAUDE.md). Mientras tanto, GIS permite renovarlo sin backend siempre que
// el navegador mantenga la sesión de Google activa (prompt: '' = silencioso;
// si falla, se cae al estado "desconectado" y hay que reconectar a mano).
// =================================================================================
import { showTempMessage, renderEmptyState, mostrarSeccion } from '../ui.js';

export const CALENDAR_API_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const CALENDAR_TOKEN_STORAGE_KEY = 'calendarAccessToken';

// Web client ID de Google para este proyecto (público, no es un secreto: es el
// mismo que usa Firebase Auth internamente para el login con Google).
const GOOGLE_WEB_CLIENT_ID = '765424031369-l9nnoo6q8hcflmpb5vd911cb2lqp9452.apps.googleusercontent.com';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refrescar 5 min antes de que expire
const DEFAULT_TOKEN_LIFETIME_MS = 55 * 60 * 1000; // asumido cuando no sabemos el expires_in real (ej. tras el popup de Firebase)

let calendarAccessToken = null;
let tokenClient = null;
let refreshTimerId = null;

export function hasCalendarAccessToken() {
    return !!calendarAccessToken;
}

function getTokenClient() {
    if (tokenClient) return tokenClient;
    if (!window.google?.accounts?.oauth2) return null;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_WEB_CLIENT_ID,
        scope: CALENDAR_API_SCOPE,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error('[Calendar] No se pudo refrescar el token silenciosamente:', tokenResponse);
                resetCalendarState();
                showTempMessage('El acceso a Calendar expiró. Reconectá con Google.', 'warning');
                return;
            }
            const expiresInMs = (tokenResponse.expires_in || 3600) * 1000;
            persistCalendarToken(tokenResponse.access_token, Date.now() + expiresInMs);
            scheduleTokenRefresh(expiresInMs);
            updateCalendarConnectionStatus(true);
            loadCalendarEvents();
        },
    });
    return tokenClient;
}

function scheduleTokenRefresh(lifetimeMs) {
    clearTimeout(refreshTimerId);
    const delay = Math.max(lifetimeMs - TOKEN_REFRESH_BUFFER_MS, 10000);
    refreshTimerId = setTimeout(() => {
        const client = getTokenClient();
        if (client) {
            console.log('[Calendar] Refrescando token de Calendar en segundo plano...');
            client.requestAccessToken({ prompt: '' });
        }
    }, delay);
}

function persistCalendarToken(token, expiresAt) {
    calendarAccessToken = token;
    localStorage.setItem(CALENDAR_TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
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
    persistCalendarToken(token, Date.now() + DEFAULT_TOKEN_LIFETIME_MS);
    scheduleTokenRefresh(DEFAULT_TOKEN_LIFETIME_MS);
}

export function restoreCalendarToken() {
    const raw = localStorage.getItem(CALENDAR_TOKEN_STORAGE_KEY);
    if (!raw) {
        updateCalendarConnectionStatus(false);
        return;
    }

    let stored;
    try {
        stored = JSON.parse(raw);
    } catch {
        localStorage.removeItem(CALENDAR_TOKEN_STORAGE_KEY);
        updateCalendarConnectionStatus(false);
        return;
    }

    const remainingMs = stored.expiresAt - Date.now();
    calendarAccessToken = stored.token;
    updateCalendarConnectionStatus(true);

    if (remainingMs > TOKEN_REFRESH_BUFFER_MS) {
        scheduleTokenRefresh(remainingMs);
    } else {
        // El token ya venció o está por vencer: intentar refrescarlo ya mismo.
        const client = getTokenClient();
        if (client) {
            client.requestAccessToken({ prompt: '' });
        } else {
            resetCalendarState();
        }
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
    clearTimeout(refreshTimerId);
    localStorage.removeItem(CALENDAR_TOKEN_STORAGE_KEY);
    const eventsList = document.getElementById('calendar-events-list');
    if (eventsList) eventsList.innerHTML = '';
    const todayEventsList = document.getElementById('today-calendar-events-list');
    if (todayEventsList) {
        renderEmptyState(todayEventsList, {
            message: 'Conectá Google Calendar para ver acá lo que te queda por hoy.',
            actionLabel: '🗓️ Ir a Calendario',
            onAction: () => mostrarSeccion('calendario')
        });
    }
    updateCalendarConnectionStatus(false);
}

export function handleDisconnectCalendar() {
    console.log('[Calendar] Disconnecting from Google Calendar...');
    resetCalendarState();
    showTempMessage('Desconectado de Google Calendar.', 'info');
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildEventListItem(event, { timeOnly = false } = {}) {
    const li = document.createElement('li');
    li.className = 'calendar-event';
    const start = event.start.dateTime || event.start.date;
    const dateObj = new Date(start);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'event-time';
    timeSpan.textContent = timeOnly
        ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    const summarySpan = document.createElement('span');
    summarySpan.className = 'event-summary';
    summarySpan.textContent = event.summary || '(Sin título)';

    li.appendChild(timeSpan);
    li.appendChild(summarySpan);
    return li;
}

export async function loadCalendarEvents() {
    console.log('[Calendar] Loading events. calendarAccessToken exists:', !!calendarAccessToken);
    const eventsList = document.getElementById('calendar-events-list');
    const todayEventsList = document.getElementById('today-calendar-events-list');

    if (!eventsList && !todayEventsList) return;

    if (!calendarAccessToken) {
        if (eventsList) {
            eventsList.innerHTML = '<li>Para ver tu calendario, haz clic en "Iniciar con Google" en la parte superior de la página.</li>';
        }
        if (todayEventsList) {
            renderEmptyState(todayEventsList, {
                message: 'Conectá Google Calendar para ver acá lo que te queda por hoy.',
                actionLabel: '🗓️ Ir a Calendario',
                onAction: () => mostrarSeccion('calendario')
            });
        }
        return;
    }

    if (eventsList) eventsList.innerHTML = '<li>Cargando eventos...</li>';
    if (todayEventsList) todayEventsList.innerHTML = '<li>Cargando agenda de hoy...</li>';

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
            if (eventsList) eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
            if (todayEventsList) todayEventsList.innerHTML = '<li>Error al cargar la agenda de hoy.</li>';
            return;
        }

        const data = await response.json();
        const events = data.items || [];
        console.log('[Calendar] Events received:', events);

        if (eventsList) {
            eventsList.innerHTML = '';
            if (!events.length) {
                renderEmptyState(eventsList, { message: 'No hay eventos para hoy o mañana.' });
            } else {
                events.forEach(event => eventsList.appendChild(buildEventListItem(event)));
            }
        }

        if (todayEventsList) {
            const now2 = new Date();
            const remainingToday = events.filter(event => {
                const start = event.start.dateTime || event.start.date;
                const dateObj = new Date(start);
                return isSameDay(dateObj, now2) && dateObj >= now2;
            });

            todayEventsList.innerHTML = '';
            if (!remainingToday.length) {
                renderEmptyState(todayEventsList, { message: 'No te queda nada más agendado por hoy. 🎉' });
            } else {
                remainingToday.forEach(event => todayEventsList.appendChild(buildEventListItem(event, { timeOnly: true })));
            }
        }

    } catch (err) {
        console.error('[Calendar] Error loading events:', err);
        if (eventsList) eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
        if (todayEventsList) todayEventsList.innerHTML = '<li>Error al cargar la agenda de hoy.</li>';
        showTempMessage('Error al cargar eventos de Google Calendar.', 'error');
    }
}
