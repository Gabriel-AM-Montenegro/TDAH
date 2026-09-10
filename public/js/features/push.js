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

// Diagnóstico temporal en pantalla (2026-09-10): sin acceso a la consola real
// del dispositivo donde estaba fallando, esto muestra el motivo directo en la
// propia app. Sacar una vez que el registro de push funcione de forma
// confiable — no es parte del diseño final, es una herramienta de esta
// investigación puntual.
function showPushDebug(message) {
    console.warn('Push:', message);
    let el = document.getElementById('push-debug-banner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'push-debug-banner';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#111;color:#0f0;font:12px monospace;padding:10px;max-height:40vh;overflow:auto;white-space:pre-wrap;';
        document.body.appendChild(el);
    }
    el.textContent += (el.textContent ? '\n' : '') + message;
}

async function registerToken(db, userId) {
    try {
        showPushDebug('Permiso OK. Pidiendo token de FCM...');
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) {
            showPushDebug('getToken() devolvió vacío.');
            return;
        }
        showPushDebug('Token obtenido: ' + token.slice(0, 20) + '...');

        const tokenRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'pushTokens', token);
        await setDoc(tokenRef, { createdAt: serverTimestamp(), userAgent: navigator.userAgent }, { merge: true });
        showPushDebug('Token guardado en Firestore. Listo.');

        const settingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await setDoc(settingsRef, { timezone }, { merge: true });
    } catch (error) {
        // No es crítico para el resto de la app — solo significa que esta
        // sesión no va a recibir push reales, sigue funcionando todo igual.
        showPushDebug('ERROR: ' + (error?.code || error?.message || String(error)));
    }
}

// Safari (incluida la PWA standalone de iOS) solo muestra el diálogo nativo
// de permiso de notificaciones si Notification.requestPermission() se llama
// DENTRO del handler de un tap/click real del usuario — llamado desde
// initPush() (disparado por onAuthStateChanged, varios pasos async después
// de cualquier tap) la promesa se resuelve sola sin mostrar nada, dejando el
// permiso en "default" para siempre. Por eso hace falta este botón visible.
function showEnablePushButton(db, userId) {
    if (document.getElementById('enable-push-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'enable-push-btn';
    btn.type = 'button';
    btn.textContent = '🔔 Activar notificaciones';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99998;background:#4F46E5;color:white;border:none;padding:12px 20px;border-radius:999px;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    btn.onclick = async () => {
        btn.remove();
        showPushDebug('Pidiendo permiso de notificaciones (desde el tap)...');
        const permission = await Notification.requestPermission();
        showPushDebug('Permiso: ' + permission);
        if (permission === 'granted') {
            await registerToken(db, userId);
        }
    };
    document.body.appendChild(btn);
}

export async function initPush(db, userId) {
    if (!messaging) {
        showPushDebug('"messaging" no inicializado (ver consola al cargar la app, buscar "getMessaging").');
        return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        showPushDebug('Este navegador no tiene Notification API o Service Worker.');
        return;
    }

    if (Notification.permission === 'granted') {
        await registerToken(db, userId);
        return;
    }
    if (Notification.permission === 'denied') {
        showPushDebug('Permiso de notificaciones denegado anteriormente (no se puede volver a pedir solo).');
        return;
    }

    // 'default': mostrar el botón, no pedir el permiso automáticamente.
    showEnablePushButton(db, userId);
}
