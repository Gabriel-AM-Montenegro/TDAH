// =================================================================================
// SISTEMA DE PUNTOS: refuerzo simple ligado a completar MITs y hábitos del día
// (Ítem 2, segunda tanda UX ADHD). A propósito NO tiene niveles, rachas ni
// tablas de posiciones — solo un contador acumulado que nunca baja.
// =================================================================================
import { doc, onSnapshot, setDoc, increment } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';

export const POINTS_PER_MIT = 10;
export const POINTS_PER_HABIT = 5;

let pointsDocRef = null;

export function initPoints(db, userId) {
    pointsDocRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'points', 'current');
    const displayEl = document.getElementById('points-display');

    const unsubscribe = onSnapshot(pointsDocRef, (docSnap) => {
        const total = docSnap.exists() ? (docSnap.data().total || 0) : 0;
        if (displayEl) displayEl.textContent = `⭐ ${total} puntos`;
    }, error => console.error("Puntos: Error al escuchar:", error));
    registerListener(unsubscribe);
}

export async function addPoints(amount) {
    if (!pointsDocRef) return;
    try {
        await setDoc(pointsDocRef, { total: increment(amount) }, { merge: true });
    } catch (error) { console.error("Puntos: Error al sumar:", error); }
}
