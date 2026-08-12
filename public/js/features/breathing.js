// =================================================================================
// RESPIRACIÓN: patrón y toggle compartidos entre la sección Pomodoro (guía
// automática en el descanso) y la sección Respiración (ejercicio a demanda).
// Estado en un doc de Firestore propio (antes vivía mezclado en
// pomodoroSettings/current) para que ambas secciones lean/escriban el mismo
// valor y se mantengan sincronizadas sin recargar la página.
// =================================================================================
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';

// `scale` es el tamaño del círculo/punto en esa fase: 1 = expandido
// (inhalando/sosteniendo con aire), 0.7 = contraído (exhalando/sosteniendo
// vacío). `description` se muestra en la sección Respiración para explicar
// cuándo conviene cada patrón.
export const BREATHING_PATTERNS = {
    '478': {
        label: '4-7-8 (relajación profunda)',
        description: 'La exhalación larga activa fuerte el sistema nervioso parasimpático — pensada para relajación profunda y ayudar a conciliar el sueño, no para recuperar el foco rápido.',
        phases: [
            { label: 'Inhalá... 4', duration: 4000, scale: 1 },
            { label: 'Sostené... 7', duration: 7000, scale: 1 },
            { label: 'Exhalá... 8', duration: 8000, scale: 0.7 },
        ],
    },
    box: {
        label: 'Cuadrada (enfoque y calma)',
        description: 'Ritmo simétrico con dos pausas (con aire y sin aire) — ayuda a recuperar la calma y el foco en un momento de estrés agudo.',
        phases: [
            { label: 'Inhalá... 4', duration: 4000, scale: 1 },
            { label: 'Sostené... 4', duration: 4000, scale: 1 },
            { label: 'Exhalá... 4', duration: 4000, scale: 0.7 },
            { label: 'Sostené... 4', duration: 4000, scale: 0.7 },
        ],
    },
    triangle: {
        label: 'Triangular (simple y rápida)',
        description: 'La más corta y simple de las tres (inhalar, sostener y exhalar en partes iguales) — buena puerta de entrada si nunca probaste respiración guiada.',
        phases: [
            { label: 'Inhalá... 4', duration: 4000, scale: 1 },
            { label: 'Sostené... 4', duration: 4000, scale: 1 },
            { label: 'Exhalá... 4', duration: 4000, scale: 0.7 },
        ],
    },
};
const DEFAULT_BREATHING_PATTERN = '478';

const PHASES_EXPLANATION = 'Cada ciclo tiene 3 momentos: "Inhalá" (llevás aire a los pulmones), "Sostené" (lo retenés, con o sin aire según la fase) y "Exhalá" (soltás el aire de a poco). Ir siguiendo el punto y el texto ayuda a no perder el ritmo mientras la mente todavía está acelerada.';

// Geometría del gráfico de línea del patrón: un punto se mueve sobre
// segmentos rectos (inhalar sube, sostener queda plano, exhalar baja). El
// ancho de cada segmento es proporcional a su duración real, así el punto
// llega a cada vértice justo cuando esa fase termina.
const PATH_WIDTH = 260;
const PATH_Y_HIGH = 15;
const PATH_Y_LOW = 55;

function phaseColorVar(label) {
    if (label.startsWith('Inhalá')) return 'var(--success-dark)';
    if (label.startsWith('Sostené')) return 'var(--info-dark)';
    return 'var(--warning-dark)'; // Exhalá
}

function getBreathingGeometry(patternKey) {
    const phases = (BREATHING_PATTERNS[patternKey] || BREATHING_PATTERNS[DEFAULT_BREATHING_PATTERN]).phases;
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    let x = 0;
    let y = phases[phases.length - 1].scale === 1 ? PATH_Y_HIGH : PATH_Y_LOW;
    const points = [[x, y]];
    const segments = [];
    phases.forEach(phase => {
        const xEnd = x + (phase.duration / totalDuration) * PATH_WIDTH;
        const yEnd = phase.scale === 1 ? PATH_Y_HIGH : PATH_Y_LOW;
        segments.push({ x1: x, y1: y, x2: xEnd, y2: yEnd, color: phaseColorVar(phase.label) });
        x = xEnd;
        y = yEnd;
        points.push([x, y]);
    });
    return { phases, points, segments };
}

let breathingSettingsRef = null;
let currentPattern = DEFAULT_BREATHING_PATTERN;
let enabledOnBreak = true;
const patternPickerContainerIds = [];
const settingsChangeListeners = [];
const activeRunners = new Set();

export function getCurrentBreathingPattern() {
    return currentPattern;
}

export function isBreathingEnabledOnBreak() {
    return enabledOnBreak;
}

// Se llama al toque con el estado actual, y de nuevo cada vez que cambia
// (patrón o toggle) — usado por pomodoro.js para mostrar/ocultar su propio
// selector de patrón según el toggle, sin necesitar su propio onSnapshot.
export function onBreathingSettingsChange(callback) {
    settingsChangeListeners.push(callback);
    callback({ pattern: currentPattern, enabledOnBreak });
}

export async function setBreathingPattern(value) {
    if (!BREATHING_PATTERNS[value] || !breathingSettingsRef) return;
    try {
        await setDoc(breathingSettingsRef, { pattern: value }, { merge: true });
    } catch (error) { console.error('Respiración: Error al guardar el patrón:', error); }
}

export async function setBreathingEnabledOnBreak(enabled) {
    if (!breathingSettingsRef) return;
    try {
        await setDoc(breathingSettingsRef, { enabledOnBreak: enabled }, { merge: true });
    } catch (error) { console.error('Respiración: Error al guardar el toggle:', error); }
}

function highlightPickerContainer(container, value) {
    container.querySelectorAll('.theme-option-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.value === value);
    });
}

function refreshPickers() {
    patternPickerContainerIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) highlightPickerContainer(container, currentPattern);
    });
}

// Se puede llamar más de una vez con contenedores distintos — es lo que
// permite que Pomodoro y Respiración muestren el mismo selector sincronizado.
export function renderBreathingPatternPicker(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    Object.entries(BREATHING_PATTERNS).forEach(([value, pattern]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option-btn';
        btn.dataset.value = value;
        btn.textContent = pattern.label;
        btn.onclick = () => setBreathingPattern(value);
        container.appendChild(btn);
    });
    highlightPickerContainer(container, currentPattern);

    if (!patternPickerContainerIds.includes(containerId)) patternPickerContainerIds.push(containerId);
}

// El checkbox vive en el HTML estático (mismo criterio que sound.js/motion.js
// para toggles) — esta función solo lo engancha y refleja el estado actual.
export function renderBreathingEnabledToggle(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) return;
    checkbox.checked = enabledOnBreak;
    checkbox.onchange = () => setBreathingEnabledOnBreak(checkbox.checked);

    onBreathingSettingsChange(({ enabledOnBreak: value }) => {
        checkbox.checked = value;
    });
}

// La máquina de animación en sí. Cada instancia (Pomodoro y Respiración usan
// la suya, en paralelo) tiene su propia fase/temporizador, pero ambas leen
// el mismo patrón elegido — por eso, si el patrón cambia mientras una
// instancia está corriendo, se reinicia sola en la fase 0 con el patrón
// nuevo (ver onSnapshot más abajo).
export function createBreathingRunner(guideElements) {
    const guides = guideElements.filter(Boolean);
    let timeoutId = null;
    let running = false;

    const runPhase = (phaseIndex) => {
        const { phases, points, segments } = getBreathingGeometry(currentPattern);
        const phase = phases[phaseIndex % phases.length];
        // El punto se mueve por transform (no @keyframes) para que el estado
        // visual y el texto nunca se desincronicen: si la sección estaba en
        // display:none (otra pestaña activa) una animación CSS reiniciaría
        // desde 0%, pero un estilo inline no depende de eso.
        guides.forEach(guide => {
            const label = guide.querySelector('.breathing-label');
            if (label) label.textContent = phase.label;

            const dot = guide.querySelector('.breathing-dot');
            if (phaseIndex === 0) {
                const segmentsGroup = guide.querySelector('.breathing-segments');
                if (segmentsGroup) {
                    segmentsGroup.innerHTML = '';
                    segments.forEach(seg => {
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', seg.x1);
                        line.setAttribute('y1', seg.y1);
                        line.setAttribute('x2', seg.x2);
                        line.setAttribute('y2', seg.y2);
                        line.setAttribute('stroke', seg.color);
                        line.setAttribute('stroke-width', '4');
                        line.setAttribute('stroke-linecap', 'round');
                        segmentsGroup.appendChild(line);
                    });
                }
                if (dot) {
                    dot.style.transitionDuration = '0ms';
                    dot.style.transform = `translate(${points[0][0]}px, ${points[0][1]}px)`;
                    dot.getBoundingClientRect(); // fuerza reflow: el próximo cambio sí debe animar
                }
            }
            if (dot) {
                const target = points[phaseIndex + 1];
                dot.style.transitionDuration = `${phase.duration}ms`;
                dot.style.transform = `translate(${target[0]}px, ${target[1]}px)`;
            }
        });
        timeoutId = setTimeout(() => runPhase((phaseIndex + 1) % phases.length), phase.duration);
    };

    const runner = {
        start() {
            if (!guides.length || running) return;
            running = true;
            activeRunners.add(runner);
            guides.forEach(guide => { guide.hidden = false; });
            runPhase(0);
        },
        stop() {
            if (!running) return;
            running = false;
            activeRunners.delete(runner);
            clearTimeout(timeoutId);
            guides.forEach(guide => { guide.hidden = true; });
        },
        isRunning() {
            return running;
        },
        restartFromZero() {
            if (!running) return;
            clearTimeout(timeoutId);
            runPhase(0);
        },
    };
    return runner;
}

function renderPhasesExplanation() {
    const container = document.getElementById('breathing-phases-explanation');
    if (!container) return;
    container.textContent = PHASES_EXPLANATION;
}

function updateStandaloneDescription() {
    const container = document.getElementById('breathing-pattern-description');
    if (!container) return;
    container.textContent = BREATHING_PATTERNS[currentPattern].description;
}

function wireStandaloneControls() {
    const guide = document.getElementById('breathing-guide-standalone');
    if (!guide) return;
    const runner = createBreathingRunner([guide]);
    const startBtn = document.getElementById('breathing-standalone-start-btn');
    const stopBtn = document.getElementById('breathing-standalone-stop-btn');
    if (startBtn) startBtn.onclick = () => runner.start();
    if (stopBtn) stopBtn.onclick = () => runner.stop();
}

export function initBreathing(db, userId) {
    breathingSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'breathingSettings', 'current');

    renderPhasesExplanation();
    renderBreathingPatternPicker('breathing-pattern-options-standalone');
    updateStandaloneDescription();
    wireStandaloneControls();

    const unsubscribe = onSnapshot(breathingSettingsRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        const previousPattern = currentPattern;

        currentPattern = BREATHING_PATTERNS[data.pattern] ? data.pattern : DEFAULT_BREATHING_PATTERN;
        enabledOnBreak = data.enabledOnBreak !== undefined ? !!data.enabledOnBreak : true;

        refreshPickers();
        updateStandaloneDescription();
        if (currentPattern !== previousPattern) {
            activeRunners.forEach(runner => runner.restartFromZero());
        }
        settingsChangeListeners.forEach(cb => cb({ pattern: currentPattern, enabledOnBreak }));
    }, error => console.error('Respiración: Error al escuchar la configuración:', error));
    registerListener(unsubscribe);
}
