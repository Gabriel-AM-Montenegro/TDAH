// =================================================================================
// CONTROL GLOBAL DE SONIDO: mute/unmute y volumen, persistidos en localStorage.
// Usado por Pomodoro y Checklist.
// =================================================================================
const SOUND_ENABLED_KEY = 'soundEnabled';
const SOUND_VOLUME_KEY = 'soundVolume';

export function isSoundEnabled() {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
}

export function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

// Volumen 0-1. Un solo control global (no uno por sonido) — misma idea de
// "un control simple y consolidado" que ya se usó en el resto de la app.
export function getSoundVolume() {
    const stored = parseFloat(localStorage.getItem(SOUND_VOLUME_KEY));
    return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 1;
}

export function setSoundVolume(volume) {
    localStorage.setItem(SOUND_VOLUME_KEY, String(volume));
}

export function playSound(elementId) {
    if (!isSoundEnabled()) return;
    playSoundPreview(elementId);
}

// Igual que playSound(), pero ignora el mute — para el botón "Probar sonido"
// de Configuración, donde el usuario pide explícitamente escucharlo.
export function playSoundPreview(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.volume = getSoundVolume();
    el.currentTime = 0;
    el.play().catch(err => console.error(err));
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

export function wireSoundVolumeControl() {
    const volumeInput = document.getElementById('sound-volume-input');
    const volumeLabel = document.getElementById('sound-volume-label');
    if (!volumeInput) return;

    const updateLabel = (percent) => {
        if (volumeLabel) volumeLabel.textContent = `${percent}%`;
    };

    const initialPercent = Math.round(getSoundVolume() * 100);
    volumeInput.value = String(initialPercent);
    updateLabel(initialPercent);

    volumeInput.oninput = () => {
        const percent = Number(volumeInput.value);
        setSoundVolume(percent / 100);
        updateLabel(percent);
    };
}

export function wireSoundTestButtons() {
    const buttonToSound = {
        'test-sound-task-done': 'sound-task-done',
        'test-sound-complete': 'sound-complete',
        'test-sound-break': 'sound-break',
    };
    Object.entries(buttonToSound).forEach(([btnId, soundId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.onclick = () => playSoundPreview(soundId);
    });
}
