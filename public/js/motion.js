// =================================================================================
// CONTROL GLOBAL DE MOVIMIENTO REDUCIDO: mismo patrón que sound.js, pero el
// valor por defecto (antes de que el usuario elija algo) respeta la
// preferencia del sistema operativo (prefers-reduced-motion).
// =================================================================================
const REDUCED_MOTION_KEY = 'reducedMotion';

function systemPrefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function isReducedMotionEnabled() {
    const stored = localStorage.getItem(REDUCED_MOTION_KEY);
    return stored !== null ? stored === 'true' : systemPrefersReducedMotion();
}

export function setReducedMotionEnabled(enabled) {
    localStorage.setItem(REDUCED_MOTION_KEY, String(enabled));
    applyReducedMotion(enabled);
}

function applyReducedMotion(enabled) {
    document.documentElement.setAttribute('data-reduced-motion', String(enabled));
}

export function wireMotionToggle() {
    const toggleBtn = document.getElementById('motion-toggle-btn');
    if (!toggleBtn) return;

    const updateLabel = () => {
        const enabled = isReducedMotionEnabled();
        toggleBtn.textContent = enabled ? '🐢 Movimiento reducido' : '🎬 Movimiento normal';
        toggleBtn.setAttribute('aria-pressed', String(enabled));
    };

    applyReducedMotion(isReducedMotionEnabled());
    updateLabel();
    toggleBtn.onclick = () => {
        setReducedMotionEnabled(!isReducedMotionEnabled());
        updateLabel();
    };
}
