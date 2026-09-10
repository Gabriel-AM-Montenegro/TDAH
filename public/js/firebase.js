// =================================================================================
// FIREBASE: CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

// El login con Google (popup/redirect) pasa por "authDomain" como puente
// entre la app y Google — Firebase Hosting expone las rutas reservadas
// /__/auth/* en CUALQUIER site del proyecto (no solo en .firebaseapp.com),
// así que usar como authDomain el mismo dominio desde el que se está usando
// la app evita ese salto a un dominio distinto, que Safari puede bloquear
// (protecciones de rastreo entre sitios) — pasó justo con neurokit-app.web.app,
// que redirigía a tdah-app-efca9.firebaseapp.com y el login no completaba.
// En localhost esas rutas no existen (no es Firebase Hosting), así que ahí
// se usa el authDomain fijo de siempre.
const isFirebaseHostingDomain = /\.(web\.app|firebaseapp\.com)$/.test(location.hostname);

const firebaseConfig = {
    apiKey: "AIzaSyDbIABcg4AqeqiUzYhTahgjc2oziM5NLjI",
    authDomain: isFirebaseHostingDomain ? location.hostname : "tdah-app-efca9.firebaseapp.com",
    projectId: "tdah-app-efca9",
    storageBucket: "tdah-app-efca9.appspot.com",
    messagingSenderId: "765424031369",
    appId: "1:765424031369:web:838eca686f68f21daa5858",
    measurementId: "G-QY7X98XZZV"
};

export const appId = firebaseConfig.appId;
export const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Coincide con `appId` a propósito (los dos son el Web App ID real, según la
// Firebase Management API) — históricamente se creía que debían diferir en
// un dígito por un bug preexistente, pero en realidad `appId` tenía el typo
// (le faltaba un "6"), corregido arriba el 2026-08-31. Ver CLAUDE.md.
export const publicDataDocId = "1:765424031369:web:838eca686f68f21daa5858";

export let app;
export let db;
export let auth;
export let analytics;
export let messaging;

// Modo opt-in para desarrollo: abrir la app con ?emulator=1 conecta Auth y
// Firestore a los emuladores locales (firebase emulators:start) en vez de
// producción. Sin ese parámetro, el comportamiento no cambia.
const useEmulator = new URLSearchParams(location.search).get('emulator') === '1';

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    if (useEmulator) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log('Firebase conectado a los EMULADORES locales (Auth :9099, Firestore :8080).');
    } else {
        console.log("Firebase inicializado exitosamente.");
    }

    // Analytics solo en un site real de Firebase Hosting (no en localhost ni
    // en el emulador) — para no mezclar clics de prueba con el uso real.
    if (isFirebaseHostingDomain && !useEmulator) {
        analytics = getAnalytics(app);

        // Mismo criterio: push real necesita un dominio real (Cloud Functions
        // solo corren contra producción, no hay forma de probarlas contra el
        // emulador de Firestore) — inicializarlo en localhost solo generaría
        // errores de permiso de notificaciones sin ningún beneficio.
        // Try/catch propio (no el de afuera): getMessaging() puede tirar en
        // navegadores/WebViews que no soportan Push API (Safari en iOS lo
        // soporta desde 16.4, pero solo en el contexto standalone de una PWA
        // agregada a la pantalla de inicio) — si eso pasa, no tiene que
        // romper Analytics/Auth/Firestore, que ya están funcionando bien.
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Push: getMessaging() no soportado en este navegador:', error);
        }
    }
} catch (error) {
    console.error("ERROR CRÍTICO DE INICIALIZACIÓN DE FIREBASE:", error);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #d8000c;">
            <h1>Error Crítico</h1><p>No se pudo conectar con la base de datos.</p>
            <p><strong>Detalle del error:</strong> ${error.message}</p></div>`;
    });
}

// No-op si analytics no está inicializado (localhost/emulador) — así el
// resto del código puede llamarlo siempre sin chequear la condición.
export function trackEvent(eventName, params) {
    if (!analytics) return;
    logEvent(analytics, eventName, params);
}
