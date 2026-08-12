// =================================================================================
// OUTLOOK CALENDAR: estado de conexión y carga de eventos vía Microsoft Graph,
// usando MSAL.js (login popup + refresco silencioso con el cache propio de
// MSAL, que persiste en localStorage — no necesita el timer manual que sí
// hace falta para Google/GIS, ver calendar.js).
// =================================================================================
import { showTempMessage, renderEmptyState } from '../ui.js';
import { setTodayOutlookEvents } from './today-agenda.js';

// Application (client) ID de la app registrada en Microsoft Entra ID
// (Azure AD) para este proyecto — público, no es secreto (mismo criterio
// que el client ID de Google en calendar.js). Ver CLAUDE.md para los pasos
// del registro. Reemplazar con el valor real antes de usar esta feature.
const MICROSOFT_CLIENT_ID = 'REEMPLAZAR_CON_CLIENT_ID_DE_AZURE';
const OUTLOOK_API_SCOPES = ['Calendars.Read'];

let msalInstance = null;
let msalInitPromise = null;
let outlookAccount = null;

// Microsoft Graph devuelve las fechas sin sufijo de zona horaria cuando se
// pide un timezone explícito (Prefer: outlook.timezone="UTC" más abajo) —
// hay que agregarle "Z" a mano, si no Date la interpreta como hora local.
function parseGraphDateTime(dateTimeStr) {
    return new Date(dateTimeStr.endsWith('Z') ? dateTimeStr : `${dateTimeStr}Z`);
}

// msal-browser se carga con <script async defer>, así que puede no estar
// listo todavía cuando restoreOutlookAccount() se ejecuta al cargar la
// página (mismo problema que GIS en calendar.js).
function waitForMsal(timeoutMs = 8000, intervalMs = 200) {
    return new Promise(resolve => {
        const start = Date.now();
        (function check() {
            if (window.msal) return resolve(true);
            if (Date.now() - start > timeoutMs) return resolve(false);
            setTimeout(check, intervalMs);
        })();
    });
}

async function getMsalInstance() {
    if (msalInstance) return msalInstance;
    if (!window.msal) return null;

    msalInstance = new window.msal.PublicClientApplication({
        auth: {
            clientId: MICROSOFT_CLIENT_ID,
            authority: 'https://login.microsoftonline.com/common',
            redirectUri: window.location.origin,
        },
        cache: {
            cacheLocation: 'localStorage',
        },
    });
    if (!msalInitPromise) msalInitPromise = msalInstance.initialize();
    await msalInitPromise;
    return msalInstance;
}

export function hasOutlookAccount() {
    return !!outlookAccount;
}

export function updateOutlookConnectionStatus(connected) {
    const status = document.getElementById('outlook-connection-status');
    const connectBtn = document.getElementById('connect-outlook-btn');
    const disconnectBtn = document.getElementById('disconnect-outlook-btn');
    const eventsList = document.getElementById('outlook-events-list');
    if (!status || !connectBtn || !disconnectBtn || !eventsList) return;

    if (connected) {
        status.textContent = 'Estado: Conectado a Outlook Calendar.';
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

export function resetOutlookState() {
    outlookAccount = null;
    const eventsList = document.getElementById('outlook-events-list');
    if (eventsList) eventsList.innerHTML = '';
    setTodayOutlookEvents([]);
    updateOutlookConnectionStatus(false);
}

export function handleDisconnectOutlook() {
    // Igual que "Desconectar" en Google Calendar: solo saca el acceso de la
    // app, no cierra la sesión de Microsoft en el navegador.
    resetOutlookState();
    showTempMessage('Desconectado de Outlook Calendar.', 'info');
}

async function acquireTokenSilentOrNull(instance, account) {
    try {
        const result = await instance.acquireTokenSilent({ scopes: OUTLOOK_API_SCOPES, account });
        return result.accessToken;
    } catch (error) {
        console.warn('[Outlook] No se pudo refrescar el token en silencio:', error);
        return null;
    }
}

export async function restoreOutlookAccount() {
    if (!window.msal) await waitForMsal();
    const instance = await getMsalInstance();
    if (!instance) return;

    const accounts = instance.getAllAccounts();
    if (!accounts.length) {
        updateOutlookConnectionStatus(false);
        return;
    }
    outlookAccount = accounts[0];
    updateOutlookConnectionStatus(true);
    loadOutlookEvents();
}

export function wireOutlookButtons() {
    const connectBtn = document.getElementById('connect-outlook-btn');
    if (connectBtn) {
        connectBtn.onclick = async () => {
            const instance = await getMsalInstance();
            if (!instance) {
                showTempMessage('No se pudo cargar el login de Microsoft. Probá de nuevo.', 'error');
                return;
            }
            try {
                const result = await instance.loginPopup({ scopes: OUTLOOK_API_SCOPES });
                outlookAccount = result.account;
                updateOutlookConnectionStatus(true);
                loadOutlookEvents();
                showTempMessage('Conectado a Outlook Calendar.', 'success');
            } catch (error) {
                console.error('[Outlook] Error de inicio de sesión:', error);
                showTempMessage('No se pudo conectar con Outlook. Probá de nuevo.', 'error');
            }
        };
    }

    const disconnectBtn = document.getElementById('disconnect-outlook-btn');
    if (disconnectBtn) {
        disconnectBtn.onclick = handleDisconnectOutlook;
    }
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildOutlookEventListItem(event, { timeOnly = false } = {}) {
    const li = document.createElement('li');
    li.className = 'calendar-event';
    const dateObj = parseGraphDateTime(event.start.dateTime);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'event-time';
    timeSpan.textContent = timeOnly
        ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    const summarySpan = document.createElement('span');
    summarySpan.className = 'event-summary';
    summarySpan.textContent = event.subject || '(Sin título)';

    li.appendChild(timeSpan);
    li.appendChild(summarySpan);
    return li;
}

export async function loadOutlookEvents() {
    const eventsList = document.getElementById('outlook-events-list');
    if (!eventsList) return;

    if (!outlookAccount) {
        eventsList.innerHTML = '<li>Conectá tu cuenta de Outlook para ver tus eventos.</li>';
        setTodayOutlookEvents([]);
        return;
    }

    eventsList.innerHTML = '<li>Cargando eventos...</li>';

    try {
        const instance = await getMsalInstance();
        const accessToken = await acquireTokenSilentOrNull(instance, outlookAccount);
        if (!accessToken) {
            showTempMessage('El acceso a Outlook expiró. Reconectá con Microsoft.', 'warning');
            resetOutlookState();
            return;
        }

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

        const params = new URLSearchParams({
            startDateTime: now.toISOString(),
            endDateTime: endOfTomorrow.toISOString(),
            '$orderby': 'start/dateTime',
            '$top': '10',
        });

        const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Prefer: 'outlook.timezone="UTC"',
            },
        });

        if (!response.ok) {
            console.error('[Outlook] Error response:', await response.text());
            if (response.status === 401 || response.status === 403) {
                showTempMessage('El acceso a Outlook expiró o no es válido. Reconectá con Microsoft.', 'warning');
                updateOutlookConnectionStatus(false);
            }
            eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
            setTodayOutlookEvents([]);
            return;
        }

        const data = await response.json();
        const events = data.value || [];

        eventsList.innerHTML = '';
        if (!events.length) {
            renderEmptyState(eventsList, { message: 'No hay eventos para hoy o mañana.' });
        } else {
            events.forEach(event => eventsList.appendChild(buildOutlookEventListItem(event)));
        }

        const now2 = new Date();
        const remainingToday = events.filter(event => {
            const dateObj = parseGraphDateTime(event.start.dateTime);
            return isSameDay(dateObj, now2) && dateObj >= now2;
        });
        setTodayOutlookEvents(remainingToday);

    } catch (err) {
        console.error('[Outlook] Error loading events:', err);
        eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
        setTodayOutlookEvents([]);
        showTempMessage('Error al cargar eventos de Outlook Calendar.', 'error');
    }
}
