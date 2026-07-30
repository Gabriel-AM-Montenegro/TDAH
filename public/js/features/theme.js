// =================================================================================
// TEMAS DE COLOR: Claro / Oscuro / Suave
// =================================================================================
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';

const THEMES = [
    { value: 'light', label: '☀️ Claro' },
    { value: 'dark', label: '🌙 Oscuro' },
    { value: 'soft', label: '🌸 Suave' },
];

const THEME_STORAGE_KEY = 'theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initTheme(db, userId) {
    const container = document.getElementById('theme-options');
    if (!container) return;

    const userSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');

    const highlightSelected = (theme) => {
        container.querySelectorAll('.theme-option-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.value === theme);
        });
    };

    container.innerHTML = '';
    THEMES.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option-btn';
        btn.dataset.value = t.value;
        btn.textContent = t.label;
        btn.onclick = async () => {
            applyTheme(t.value);
            highlightSelected(t.value);
            try {
                await setDoc(userSettingsRef, { theme: t.value }, { merge: true });
            } catch (error) { console.error('Theme: Error al guardar:', error); }
        };
        container.appendChild(btn);
    });

    const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
        const theme = docSnap.exists() && THEMES.some(t => t.value === docSnap.data().theme)
            ? docSnap.data().theme
            : 'light';
        applyTheme(theme);
        highlightSelected(theme);
    }, error => console.error('Theme: Error al escuchar:', error));
    registerListener(unsubscribe);
}
