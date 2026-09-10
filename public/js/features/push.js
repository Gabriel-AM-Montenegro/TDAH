// =================================================================================
// NOTIFICACIONES PUSH REALES: recordatorios de Checklist y "Pomodoro terminado"
// que llegan aunque la app esté cerrada (las Cloud Functions en functions/
// son las que efectivamente los mandan; acá solo se registra el dispositivo).
// =================================================================================
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";
import { messaging, publicDataDocId } from '../firebase.js';

// Clave pública VAPID del proyecto (Firebase Console → Project Settings →
// Cloud Messaging → Web Push certificates). No es un secreto — identifica
// al proyecto, no autoriza nada por sí sola — mismo criterio que el resto
// de las claves públicas ya en el código (Google/Microsoft Client ID).
const VAPID_KEY = 'BC8amjDsCr3SOKUxSzLBnVPeWxEnb6MJYVqKid3tHV1odzmDl2wxz_RAmehz73o4sVAzWat9xB07eiYe63ab80Y';

export async function initPush(db, userId) {
    if (!messaging) {
        console.warn('Push: "messaging" no está inicializado (localhost/emulador, o getMessaging() no soportado — ver consola al cargar la app).');
        return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push: este navegador no tiene Notification API o Service Worker.');
        return;
    }

    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') {
        console.warn('Push: permiso de notificaciones no concedido (' + Notification.permission + ').');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) return;

        const tokenRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'pushTokens', token);
        await setDoc(tokenRef, { createdAt: serverTimestamp(), userAgent: navigator.userAgent }, { merge: true });

        const settingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await setDoc(settingsRef, { timezone }, { merge: true });
    } catch (error) {
        // No es crítico para el resto de la app — solo significa que esta
        // sesión no va a recibir push reales, sigue funcionando todo igual.
        console.error('Push: no se pudo registrar el dispositivo:', error);
    }
}
