// =================================================================================
// POMODORO
// =================================================================================
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, showCustomConfirm, triggerConfetti } from '../ui.js';
import { isNotificationPermissionGranted } from '../notifications.js';
import { playSound } from '../sound.js';

// initPomodoro asigna esto una vez que arma su propio startTimer/setFocusLabel.
// Evita un import circular entre checklist.js y pomodoro.js.
let focusOnHandler = null;

export function startFocusOn(text) {
    if (focusOnHandler) focusOnHandler(text);
}

// Guía de respiración 4-7-8 durante los descansos (Ítem 1, segunda tanda UX ADHD).
const BREATHING_PHASES = [
    { label: 'Inhalá... 4', duration: 4000 },
    { label: 'Sostené... 7', duration: 7000 },
    { label: 'Exhalá... 8', duration: 8000 },
];

export function initPomodoro(db, userId) {
    const pomodoroSettingsDocRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'pomodoroSettings', 'current');

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
    const focusLabel = document.getElementById('pomodoro-today-focus-label');
    const breathingGuides = [document.getElementById('breathing-guide'), document.getElementById('breathing-guide-today')].filter(Boolean);
    let breathingTimeoutId = null;

    const runBreathingPhase = (phaseIndex) => {
        const phase = BREATHING_PHASES[phaseIndex];
        breathingGuides.forEach(guide => {
            const label = guide.querySelector('.breathing-label');
            if (label) label.textContent = phase.label;
        });
        breathingTimeoutId = setTimeout(() => {
            runBreathingPhase((phaseIndex + 1) % BREATHING_PHASES.length);
        }, phase.duration);
    };

    const startBreathingGuide = () => {
        if (!breathingGuides.length) return;
        breathingGuides.forEach(guide => { guide.hidden = false; });
        runBreathingPhase(0);
    };

    const stopBreathingGuide = () => {
        clearTimeout(breathingTimeoutId);
        breathingGuides.forEach(guide => { guide.hidden = true; });
    };

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
        const strokeColor = isBreakTime ? 'var(--accent-text-secondary)' : 'var(--accent-text)';
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
            triggerConfetti();
            playSound('sound-complete');
            if (isNotificationPermissionGranted()) new Notification('¡Pomodoro Terminado!', { body: '¡Excelente trabajo! Es hora de un descanso.' });

            setTimeout(async () => {
                if (await showCustomConfirm(`¡Excelente trabajo! ¿Comenzar descanso de ${breakTime} minutos?`)) {
                    isBreakTime = true;
                    timeLeft = breakTime * 60;
                    totalTimeForPomodoro = breakTime * 60;
                    playSound('sound-break');
                    startTimer();
                    startBreathingGuide();
                } else {
                    resetTimer();
                }
            }, 1000);
        } else {
            showTempMessage('¡Descanso terminado! Es hora de volver a concentrarse.', 'info');
            if (isNotificationPermissionGranted()) new Notification('¡Descanso Terminado!', { body: '¡Es hora de volver al trabajo!' });
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
        showTempMessage('Temporizador pausado.', 'info');
    };

    const resetTimer = () => {
        clearInterval(timer);
        isRunning = false;
        isBreakTime = false;
        timeLeft = focusTime * 60;
        totalTimeForPomodoro = focusTime * 60;
        updateTimerDisplay();
        savePomodoroState(timeLeft, false, isBreakTime);
        showTempMessage('Temporizador reiniciado.', 'info');
        if (focusLabel) focusLabel.textContent = '';
        stopBreathingGuide();
    };

    // Guardar configuración de tiempos
    if (savePomodoroConfigBtn) {
        savePomodoroConfigBtn.onclick = async () => {
            const newFocusTime = parseInt(focusTimeInput.value);
            const newBreakTime = parseInt(breakTimeInput.value);

            if (isNaN(newFocusTime) || newFocusTime < 1 || newFocusTime > 120) {
                showTempMessage('El tiempo de concentración debe estar entre 1 y 120 minutos.', 'warning');
                return;
            }

            if (isNaN(newBreakTime) || newBreakTime < 1 || newBreakTime > 60) {
                showTempMessage('El tiempo de descanso debe estar entre 1 y 60 minutos.', 'warning');
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
            showTempMessage('Configuración guardada exitosamente.', 'success');
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
                    if (isBreakTime) startBreathingGuide();
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
    registerListener(unsubscribe);

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

    // Fase 2 UX ADHD: permite arrancar el Pomodoro directo desde un MIT de Hoy.
    focusOnHandler = (text) => {
        if (focusLabel) focusLabel.textContent = text ? `🎯 Enfocado en: ${text}` : '';
        if (!isRunning) startTimer();
    };
}
