// =================================================================================
// MI MENÚ: cada usuario elige hasta 6 secciones favoritas que aparecen sueltas
// junto a "Hoy", sin abrir los grupos plegados. Sin favoritos, el menú queda
// exactamente igual que siempre.
//
// Se MUEVEN los <button> existentes entre contenedores (no se clonan): así
// conservan su id y el listener de click que main.js les puso al arrancar.
// =================================================================================
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage } from '../ui.js';

const MAX_FAVORITES = 6;
const STORAGE_KEY = 'navFavorites';

// Orden canónico del menú (el mismo que el de index.html, grupo por grupo).
// Sin 'hoy' ni 'config': esos dos siempre están sueltos.
const SECTION_IDS = [
    'pomodoro', 'checklist', 'garage-ideas', 'habitos', 'tareas', 'calendario',
    'journal', 'respiracion', 'tecnicas',
    'notas', 'nutricion'
];

let homes = null;
let settingsRef = null;
let currentFavorites = [];

function captureHomes() {
    if (homes) return;
    const captured = new Map();
    SECTION_IDS.forEach(id => {
        const button = document.getElementById(`btn-${id}`);
        if (button) captured.set(id, { button, parent: button.parentElement });
    });
    if (captured.size) homes = captured;
}

function sanitize(ids) {
    if (!Array.isArray(ids)) return [];
    return SECTION_IDS.filter(id => ids.includes(id)).slice(0, MAX_FAVORITES);
}

function readCache() {
    try {
        return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
        return [];
    }
}

function writeCache(favorites) {
    try {
        if (favorites.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        else localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* sin localStorage (modo privado): solo se pierde el cache */ }
}

function renderOptions() {
    const container = document.getElementById('nav-favorites-options');
    if (!container || !homes) return;

    container.innerHTML = '';
    const isFull = currentFavorites.length >= MAX_FAVORITES;

    SECTION_IDS.forEach(id => {
        const home = homes.get(id);
        if (!home) return;
        const isChecked = currentFavorites.includes(id);

        const label = document.createElement('label');
        label.className = 'nav-favorite-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.disabled = !settingsRef || (!isChecked && isFull);
        checkbox.onchange = () => toggleFavorite(id, checkbox.checked);

        const text = document.createElement('span');
        text.textContent = home.button.textContent.trim();

        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
    });

    if (isFull) {
        const note = document.createElement('p');
        note.className = 'help-text';
        note.textContent = `Llegaste al máximo de ${MAX_FAVORITES}. Destildá una para elegir otra.`;
        container.appendChild(note);
    }
}

export function applyNavFavorites(ids) {
    captureHomes();
    const container = document.getElementById('nav-favorites');
    if (!homes || !container) return;

    const favorites = sanitize(ids);
    currentFavorites = favorites;

    // Primero todos a su casa en orden canónico, después los favoritos afuera.
    SECTION_IDS.forEach(id => {
        const home = homes.get(id);
        if (home) home.parent.appendChild(home.button);
    });
    SECTION_IDS.filter(id => favorites.includes(id)).forEach(id => {
        const home = homes.get(id);
        if (home) container.appendChild(home.button);
    });

    container.hidden = favorites.length === 0;
    document.querySelectorAll('.nav-tabs details.nav-group').forEach(group => {
        group.hidden = !group.querySelector('.nav-group-buttons button');
    });

    renderOptions();
}

export function applyNavFavoritesFromCache() {
    applyNavFavorites(readCache());
}

// Al cerrar sesión: vuelve al menú por defecto y no deja favoritos de la
// cuenta anterior en el cache del navegador.
export function resetNavFavorites() {
    settingsRef = null;
    writeCache([]);
    applyNavFavorites([]);
}

async function toggleFavorite(id, shouldBeFavorite) {
    if (!settingsRef) return;
    const next = SECTION_IDS.filter(sectionId =>
        sectionId === id ? shouldBeFavorite : currentFavorites.includes(sectionId)
    ).slice(0, MAX_FAVORITES);

    try {
        // El onSnapshot de abajo aplica el cambio (también el optimista local),
        // y si el guardado falla lo revierte solo.
        await setDoc(settingsRef, { navFavorites: next }, { merge: true });
    } catch (error) {
        console.error('Mi menú: Error al guardar:', error);
        showTempMessage('No se pudo guardar tu menú. Probá de nuevo.', 'error');
    }
}

export function initNavFavorites(db, userId) {
    settingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');

    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        const favorites = sanitize(data.navFavorites);
        writeCache(favorites);
        applyNavFavorites(favorites);
    }, error => console.error('Mi menú: Error al escuchar:', error));
    registerListener(unsubscribe);
}
