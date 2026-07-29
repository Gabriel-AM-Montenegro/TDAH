// =================================================================================
// FIREBASE V11 MODULAR IMPORTS
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    getDocs,
    writeBatch,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================================
// CONFIGURATION & INITIALIZATION
// =================================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDbIABcg4AqeqiUzYhTahgjc2oziM5NLjI",
    authDomain: "tdah-app-efca9.firebaseapp.com",
    projectId: "tdah-app-efca9",
    storageBucket: "tdah-app-efca9.appspot.com",
    messagingSenderId: "765424831369",
    appId: "1:765424031369:web:838eca86f68f21daa5858",
    measurementId: "G-QY7X98XZZY"
};

// =================================================================================
// NUEVO: Configuración de la API de Google Calendar
// =================================================================================
const CALENDAR_API_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
let calendarAccessToken = null;
const CALENDAR_TOKEN_STORAGE_KEY = 'calendarAccessToken';

function updateCalendarConnectionStatus(connected) {
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

function handleDisconnectCalendar() {
    console.log('[Calendar] Disconnecting from Google Calendar...');
    calendarAccessToken = null;
    localStorage.removeItem(CALENDAR_TOKEN_STORAGE_KEY);
    updateCalendarConnectionStatus(false);
    const eventsList = document.getElementById('calendar-events-list');
    const todayEventsList = document.getElementById('today-calendar-events-list');
    if (eventsList) eventsList.innerHTML = '';
    if (todayEventsList) todayEventsList.innerHTML = '';
    window.showTempMessage('Desconectado de Google Calendar.', 'info');
}

async function loadCalendarEvents() {
    console.log('[Calendar] Loading events. calendarAccessToken exists:', !!calendarAccessToken);
    const eventsList = document.getElementById('calendar-events-list');
    const todayEventsList = document.getElementById('today-calendar-events-list');

    if (!eventsList) return;

    if (!calendarAccessToken) {
        eventsList.innerHTML = '<li>Para ver tu calendario, haz clic en "Iniciar con Google" en la parte superior de la página.</li>';
        if (todayEventsList) {
            todayEventsList.innerHTML = '<li>Conecta Google Calendar primero.</li>';
        }
        return;
    }

    eventsList.innerHTML = '<li>Cargando eventos...</li>';
    if (todayEventsList) todayEventsList.innerHTML = '<li>Cargando eventos de hoy...</li>';

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
                window.showTempMessage(
                    'El acceso a Calendar expiró o no es válido. Vuelve a iniciar sesión con Google.',
                    'warning'
                );
                updateCalendarConnectionStatus(false);
            }
            eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
            if (todayEventsList) todayEventsList.innerHTML = '<li>Error al cargar eventos de hoy.</li>';
            return;
        }

        const data = await response.json();
        const events = data.items || [];
        console.log('[Calendar] Events received:', events);

        const today = new Date();
        const isSameDay = (d1, d2) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        if (!events.length) {
            eventsList.innerHTML = '<li>No hay eventos para hoy o mañana.</li>';
            if (todayEventsList) todayEventsList.innerHTML = '<li>No hay eventos para hoy.</li>';
            return;
        }

        eventsList.innerHTML = '';
        if (todayEventsList) todayEventsList.innerHTML = '';

        let todayCount = 0;

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

            // También pintar lista de eventos SOLO de hoy para la vista HOY
            if (todayEventsList && isSameDay(dateObj, today)) {
                const liToday = document.createElement('li');
                liToday.className = 'calendar-event';
                const hourStr = dateObj.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                liToday.innerHTML = `
                    <span class="event-time">${hourStr}</span>
                    <span class="event-summary">${event.summary || '(Sin título)'}</span>
                `;
                todayEventsList.appendChild(liToday);
                todayCount++;
            }
        });

        if (todayEventsList && todayCount === 0) {
            todayEventsList.innerHTML = '<li>No hay eventos para hoy.</li>';
        }

    } catch (err) {
        console.error('[Calendar] Error loading events:', err);
        eventsList.innerHTML = '<li>Error al cargar eventos.</li>';
        if (todayEventsList) {
            todayEventsList.innerHTML = '<li>Error al cargar eventos de hoy.</li>';
        }
        window.showTempMessage('Error al cargar eventos de Google Calendar.', 'error');
    }
}

const appId = firebaseConfig.appId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let notificationPermissionGranted = false;
let isLoggingOut = false;
let unsubscribeListeners = [];

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase inicializado exitosamente.");
} catch (error) {
    console.error("ERROR CRÍTICO DE INICIALIZACIÓN DE FIREBASE:", error);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #d8000c;">
            <h1>Error Crítico</h1><p>No se pudo conectar con la base de datos.</p>
            <p><strong>Detalle del error:</strong> ${error.message}</p></div>`;
    });
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

window.showTempMessage = (message, type = 'info', duration = 3000) => {
    const container = document.getElementById('temp-message-container');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `temp-message ${type}`;
    msgDiv.textContent = message;
    container.appendChild(msgDiv);
    setTimeout(() => msgDiv.classList.add('show'), 10);
    setTimeout(() => {
        msgDiv.classList.remove('show');
        msgDiv.addEventListener('transitionend', () => msgDiv.remove());
    }, duration);
};

window.showCustomConfirm = (message) => {
    const modal = document.getElementById('custom-modal-overlay');
    const msgElement = document.getElementById('custom-modal-message');
    const yesBtn = document.getElementById('custom-modal-yes-btn');
    const noBtn = document.getElementById('custom-modal-no-btn');
    if (!modal || !msgElement || !yesBtn || !noBtn) return Promise.resolve(confirm(message));
    msgElement.textContent = message;
    modal.classList.add('show');
    return new Promise(resolve => {
        const resolveAndClose = (value) => {
            modal.classList.remove('show');
            yesBtn.onclick = null;
            noBtn.onclick = null;
            resolve(value);
        };
        yesBtn.onclick = () => resolveAndClose(true);
        noBtn.onclick = () => resolveAndClose(false);
    });
};

window.triggerConfetti = () => {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(confetti);
        confetti.addEventListener('animationend', () => confetti.remove());
    }
};

const SECTION_TITLES = {
    hoy: 'Hoy',
    pomodoro: 'Pomodoro',
    calendario: 'Calendario',
    checklist: 'Checklist Rápido',
    journal: 'Journal',
    habitos: 'Hábitos',
    tareas: 'Tareas Trello',
    notas: 'Notas Blog',
    nutricion: 'Nutrición',
    config: 'Configuración'
};

window.mostrarSeccion = (seccionId) => {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    const seccionActiva = document.getElementById(seccionId);
    const botonActivo = document.getElementById(`btn-${seccionId}`);
    if (seccionActiva) seccionActiva.classList.add('active');
    if (botonActivo) botonActivo.classList.add('active');
    document.title = SECTION_TITLES[seccionId] ? `App TDAH - ${SECTION_TITLES[seccionId]}` : 'App TDAH';
};

// =================================================================================
// MAIN APPLICATION LOGIC
// =================================================================================
function cleanupFirestoreListeners() {
    console.log(`Limpiando ${unsubscribeListeners.length} listeners de Firestore...`);
    unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners = [];
}

async function loadAllUserData(currentUserId) {
    console.log("loadAllUserData: Cargando datos para el usuario:", currentUserId);
    if (!db || !auth || !currentUserId) {
        return;
    }

    cleanupFirestoreListeners();

    const user = auth.currentUser;
    const userDisplayNameElement = document.getElementById('user-display-name');
    if (userDisplayNameElement) {
        userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
    }
    window.showTempMessage(`Sesión iniciada.`, 'info');

    const publicDataDocId = "1:765424031369:web:838eca686f68f21daa5858";
    const journalCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'journalEntries');
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'checklistItems');
    const pomodoroSettingsDocRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'pomodoroSettings', 'current');
    const trelloConfigDocRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'trelloConfig', 'settings');
    const habitsCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'habits');
    const userSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'settings', 'appSettings');
    const blogArticlesCollectionRef = collection(db, 'artifacts', publicDataDocId, 'blogArticles');
    const nutricionCollectionRef = collection(db, 'artifacts', publicDataDocId, 'public', 'data', 'nutritionContent');

    // --- Welcome Tour Logic ---
    (async () => {
        const tourOverlay = document.getElementById('welcome-tour-overlay');
        const tourTitle = document.getElementById('tour-title');
        const tourDescription = document.getElementById('tour-description');
        const tourHighlightImage = document.getElementById('tour-highlight-image');
        const tourStepCounter = document.getElementById('tour-step-counter');
        const tourBackBtn = document.getElementById('tour-back-btn');
        const tourNextBtn = document.getElementById('tour-next-btn');
        const tourSkipBtn = document.getElementById('tour-skip-btn');
        const tourStartBtn = document.getElementById('tour-start-btn');
        const tourDotsContainer = document.getElementById('tour-dots');

        if (!tourOverlay || !tourTitle || !tourDescription || !tourHighlightImage || !tourBackBtn || !tourNextBtn || !tourSkipBtn || !tourDotsContainer) {
            return;
        }

        let currentTourStep = 0;
        const tourSteps = [
            {
                title: "¡Bienvenido a TDAH Helper App!",
                description: "Esta aplicación está diseñada para ayudarte a gestionar tu día a día, mejorar tu concentración y organizar tus tareas de forma efectiva. ¡Vamos a explorar sus funciones principales!",
                image: ""
            },
            {
                title: "📅 HOY",
                description: "Este es tu punto de partida diario. Acá ves tus 3 tareas más importantes, tu foco con Pomodoro y tu agenda del día, todo en una sola vista.",
                image: ""
            },
            {
                title: "⏱️ Pomodoro",
                description: "Trabajá en bloques de foco y descanso para mantener la concentración. Podés ajustar los tiempos según lo que mejor funcione para vos.",
                image: ""
            },
            {
                title: "✅ Checklist Rápido",
                description: "Organizá tareas simples y marcá lo que vas completando para avanzar sin sobrepensar.",
                image: ""
            },
            {
                title: "📝 Journal Personal",
                description: "Un espacio seguro para escribir pensamientos, emociones y logros. Reflexionar también es productividad.",
                image: ""
            },
            {
                title: "🌱 Hábitos Diarios",
                description: "Construí rutinas pequeñas y sostenibles, y visualizá tu progreso día a día.",
                image: ""
            },
            {
                title: "🚀 Cierre del tour",
                description: "Explorá la app y adaptala a vos. No hay una forma correcta de usarla, solo la que te funciona.",
                image: ""
            }
        ];

        const renderTourStep = () => {
            const step = tourSteps[currentTourStep];
            tourTitle.textContent = step.title;
            tourDescription.textContent = step.description;
            tourHighlightImage.src = step.image || '';
            tourHighlightImage.style.display = step.image ? 'block' : 'none';

            // Ocultar también el contenedor para evitar espacios vacíos
            if (tourHighlightImage.parentElement) {
                tourHighlightImage.parentElement.style.display = step.image ? 'flex' : 'none';
            }

            // Actualizar contador
            if (tourStepCounter) {
                tourStepCounter.textContent = `Paso ${currentTourStep + 1} de ${tourSteps.length}`;
            }

            // Botón atrás
            tourBackBtn.style.display = currentTourStep === 0 ? 'none' : 'block';

            // Botones de acción final
            const isLastStep = currentTourStep === tourSteps.length - 1;

            if (isLastStep) {
                tourNextBtn.style.display = 'none';
                tourSkipBtn.style.display = 'none';
                if (tourStartBtn) tourStartBtn.style.display = 'block';
            } else {
                tourNextBtn.style.display = 'block';
                tourNextBtn.textContent = 'Siguiente ➡️';
                tourSkipBtn.style.display = 'block';
                if (tourStartBtn) tourStartBtn.style.display = 'none';
            }

            updateTourDots();
        };

        const createTourDots = () => {
            tourDotsContainer.innerHTML = '';
            tourSteps.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = 'tour-dot';
                dot.setAttribute('tabindex', '0');
                dot.setAttribute('role', 'button');
                dot.onclick = () => { currentTourStep = index; renderTourStep(); };
                dot.onkeydown = (e) => { if (e.key === 'Enter') { currentTourStep = index; renderTourStep(); } };
                tourDotsContainer.appendChild(dot);
            });
        };

        const updateTourDots = () => {
            document.querySelectorAll('.tour-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentTourStep);
            });
        };

        const completeTour = async () => {
            try {
                await setDoc(userSettingsRef, { tourCompleted: true }, { merge: true });
            } catch (error) { console.error("Tour: Error al guardar estado:", error); }
            tourOverlay.classList.remove('active');
            window.showTempMessage("¡Tour de bienvenida completado!", 'info');
        };

        try {
            const docSnap = await getDoc(userSettingsRef);
            if (!docSnap.exists() || !docSnap.data().tourCompleted) {
                tourOverlay.classList.add('active');
                createTourDots();
                renderTourStep();
            }
        } catch (error) { console.error("Tour: Error al verificar estado:", error); }

        tourNextBtn.onclick = () => (currentTourStep < tourSteps.length - 1) ? (currentTourStep++, renderTourStep()) : completeTour();
        tourBackBtn.onclick = () => (currentTourStep > 0) ? (currentTourStep--, renderTourStep()) : null;
        tourSkipBtn.onclick = completeTour;
        if (tourStartBtn) tourStartBtn.onclick = completeTour;
    })();

    // --- Journal Logic ---
    (() => {
        const journalEntryTextarea = document.getElementById('journalEntry');
        const saveJournalEntryButton = document.getElementById('save-journal-entry-btn');
        const journalEntriesList = document.getElementById('journalEntriesList');
        if (!journalEntryTextarea || !saveJournalEntryButton || !journalEntriesList) return;

        // --- Mini-calendario: marca los días con entradas ---
        const calMonthLabel = document.getElementById('journal-cal-month-label');
        const calGrid = document.getElementById('journal-cal-grid');
        const calWeekdays = document.getElementById('journal-cal-weekdays');
        const calPrevBtn = document.getElementById('journal-cal-prev');
        const calNextBtn = document.getElementById('journal-cal-next');
        const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        let currentCalendarDate = new Date();
        currentCalendarDate.setDate(1);
        let journalEntryDates = new Set();

        const renderJournalCalendar = () => {
            if (!calGrid || !calMonthLabel) return;
            calGrid.innerHTML = '';

            if (calWeekdays && !calWeekdays.childElementCount) {
                WEEKDAY_LABELS.forEach(label => {
                    const span = document.createElement('span');
                    span.textContent = label;
                    calWeekdays.appendChild(span);
                });
            }

            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            calMonthLabel.textContent = currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

            const startOffset = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const todayString = new Date().toISOString().split('T')[0];

            for (let i = 0; i < startOffset; i++) {
                calGrid.appendChild(document.createElement('span'));
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEl = document.createElement('span');
                dayEl.className = 'journal-cal-day';
                dayEl.textContent = day;
                if (journalEntryDates.has(dateString)) dayEl.classList.add('has-entry');
                if (dateString === todayString) dayEl.classList.add('is-today');
                calGrid.appendChild(dayEl);
            }
        };

        if (calPrevBtn) {
            calPrevBtn.onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderJournalCalendar();
            };
        }
        if (calNextBtn) {
            calNextBtn.onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderJournalCalendar();
            };
        }

        const q = query(journalCollectionRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            journalEntriesList.innerHTML = '';

            journalEntryDates = new Set(
                snapshot.docs.map(docSnap => new Date(docSnap.data().timestamp).toISOString().split('T')[0])
            );
            renderJournalCalendar();

            if (snapshot.empty) {
                journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún.</li>';
                return;
            }
            snapshot.forEach((docSnap) => {
                const entry = docSnap.data();
                const listItem = document.createElement('li');

                const dateSpan = document.createElement('span');
                dateSpan.className = 'journal-date';
                dateSpan.textContent = new Date(entry.timestamp).toLocaleString('es-ES');

                const textDiv = document.createElement('div');
                const lines = entry.text.split('\n');
                lines.forEach((line, idx) => {
                    textDiv.appendChild(document.createTextNode(line));
                    if (idx < lines.length - 1) textDiv.appendChild(document.createElement('br'));
                });

                listItem.appendChild(dateSpan);
                listItem.appendChild(textDiv);
                journalEntriesList.appendChild(listItem);
            });
        }, (error) => console.error("Journal: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        saveJournalEntryButton.onclick = async () => {
            const entryText = journalEntryTextarea.value.trim();
            if (entryText) {
                try {
                    await addDoc(journalCollectionRef, { text: entryText, timestamp: new Date().toISOString() });
                    journalEntryTextarea.value = '';
                    window.showTempMessage('Entrada guardada.', 'success');
                } catch (error) { window.showTempMessage(`Error al guardar: ${error.message}`, 'error'); }
            }
        };
    })();

    // --- Pomodoro Timer Logic ---
    (() => {
        let timer;
        let isRunning = false;
        let focusTime = 25; // en minutos
        let breakTime = 5; // en minutos
        let timeLeft = focusTime * 60;
        let totalTimeForPomodoro = focusTime * 60;
        let isBreakTime = false;
        const timerDisplay = document.getElementById('timer');
        const todayTimerDisplay = document.getElementById('pomodoro-timer-today');
        const startTimerBtn = document.getElementById('start-timer-btn');
        const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn');
        const resetTimerBtn = document.getElementById('reset-timer-btn');
        const progressCircle = document.querySelector('.pomodoro-progress-ring-progress');
        const progressCircleToday = document.querySelector('.pomodoro-progress-ring-progress-today');

        // Elementos de configuración
        const focusTimeInput = document.getElementById('focus-time-input');
        const breakTimeInput = document.getElementById('break-time-input');
        const savePomodoroConfigBtn = document.getElementById('save-pomodoro-config-btn');

        if (!timerDisplay || !progressCircle || !startTimerBtn || !pausePomodoroBtn || !resetTimerBtn) return;

        const radius = progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

        // Inicializar también el círculo de la sección Hoy
        if (progressCircleToday) {
            progressCircleToday.style.strokeDasharray = `${circumference} ${circumference}`;
        }

        const setProgress = (percent) => {
            const offset = circumference - (percent / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
            // Actualizar también el círculo de la sección Hoy
            if (progressCircleToday) {
                progressCircleToday.style.strokeDashoffset = offset;
            }
        };

        const updateTimerDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = Math.floor(timeLeft % 60);
            const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerDisplay.textContent = formatted;
            if (todayTimerDisplay) todayTimerDisplay.textContent = formatted;
            setProgress((timeLeft / totalTimeForPomodoro) * 100);
            const strokeColor = isBreakTime ? 'var(--secondary-color)' : 'var(--primary-color)';
            progressCircle.style.stroke = strokeColor;
            // Actualizar también el color del círculo de la sección Hoy
            if (progressCircleToday) {
                progressCircleToday.style.stroke = strokeColor;
            }
        };

        const savePomodoroState = async (newTime, newRunning, newBreak) => {
            try {
                await setDoc(pomodoroSettingsDocRef, {
                    timeLeft: newTime,
                    isRunning: newRunning,
                    isBreakTime: newBreak,
                    focusTime: focusTime,
                    breakTime: breakTime,
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) { console.error("Pomodoro: Error al guardar estado:", error); }
        };

        const handleTimerEnd = async () => {
            clearInterval(timer);
            isRunning = false;
            await savePomodoroState(0, false, isBreakTime);

            if (!isBreakTime) {
                window.triggerConfetti();
                document.getElementById('sound-complete').play().catch(e => console.error(e));
                if (notificationPermissionGranted) new Notification('¡Pomodoro Terminado!', { body: '¡Excelente trabajo! Es hora de un descanso.' });

                setTimeout(async () => {
                    if (await window.showCustomConfirm(`¡Excelente trabajo! ¿Comenzar descanso de ${breakTime} minutos?`)) {
                        isBreakTime = true;
                        timeLeft = breakTime * 60;
                        totalTimeForPomodoro = breakTime * 60;
                        document.getElementById('sound-break').play().catch(e => console.error(e));
                        startTimer();
                    } else {
                        resetTimer();
                    }
                }, 1000);
            } else {
                window.showTempMessage('¡Descanso terminado! Es hora de volver a concentrarse.', 'info');
                if (notificationPermissionGranted) new Notification('¡Descanso Terminado!', { body: '¡Es hora de volver al trabajo!' });
                resetTimer();
            }
        };

        const startTimer = () => {
            if (isRunning) return;
            isRunning = true;
            savePomodoroState(timeLeft, true, isBreakTime);
            timer = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    handleTimerEnd();
                }
            }, 1000);
        };

        const pauseTimer = () => {
            clearInterval(timer);
            isRunning = false;
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador pausado.', 'info');
        };

        const resetTimer = () => {
            clearInterval(timer);
            isRunning = false;
            isBreakTime = false;
            timeLeft = focusTime * 60;
            totalTimeForPomodoro = focusTime * 60;
            updateTimerDisplay();
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador reiniciado.', 'info');
        };

        // Guardar configuración de tiempos
        if (savePomodoroConfigBtn) {
            savePomodoroConfigBtn.onclick = async () => {
                const newFocusTime = parseInt(focusTimeInput.value);
                const newBreakTime = parseInt(breakTimeInput.value);

                if (isNaN(newFocusTime) || newFocusTime < 1 || newFocusTime > 120) {
                    window.showTempMessage('El tiempo de concentración debe estar entre 1 y 120 minutos.', 'warning');
                    return;
                }

                if (isNaN(newBreakTime) || newBreakTime < 1 || newBreakTime > 60) {
                    window.showTempMessage('El tiempo de descanso debe estar entre 1 y 60 minutos.', 'warning');
                    return;
                }

                focusTime = newFocusTime;
                breakTime = newBreakTime;

                // Si no está corriendo, resetear con los nuevos tiempos
                if (!isRunning) {
                    timeLeft = focusTime * 60;
                    totalTimeForPomodoro = focusTime * 60;
                    updateTimerDisplay();
                }

                await savePomodoroState(timeLeft, isRunning, isBreakTime);
                window.showTempMessage('Configuración guardada exitosamente.', 'success');
            };
        }

        const unsubscribe = onSnapshot(pomodoroSettingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();

                // Cargar tiempos configurados
                if (settings.focusTime) {
                    focusTime = settings.focusTime;
                    if (focusTimeInput) focusTimeInput.value = focusTime;
                }
                if (settings.breakTime) {
                    breakTime = settings.breakTime;
                    if (breakTimeInput) breakTimeInput.value = breakTime;
                }

                isBreakTime = settings.isBreakTime || false;
                totalTimeForPomodoro = isBreakTime ? (breakTime * 60) : (focusTime * 60);

                if (settings.isRunning && settings.lastUpdated) {
                    const elapsed = Math.floor((Date.now() - new Date(settings.lastUpdated).getTime()) / 1000);
                    timeLeft = Math.max(0, settings.timeLeft - elapsed);
                    if (timeLeft > 0 && !timer) {
                        startTimer();
                    } else if (timeLeft <= 0) {
                        timeLeft = 0;
                        handleTimerEnd();
                    }
                } else {
                    timeLeft = settings.timeLeft;
                    isRunning = false;
                }
                updateTimerDisplay();
            } else {
                savePomodoroState(timeLeft, isRunning, isBreakTime);
            }
        }, error => console.error("Pomodoro: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        startTimerBtn.onclick = startTimer;
        pausePomodoroBtn.onclick = pauseTimer;
        resetTimerBtn.onclick = resetTimer;

        // Los botones de la sección Hoy también controlan el mismo temporizador
        const startTodayBtn = document.getElementById('pomodoro-start-today');
        const pauseTodayBtn = document.getElementById('pomodoro-pause-today');
        const resetTodayBtn = document.getElementById('pomodoro-reset-today');

        if (startTodayBtn) startTodayBtn.onclick = startTimer;
        if (pauseTodayBtn) pauseTodayBtn.onclick = pauseTimer;
        if (resetTodayBtn) resetTodayBtn.onclick = resetTimer;
    })();

    // --- Checklist Logic (también alimenta MITs de HOY) ---
    (() => {
        const checkItemInput = document.getElementById('checkItem');
        const addCheckItemBtn = document.getElementById('add-check-item-btn');
        const checkListUl = document.getElementById('checkList');
        if (!checkItemInput || !addCheckItemBtn || !checkListUl) return;

        let originalText = '';
        let draggedItem = null;

        const q = query(checklistCollectionRef, orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const focusedElementId = document.activeElement?.closest('li')?.dataset.id;
            const focusedElementIsEditing = document.activeElement?.classList.contains('editing');

            checkListUl.innerHTML = '';
            const mitItems = [];

            if (snapshot.empty) {
                checkListUl.innerHTML = '<li class="empty-section-message">No hay ítems en el checklist.</li>';
                const todayMits = document.getElementById('today-mits');
                if (todayMits) {
                    todayMits.innerHTML = '<li class="muted">No definiste MITs para hoy todavía.</li>';
                }
                return;
            }

            snapshot.forEach(docSnap => {
                const item = docSnap.data();
                const itemId = docSnap.id;

                // recopilar MITs no completadas para la vista HOY
                if (item.isMIT && !item.completed) {
                    mitItems.push({ id: itemId, text: item.text });
                }

                const li = document.createElement('li');
                li.dataset.id = itemId;
                li.className = item.isMIT ? 'mit-task' : '';
                li.setAttribute('draggable', 'true');
                li.innerHTML = `
                    <input type="checkbox" class="completion-checkbox" id="check-${itemId}" ${item.completed ? 'checked' : ''}>
                    <label for="check-${itemId}">
                        <span class="item-text ${item.completed ? 'task-completed' : ''}" data-item-id="${itemId}" contenteditable="false"></span>
                    </label>
                    <div class="mit-controls">
                        <input type="checkbox" class="mit-checkbox" id="mit-${itemId}" ${item.isMIT ? 'checked' : ''}> MIT
                    </div>
                    <button class="edit-item-btn">✏️</button>
                    <button class="button-danger delete-item-btn" data-id="${itemId}">❌</button>`;
                li.querySelector('.item-text').textContent = item.text;
                checkListUl.appendChild(li);
            });

            if (focusedElementId && focusedElementIsEditing) {
                const newFocusedElement = checkListUl.querySelector(`[data-id="${focusedElementId}"] .item-text`);
                if (newFocusedElement) {
                    newFocusedElement.focus();
                    newFocusedElement.classList.add('editing');
                    newFocusedElement.contentEditable = 'true';
                }
            }

            // Actualizar MITs en la sección HOY (máx 3)
            const todayMits = document.getElementById('today-mits');
            if (todayMits) {
                if (!mitItems.length) {
                    todayMits.innerHTML = '<li class="muted">No definiste MITs para hoy todavía.</li>';
                } else {
                    todayMits.innerHTML = '';
                    mitItems.slice(0, 3).forEach(it => {
                        const li = document.createElement('li');
                        li.className = 'mit-item';
                        li.innerHTML = `
                            <label>
                              <input type="checkbox" class="completion-checkbox" data-id="${it.id}" />
                              <span></span>
                            </label>`;
                        li.querySelector('span').textContent = it.text || '(Sin título)';
                        todayMits.appendChild(li);
                    });
                }
            }

        }, error => console.error("Checklist: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        addCheckItemBtn.onclick = async () => {
            const itemText = checkItemInput.value.trim();
            if (itemText) {
                try {
                    const q_pos = query(checklistCollectionRef, orderBy('position', 'desc'), limit(1));
                    const lastItemSnapshot = await getDocs(q_pos);
                    const newPosition = lastItemSnapshot.empty ? 0 : lastItemSnapshot.docs[0].data().position + 1;
                    await addDoc(checklistCollectionRef, { text: itemText, completed: false, isMIT: false, timestamp: new Date().toISOString(), position: newPosition });
                    checkItemInput.value = '';
                } catch (error) { console.error("Checklist: Error al añadir:", error); }
            }
        };

        checkListUl.addEventListener('click', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const itemId = listItem.dataset.id;
            const itemRef = doc(checklistCollectionRef, itemId);
            if (target.classList.contains('delete-item-btn')) {
                if (await window.showCustomConfirm('¿Eliminar esta tarea?')) await deleteDoc(itemRef);
            }
            if (target.classList.contains('edit-item-btn')) {
                e.stopPropagation();
                const itemTextSpan = listItem.querySelector('.item-text');
                if (itemTextSpan) {
                    originalText = itemTextSpan.textContent;
                    itemTextSpan.contentEditable = 'true';
                    itemTextSpan.focus();
                    itemTextSpan.classList.add('editing');
                }
            }
        });

        checkListUl.addEventListener('change', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const itemId = listItem.dataset.id;
            const itemRef = doc(checklistCollectionRef, itemId);
            if (target.classList.contains('completion-checkbox')) {
                await updateDoc(itemRef, { completed: target.checked });
                if (target.checked) document.getElementById('sound-task-done').play().catch(err => console.error(err));
            } else if (target.classList.contains('mit-checkbox')) {
                // limitar a 3 MITs
                const snapshot = await getDocs(query(checklistCollectionRef));
                const currentMits = snapshot.docs.filter(d => d.data().isMIT).length;
                if (target.checked && currentMits >= 3) {
                    window.showTempMessage('Solo puedes tener 3 MITs a la vez.', 'warning');
                    target.checked = false;
                    return;
                }
                await updateDoc(itemRef, { isMIT: target.checked });
            }
        });

        checkListUl.addEventListener('blur', async (e) => {
            const target = e.target;
            if (target.classList.contains('item-text') && target.contentEditable === 'true') {
                target.contentEditable = 'false';
                target.classList.remove('editing');
                const newText = target.textContent.trim();
                const itemId = target.dataset.itemId;
                if (newText && newText !== originalText) {
                    try {
                        await updateDoc(doc(checklistCollectionRef, itemId), { text: newText });
                        window.showTempMessage('Tarea actualizada.', 'success');
                    } catch (error) {
                        console.error("Checklist: Error al actualizar texto:", error);
                        window.showTempMessage('Error al actualizar.', 'error');
                        target.textContent = originalText;
                    }
                } else {
                    target.textContent = originalText;
                }
            }
        }, true);

        checkListUl.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('item-text') && e.target.contentEditable === 'true') {
                if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                else if (e.key === 'Escape') { e.target.textContent = originalText; e.target.blur(); }
            }
        });

        const updateItemPositions = async () => {
            const batch = writeBatch(db);
            Array.from(checkListUl.children).forEach((item, index) => {
                const itemId = item.dataset.id;
                if (itemId) batch.update(doc(checklistCollectionRef, itemId), { position: index });
            });
            await batch.commit();
        };

        checkListUl.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'LI') {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }
        });
        checkListUl.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                updateItemPositions();
            }
        });
        checkListUl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(checkListUl, e.clientY);
            const currentDragged = document.querySelector('.dragging');
            if (afterElement == null) {
                checkListUl.appendChild(currentDragged);
            } else {
                checkListUl.insertBefore(currentDragged, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

    })();

    // --- Habits Logic ---
    (() => {
        const newHabitInput = document.getElementById('newHabitInput');
        const addHabitBtn = document.getElementById('add-habit-btn');
        const habitsList = document.getElementById('habitsList');
        if (!newHabitInput || !addHabitBtn || !habitsList) return;

        const q = query(habitsCollectionRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            habitsList.innerHTML = '';
            if (snapshot.empty) {
                habitsList.innerHTML = '<li class="empty-section-message">Aún no tienes hábitos.</li>';
                return;
            }
            snapshot.forEach(docSnap => {
                const habit = docSnap.data();
                const habitId = docSnap.id;
                const today = new Date();
                const dailyTrackingHtml = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (6 - i));
                    const dateString = date.toISOString().split('T')[0];
                    const isCompleted = habit.dailyCompletions && habit.dailyCompletions[dateString];
                    return `<span class="habit-day-dot ${isCompleted ? 'completed' : ''}" data-date="${dateString}" data-habit-id="${habitId}" title="${date.toLocaleDateString()}"></span>`;
                }).join('');

                const li = document.createElement('li');
                li.innerHTML = `<span></span><div class="habit-tracking-dots">${dailyTrackingHtml}</div><button class="button-danger" data-id="${habitId}">❌</button>`;
                li.querySelector('span').textContent = habit.name;
                habitsList.appendChild(li);
            });
        }, error => console.error("Hábitos: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        addHabitBtn.onclick = async () => {
            const habitName = newHabitInput.value.trim();
            if (habitName) {
                try {
                    await addDoc(habitsCollectionRef, { name: habitName, timestamp: new Date().toISOString(), dailyCompletions: {} });
                    newHabitInput.value = '';
                } catch (error) { console.error("Hábitos: Error al añadir:", error); }
            }
        };

        habitsList.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('habit-day-dot')) {
                const { habitId, date } = target.dataset;
                const habitRef = doc(habitsCollectionRef, habitId);
                try {
                    const docSnap = await getDoc(habitRef);
                    if (docSnap.exists()) {
                        const completions = docSnap.data().dailyCompletions || {};
                        const newCompletions = { ...completions, [date]: !completions[date] };
                        await updateDoc(habitRef, { dailyCompletions: newCompletions });
                    }
                } catch (error) { console.error("Hábitos: Error al actualizar:", error); }
            } else if (target.classList.contains('button-danger')) {
                const habitId = target.dataset.id;
                if (await window.showCustomConfirm('¿Eliminar este hábito?')) {
                    await deleteDoc(doc(habitsCollectionRef, habitId));
                }
            }
        });
    })();

    // --- Trello Logic ---
    (() => {
        const trelloApiKeyInput = document.getElementById('api-key');
        const trelloTokenInput = document.getElementById('token');
        const trelloBoardIdInput = document.getElementById('board-id');
        const trelloStatusDiv = document.getElementById('trello-status');
        const trelloSuccessMessage = document.getElementById('trello-success-message');
        const configTrelloBtn = document.getElementById('config-trello-btn');
        const testTrelloBtn = document.getElementById('test-trello-btn');
        const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn');
        const listaTareasUl = document.getElementById('listaTareas');
        const trelloBoardLinkHeader = document.getElementById('trello-board-link-header');

        if (!trelloApiKeyInput || !saveTrelloConfigBtn || !listaTareasUl || !trelloBoardLinkHeader) return;

        let boardUrl = '';

        const cargarTareasTrello = async () => {
            const configSnap = await getDoc(trelloConfigDocRef);
            if (!configSnap.exists()) return;
            const { apiKey, token, boardId } = configSnap.data();
            if (!apiKey || !token || !boardId) {
                listaTareasUl.innerHTML = '<li class="empty-section-message">Configura Trello para ver tus tareas.</li>';
                return;
            }
            listaTareasUl.innerHTML = '<li>Cargando tareas...</li>';
            try {
                const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
                if (!listsResponse.ok) throw new Error('Error al obtener listas de Trello.');
                const lists = await listsResponse.json();
                let allCards = [];
                for (const list of lists) {
                    const cardsResponse = await fetch(`https://api.trello.com/1/lists/${list.id}/cards?key=${apiKey}&token=${token}`);
                    const cards = await cardsResponse.json();
                    allCards = allCards.concat(cards);
                }
                const today = new Date();
                const monday = new Date(today);
                monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
                monday.setHours(0, 0, 0, 0);
                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4);
                friday.setHours(23, 59, 59, 999);

                const filteredCards = allCards.filter(card => card.due && !card.dueComplete && new Date(card.due) >= monday && new Date(card.due) <= friday);

                if (filteredCards.length > 0) {
                    listaTareasUl.innerHTML = filteredCards.map(card => `<li>${card.name} (Vence: ${new Date(card.due).toLocaleDateString()})</li>`).join('');
                } else {
                    listaTareasUl.innerHTML = '<li class="empty-section-message">No hay tareas que venzan esta semana.</li>';
                }
            } catch (error) {
                listaTareasUl.innerHTML = `<li class="empty-section-message">Error al cargar tareas: ${error.message}</li>`;
            }
        };

        const probarConexionTrello = async () => {
            const apiKey = trelloApiKeyInput.value.trim();
            const token = trelloTokenInput.value.trim();
            const boardId = trelloBoardIdInput.value.trim();
            if (!apiKey || !token || !boardId) {
                trelloStatusDiv.textContent = '❌ Configuración incompleta';
                return;
            }
            try {
                const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
                if (response.ok) {
                    trelloStatusDiv.textContent = '✅ Trello conectado';
                    trelloStatusDiv.className = 'status-indicator status-connected';
                    trelloSuccessMessage.style.display = 'block';
                    boardUrl = `https://trello.com/b/${boardId}`;
                    cargarTareasTrello();
                } else {
                    throw new Error('Respuesta no válida de Trello');
                }
            } catch (error) {
                trelloStatusDiv.textContent = `❌ Error: ${error.message}`;
                trelloStatusDiv.className = 'status-indicator status-disconnected';
                trelloSuccessMessage.style.display = 'none';
            }
        };

        const unsubscribe = onSnapshot(trelloConfigDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const config = docSnap.data();
                trelloApiKeyInput.value = config.apiKey || '';
                trelloTokenInput.value = config.token || '';
                trelloBoardIdInput.value = config.boardId || '';
                probarConexionTrello();
            }
        });
        unsubscribeListeners.push(unsubscribe);

        saveTrelloConfigBtn.onclick = async () => {
            const apiKey = trelloApiKeyInput.value.trim();
            const token = trelloTokenInput.value.trim();
            const boardId = trelloBoardIdInput.value.trim();
            if (apiKey && token && boardId) {
                await setDoc(trelloConfigDocRef, { apiKey, token, boardId });
                window.showTempMessage('Configuración de Trello guardada.', 'success');
                probarConexionTrello();
            } else {
                window.showTempMessage('Por favor, completa todos los campos.', 'warning');
            }
        };

        testTrelloBtn.onclick = probarConexionTrello;
        configTrelloBtn.onclick = () => window.mostrarSeccion('config');
        trelloBoardLinkHeader.onclick = () => {
            if (boardUrl) {
                window.open(boardUrl, '_blank');
            } else {
                window.showTempMessage('Configura Trello primero para abrir el tablero.', 'warning');
            }
        };
    })();

    // --- Blog & Nutrition Logic ---
    const createContentLoader = (collectionRef, contentDivId, refreshBtnId) => {
        const contentDiv = document.getElementById(contentDivId);
        const refreshBtn = document.getElementById(refreshBtnId);
        if (!contentDiv || !refreshBtn) return;

        const loadContent = async () => {
            contentDiv.innerHTML = '<p>Cargando...</p>';
            try {
                const q = query(collectionRef, orderBy('timestamp', 'desc'));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    contentDiv.innerHTML = '<p class="empty-section-message">No hay contenido disponible.</p>';
                    return;
                }
                contentDiv.innerHTML = snapshot.docs.map(docSnap => {
                    const item = docSnap.data();
                    return `<div class="blog-article-card">
                                <h4>${item.title}</h4>
                                <p>${item.content}</p>
                                <small>Fuente: ${item.source}</small>
                                ${item.url ? `<a href="${item.url}" target="_blank" class="article-link">Leer Más ↗</a>` : ''}
                            </div>`;
                }).join('');
            } catch (error) {
                console.error(`Error al cargar ${contentDivId}:`, error);
                contentDiv.innerHTML = `<p class="empty-section-message">Error al cargar contenido. Es posible que falte un índice en Firestore. Revisa la consola para más detalles.</p>`;
            }
        };
        refreshBtn.onclick = loadContent;
        loadContent();
    };

    createContentLoader(blogArticlesCollectionRef, 'blog-content', 'refresh-blog-btn');
    createContentLoader(nutricionCollectionRef, 'nutricion-content', 'refresh-nutricion-btn');

    // --- Clear Data Logic ---
    (() => {
        const clearDataBtn = document.getElementById('clear-data-btn');
        if (!clearDataBtn) return;
        clearDataBtn.onclick = async () => {
            if (await window.showCustomConfirm('¿Estás seguro? Se borrarán TODOS tus datos de esta app.')) {
                const batch = writeBatch(db);
                const collectionsToClear = [journalCollectionRef, checklistCollectionRef, habitsCollectionRef];
                const docsToClear = [pomodoroSettingsDocRef, trelloConfigDocRef, userSettingsRef];
                try {
                    for (const collRef of collectionsToClear) {
                        const snapshot = await getDocs(collRef);
                        snapshot.forEach(doc => batch.delete(doc.ref));
                    }
                    docsToClear.forEach(docRef => batch.delete(docRef));
                    await batch.commit();
                    window.showTempMessage('Datos limpiados. La página se recargará.', 'info');
                    setTimeout(() => location.reload(), 2000);
                } catch (error) {
                    window.showTempMessage(`Error al limpiar: ${error.message}`, 'error');
                }
            }
        }
    })();

    // --- Status Counters ---
    (() => {
        const checklistCountElement = document.getElementById('checklist-count');
        const habitsCountElement = document.getElementById('tasks-count');
        if (checklistCountElement) {
            const unsubscribe = onSnapshot(query(checklistCollectionRef), s => checklistCountElement.textContent = s.size);
            unsubscribeListeners.push(unsubscribe);
        }
        if (habitsCountElement) {
            const unsubscribe = onSnapshot(query(habitsCollectionRef), s => habitsCountElement.textContent = s.size);
            unsubscribeListeners.push(unsubscribe);
        }
    })();
}

// =================================================================================
// AUTHENTICATION & DOM LISTENERS
// =================================================================================
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        console.log('[Auth] onAuthStateChanged fired. user =', user);
        const userDisplayNameElement = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');
        const authButtonsWrapper = document.querySelector('.auth-buttons-wrapper');
        const emailAuthFormEl = document.getElementById('email-auth-form');
        const userIdDisplay = document.getElementById('user-id-display');
        const userInfoArea = document.getElementById('user-info-area');

        if (user) {
            if (userDisplayNameElement) {
                userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
            }
            if (userIdDisplay) userIdDisplay.textContent = `ID: ${user.uid}`;
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'none';
            if (emailAuthFormEl) {
                emailAuthFormEl.style.display = 'none';
                document.getElementById('email-auth-email').value = '';
                document.getElementById('email-auth-password').value = '';
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (userInfoArea) userInfoArea.classList.remove('auth-options-visible');

            // Recuperar token de Calendar (si existe)
            const storedToken = localStorage.getItem(CALENDAR_TOKEN_STORAGE_KEY);
            if (storedToken) {
                calendarAccessToken = storedToken;
                updateCalendarConnectionStatus(true);
            } else {
                updateCalendarConnectionStatus(false);
            }

            if (!isLoggingOut) {
                await loadAllUserData(user.uid);
                // Después de cargar datos, ir a la vista HOY
                window.mostrarSeccion('hoy');
            }
            isLoggingOut = false;
        } else {
            // Resetear UI de usuario
            if (userDisplayNameElement) userDisplayNameElement.textContent = 'Por favor, inicia sesión:';
            if (userIdDisplay) userIdDisplay.textContent = '';
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfoArea) userInfoArea.classList.add('auth-options-visible');

            // Limpiar listeners y datos visibles
            cleanupFirestoreListeners();
            const journalEntriesList = document.getElementById('journalEntriesList');
            const checkList = document.getElementById('checkList');
            const habitsList = document.getElementById('habitsList');
            const todayMits = document.getElementById('today-mits');
            const todayEventsList = document.getElementById('today-calendar-events-list');
            if (journalEntriesList) journalEntriesList.innerHTML = '';
            if (checkList) checkList.innerHTML = '';
            if (habitsList) habitsList.innerHTML = '';
            if (todayMits) todayMits.innerHTML = '';
            if (todayEventsList) todayEventsList.innerHTML = '';

            // Resetear estado de Calendar
            const eventsList = document.getElementById('calendar-events-list');
            if (eventsList) eventsList.innerHTML = '';
            calendarAccessToken = null;
            localStorage.removeItem(CALENDAR_TOKEN_STORAGE_KEY);
            updateCalendarConnectionStatus(false);

            if (!isLoggingOut) {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    }
                } catch (error) {
                    console.error("Error de inicio de sesión con token:", error);
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!auth) return;

    // Vista inicial: HOY
    window.mostrarSeccion('hoy');

    // Login con Google (Firebase + Calendar)
    document.getElementById('google-signin-btn').onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            // AGREGAR SCOPE PARA CALENDAR
            provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

            console.log('[Auth] Iniciando signInWithPopup con scope de Calendar...');
            const result = await signInWithPopup(auth, provider);
            console.log('[Auth] signInWithPopup result =', result);

            // OBTENER EL TOKEN DE ACCESO PARA CALENDAR
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential && credential.accessToken) {
                calendarAccessToken = credential.accessToken;
                localStorage.setItem(CALENDAR_TOKEN_STORAGE_KEY, credential.accessToken);
                console.log('[Calendar] Token de acceso guardado.');
                updateCalendarConnectionStatus(true);
                // Cargar eventos inmediatamente
                loadCalendarEvents();
                window.showTempMessage('Conectado a Google Calendar.', 'success');
            } else {
                console.warn('[Calendar] No se pudo obtener el token de acceso.');
            }

        } catch (error) {
            console.error("Error de inicio de sesión con Google:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                console.log('[Auth] El popup se cerró antes de completar el login.');
                return;
            }
            window.showTempMessage(`Error con Google: ${error.message}`, 'error');
        }
    };

    // Login anónimo
    const anonymousBtn = document.getElementById('anonymous-signin-btn');
    if (anonymousBtn) {
        anonymousBtn.onclick = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Error de inicio de sesión anónimo:", error);
                window.showTempMessage(`Error de sesión anónima: ${error.message}`, 'error');
            }
        };
    }

    // Login con Email/Contraseña
    const emailToggleBtn = document.getElementById('email-signin-toggle-btn');
    const emailAuthForm = document.getElementById('email-auth-form');
    const emailAuthEmailInput = document.getElementById('email-auth-email');
    const emailAuthPasswordInput = document.getElementById('email-auth-password');
    const emailSigninBtn = document.getElementById('email-signin-btn');
    const emailRegisterBtn = document.getElementById('email-register-btn');
    const emailAuthCancelBtn = document.getElementById('email-auth-cancel-btn');

    const getEmailAuthErrorMessage = (error) => {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'El email ingresado no es válido.';
            case 'auth/email-already-in-use':
                return 'Ya existe una cuenta con ese email.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email o contraseña incorrectos.';
            default:
                return error.message;
        }
    };

    if (emailToggleBtn && emailAuthForm) {
        emailToggleBtn.onclick = () => {
            emailAuthForm.style.display = emailAuthForm.style.display === 'none' ? 'flex' : 'none';
        };
    }

    if (emailAuthCancelBtn && emailAuthForm) {
        emailAuthCancelBtn.onclick = () => {
            emailAuthForm.style.display = 'none';
            emailAuthEmailInput.value = '';
            emailAuthPasswordInput.value = '';
        };
    }

    if (emailSigninBtn) {
        emailSigninBtn.onclick = async () => {
            const email = emailAuthEmailInput.value.trim();
            const password = emailAuthPasswordInput.value;
            if (!email || !password) {
                window.showTempMessage('Completa email y contraseña.', 'warning');
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Error de inicio de sesión con email:", error);
                window.showTempMessage(getEmailAuthErrorMessage(error), 'error');
            }
        };
    }

    if (emailRegisterBtn) {
        emailRegisterBtn.onclick = async () => {
            const email = emailAuthEmailInput.value.trim();
            const password = emailAuthPasswordInput.value;
            if (!email || !password) {
                window.showTempMessage('Completa email y contraseña.', 'warning');
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                window.showTempMessage('Cuenta creada exitosamente.', 'success');
            } catch (error) {
                console.error("Error de registro con email:", error);
                window.showTempMessage(getEmailAuthErrorMessage(error), 'error');
            }
        };
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (await window.showCustomConfirm("¿Cerrar sesión?")) {
                isLoggingOut = true;
                await signOut(auth);
            }
        };
    }

    // Navegación entre secciones
    document.querySelectorAll('.nav-tabs button').forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.id.replace('btn-', '');
            window.mostrarSeccion(sectionId);
        });
    });

    // Permisos de notificaciones
    (async () => {
        if (!("Notification" in window)) return;
        if (Notification.permission === 'granted') {
            notificationPermissionGranted = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            notificationPermissionGranted = permission === 'granted';
        }
    })();

    // Integración Calendar: handlers de botones
    const connectBtn = document.getElementById('connect-calendar-btn');
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.onclick = () => {
            if (!calendarAccessToken) {
                window.showTempMessage(
                    'Primero inicia sesión con Google usando el botón "Iniciar con Google" en la parte superior.',
                    'warning'
                );
                return;
            }
            updateCalendarConnectionStatus(true);
            loadCalendarEvents();
            window.showTempMessage('Cargando eventos de Google Calendar...', 'info');
        };
    }

    const disconnectBtn = document.getElementById('disconnect-calendar-btn');
    if (disconnectBtn) {
        disconnectBtn.onclick = handleDisconnectCalendar;
    }

    // Enlace desde HOY -> Calendario
    const goToCalendarFromHoy = document.getElementById('go-to-calendar-from-hoy');
    if (goToCalendarFromHoy) {
        goToCalendarFromHoy.onclick = (e) => {
            e.preventDefault();
            window.mostrarSeccion('calendario');
        };
    }

    // Controles de Pomodoro en la vista HOY (gatillan los botones del Pomodoro principal)
    const startToday = document.getElementById('pomodoro-start-today');
    const pauseToday = document.getElementById('pomodoro-pause-today');
    const resetToday = document.getElementById('pomodoro-reset-today');

    if (startToday) {
        startToday.onclick = () => {
            const btn = document.getElementById('start-timer-btn');
            if (btn) btn.click();
        };
    }
    if (pauseToday) {
        pauseToday.onclick = () => {
            const btn = document.getElementById('pause-pomodoro-btn');
            if (btn) btn.click();
        };
    }
    if (resetToday) {
        resetToday.onclick = () => {
            const btn = document.getElementById('reset-timer-btn');
            if (btn) btn.click();
        };
    }
});
