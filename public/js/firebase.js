// =================================================================================
// FIREBASE: CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDbIABcg4AqeqiUzYhTahgjc2oziM5NLjI",
    authDomain: "tdah-app-efca9.firebaseapp.com",
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

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase inicializado exitosamente.");
} catch (error) {
    console.error("ERROR CRÍTICO DE INICIALIZACIÓN DE FIREBASE:", error);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #d8000c;">
            <h1>Error Crítico</h1><p>No se pudo conectar con la base de datos.</p>
            <p><strong>Detalle del error:</strong> ${error.message}</p></div>`;
    });
}
