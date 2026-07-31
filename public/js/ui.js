// =================================================================================
// HELPERS DE UI COMPARTIDOS ENTRE FEATURES
// =================================================================================

export const SECTION_TITLES = {
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

export function showTempMessage(message, type = 'info', duration = 3000) {
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
}

export function showCustomConfirm(message) {
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
}

export function triggerConfetti() {
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
}

export function renderEmptyState(container, { message, actionLabel, onAction, tag = 'li' } = {}) {
    container.innerHTML = '';
    const wrapper = document.createElement(tag);
    wrapper.className = 'empty-section-message';

    const text = document.createElement('p');
    text.textContent = message;
    wrapper.appendChild(text);

    if (actionLabel && onAction) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'empty-state-action';
        btn.textContent = actionLabel;
        btn.onclick = onAction;
        wrapper.appendChild(btn);
    }

    container.appendChild(wrapper);
}

export function mostrarSeccion(seccionId) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    const seccionActiva = document.getElementById(seccionId);
    const botonActivo = document.getElementById(`btn-${seccionId}`);
    if (seccionActiva) seccionActiva.classList.add('active');
    if (botonActivo) botonActivo.classList.add('active');
    document.title = SECTION_TITLES[seccionId] ? `App TDAH - ${SECTION_TITLES[seccionId]}` : 'App TDAH';

    // No dejar el grupo de navegación abierto después de elegir una sección.
    document.querySelectorAll('.nav-tabs details[open]').forEach(d => d.removeAttribute('open'));
}

// Se mantienen expuestos en window: no hay uso interno que lo requiera hoy,
// pero minimiza el riesgo de romper algo externo no visto (ver CLAUDE.md).
window.showTempMessage = showTempMessage;
window.showCustomConfirm = showCustomConfirm;
window.triggerConfetti = triggerConfetti;
window.mostrarSeccion = mostrarSeccion;
