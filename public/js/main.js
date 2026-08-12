// =================================================================================
// ENTRY POINT: orquesta la carga de datos del usuario y el wiring que no
// pertenece a ninguna feature en particular (nav tabs, permiso de notificaciones).
// =================================================================================
import { collection, doc, onSnapshot, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { db, auth, publicDataDocId } from './firebase.js';
import { registerListener, cleanupListeners } from './listeners.js';
import { showTempMessage, showCustomConfirm, mostrarSeccion, showUpdateBanner } from './ui.js';
import { wireCalendarButtons } from './features/calendar.js';
import { wireOutlookButtons } from './features/outlook-calendar.js';
import { initWelcomeTour } from './features/welcome-tour.js';
import { initJournal } from './features/journal.js';
import { initHabits } from './features/habits.js';
import { initTrello } from './features/trello.js';
import { initBlog, initNutricion } from './features/content-feed.js';
import { initPomodoro } from './features/pomodoro.js';
import { initChecklist } from './features/checklist.js';
import { requestNotificationPermission } from './notifications.js';
import { initAuthStateListener, wireAuthButtons } from './auth.js';
import { wireSoundToggle, wireSoundVolumeControl, wireSoundTestButtons } from './sound.js';
import { wireMotionToggle } from './motion.js';
import { initTheme } from './features/theme.js';
import { initPoints } from './features/points.js';

async function loadAllUserData(currentUserId) {
    console.log("loadAllUserData: Cargando datos para el usuario:", currentUserId);
    if (!db || !auth || !currentUserId) {
        return;
    }

    cleanupListeners();

    const user = auth.currentUser;
    const userDisplayNameElement = document.getElementById('user-display-name');
    if (userDisplayNameElement) {
        userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
    }
    showTempMessage(`Sesión iniciada.`, 'info');

    const journalCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'journalEntries');
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'checklistItems');
    const pomodoroSettingsDocRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'pomodoroSettings', 'current');
    const trelloConfigDocRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'trelloConfig', 'settings');
    const habitsCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'habits');
    const userSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', currentUserId, 'settings', 'appSettings');

    initWelcomeTour(db, currentUserId);
    initTheme(db, currentUserId);
    initPoints(db, currentUserId);
    initJournal(db, currentUserId);
    initPomodoro(db, currentUserId);
    initChecklist(db, currentUserId);
    initHabits(db, currentUserId);
    initTrello(db, currentUserId);
    initBlog(db);
    initNutricion(db);

    // --- Clear Data Logic ---
    (() => {
        const clearDataBtn = document.getElementById('clear-data-btn');
        if (!clearDataBtn) return;
        clearDataBtn.onclick = async () => {
            if (await showCustomConfirm('¿Estás seguro? Se borrarán TODOS tus datos de esta app.')) {
                const batch = writeBatch(db);
                const collectionsToClear = [journalCollectionRef, checklistCollectionRef, habitsCollectionRef];
                const docsToClear = [pomodoroSettingsDocRef, trelloConfigDocRef, userSettingsRef];
                try {
                    for (const collRef of collectionsToClear) {
                        const snapshot = await getDocs(collRef);
                        snapshot.forEach(doc => batch.delete(doc.ref));
                    }
                    docsToClear.forEach(docRef => batch.delete(docRef));
                    await batch.commit();
                    showTempMessage('Datos limpiados. La página se recargará.', 'info');
                    setTimeout(() => location.reload(), 2000);
                } catch (error) {
                    console.error("Error al limpiar datos:", error);
                    showTempMessage('No se pudieron borrar los datos. Probá de nuevo.', 'error');
                }
            }
        }
    })();

    // --- Status Counters ---
    (() => {
        const checklistCountElement = document.getElementById('checklist-count');
        const habitsCountElement = document.getElementById('tasks-count');
        if (checklistCountElement) {
            const unsubscribe = onSnapshot(checklistCollectionRef, s => checklistCountElement.textContent = s.size);
            registerListener(unsubscribe);
        }
        if (habitsCountElement) {
            const unsubscribe = onSnapshot(habitsCollectionRef, s => habitsCountElement.textContent = s.size);
            registerListener(unsubscribe);
        }
    })();
}

initAuthStateListener(loadAllUserData);

document.addEventListener('DOMContentLoaded', () => {
    if (!auth) return;

    // Vista inicial: HOY
    mostrarSeccion('hoy');

    wireAuthButtons();

    // Navegación entre secciones
    document.querySelectorAll('.nav-tabs button').forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.id.replace('btn-', '');
            mostrarSeccion(sectionId);
        });
    });

    // Permisos de notificaciones
    requestNotificationPermission();

    wireCalendarButtons();
    wireOutlookButtons();
    wireSoundToggle();
    wireSoundVolumeControl();
    wireSoundTestButtons();
    wireMotionToggle();

    if ('serviceWorker' in navigator) {
        const promptToUpdate = (worker) => {
            showUpdateBanner(() => worker.postMessage({ type: 'SKIP_WAITING' }));
        };

        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                // Puede haber una actualización que ya estaba esperando de una
                // visita anterior (ej. la app quedó suspendida en segundo
                // plano en iOS sin llegar a recargarse).
                if (registration.waiting) promptToUpdate(registration.waiting);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        // "installed" + ya hay un controller = es una
                        // actualización, no la primera instalación.
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            promptToUpdate(newWorker);
                        }
                    });
                });

                // El navegador solo revisa actualizaciones al navegar — en
                // una PWA standalone que queda abierta mucho tiempo (o
                // suspendida en iOS) eso casi no pasa, así que forzamos el
                // chequeo cada vez que la app vuelve a primer plano.
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') registration.update();
                });
            })
            .catch(error => console.error('Service Worker: Error al registrar:', error));

        let reloadedForUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloadedForUpdate) return;
            reloadedForUpdate = true;
            window.location.reload();
        });
    }
});
