// =================================================================================
// REGISTRO COMPARTIDO DE LISTENERS DE FIRESTORE (onSnapshot unsubscribe)
// =================================================================================
let unsubscribeListeners = [];

export function registerListener(unsubscribe) {
    unsubscribeListeners.push(unsubscribe);
}

export function cleanupListeners() {
    console.log(`Limpiando ${unsubscribeListeners.length} listeners de Firestore...`);
    unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners = [];
}
