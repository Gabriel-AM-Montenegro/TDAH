// =================================================================================
// FIREBASE: CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    messagingSenderId: "765424831369",
    appId: "1:765424031369:web:838eca86f68f21daa5858",
    measurementId: "G-QY7X98XZZY"
};

export const appId = firebaseConfig.appId;
export const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// NO cambiar este valor para que coincida con `appId`: difiere en un dígito
// (bug preexistente) pero es la ruta de Firestore donde ya vive la data real
// de producción. Ver CLAUDE.md.
export const publicDataDocId = "1:765424031369:web:838eca686f68f21daa5858";

export let app;
export let db;
export let auth;

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
} catch (error) {
    console.error("ERROR CRÍTICO DE INICIALIZACIÓN DE FIREBASE:", error);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #d8000c;">
            <h1>Error Crítico</h1><p>No se pudo conectar con la base de datos.</p>
            <p><strong>Detalle del error:</strong> ${error.message}</p></div>`;
    });
}
