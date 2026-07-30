// =================================================================================
// CONTROL GLOBAL DE SONIDO: mute/unmute persistido, usado por Pomodoro y Checklist
// =================================================================================
const SOUND_ENABLED_KEY = 'soundEnabled';

export function isSoundEnabled() {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
}

export function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

export function playSound(elementId) {
    if (!isSoundEnabled()) return;
    const el = document.getElementById(elementId);
    if (el) el.play().catch(err => console.error(err));
}

export function wireSoundToggle() {
    const toggleBtn = document.getElementById('sound-toggle-btn');
    if (!toggleBtn) return;

    const updateLabel = () => {
        const enabled = isSoundEnabled();
        toggleBtn.textContent = enabled ? '🔊 Sonidos activados' : '🔇 Sonidos silenciados';
        toggleBtn.setAttribute('aria-pressed', String(enabled));
    };

    updateLabel();
    toggleBtn.onclick = () => {
        setSoundEnabled(!isSoundEnabled());
        updateLabel();
    };
}
