// =================================================================================
// TEMAS DE COLOR (Claro / Oscuro / Suave) Y TAMAÑO DE TEXTO (Normal / Grande),
// ambos persistidos en el mismo doc de settings + localStorage.
// =================================================================================
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';

const THEMES = [
    { value: 'light', label: '☀️ Claro' },
    { value: 'dark', label: '🌙 Oscuro' },
    { value: 'soft', label: '🌸 Suave' },
];

const TEXT_SIZES = [
    { value: 'normal', label: 'Aa Normal' },
    { value: 'large', label: 'Aa Grande' },
];

const THEME_STORAGE_KEY = 'theme';
const TEXT_SIZE_STORAGE_KEY = 'textSize';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function applyTextSize(textSize) {
    document.documentElement.setAttribute('data-text-size', textSize);
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
}

function wireOptionButtons(container, options, currentAttrGetter, onSelect) {
    if (!container) return null;

    const highlightSelected = (value) => {
        container.querySelectorAll('.theme-option-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.value === value);
        });
    };

    container.innerHTML = '';
    options.forEach(o => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option-btn';
        btn.dataset.value = o.value;
        btn.textContent = o.label;
        btn.onclick = () => onSelect(o.value, highlightSelected);
        container.appendChild(btn);
    });

    return highlightSelected;
}

export function initTheme(db, userId) {
    const themeContainer = document.getElementById('theme-options');
    const textSizeContainer = document.getElementById('text-size-options');
    if (!themeContainer && !textSizeContainer) return;

    const userSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');

    const highlightSelectedTheme = wireOptionButtons(themeContainer, THEMES, null, async (value, highlight) => {
        applyTheme(value);
        highlight(value);
        try {
            await setDoc(userSettingsRef, { theme: value }, { merge: true });
        } catch (error) { console.error('Theme: Error al guardar:', error); }
    });

    const highlightSelectedTextSize = wireOptionButtons(textSizeContainer, TEXT_SIZES, null, async (value, highlight) => {
        applyTextSize(value);
        highlight(value);
        try {
            await setDoc(userSettingsRef, { textSize: value }, { merge: true });
        } catch (error) { console.error('Tamaño de texto: Error al guardar:', error); }
    });

    const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};

        const theme = THEMES.some(t => t.value === data.theme) ? data.theme : 'light';
        applyTheme(theme);
        if (highlightSelectedTheme) highlightSelectedTheme(theme);

        const textSize = TEXT_SIZES.some(t => t.value === data.textSize) ? data.textSize : 'normal';
        applyTextSize(textSize);
        if (highlightSelectedTextSize) highlightSelectedTextSize(textSize);
    }, error => console.error('Theme: Error al escuchar:', error));
    registerListener(unsubscribe);
}
