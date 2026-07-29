// =================================================================================
// PERMISO DE NOTIFICACIONES DEL NAVEGADOR (usado por Pomodoro)
// =================================================================================
let granted = false;

export async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === 'granted') {
        granted = true;
    } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        granted = permission === 'granted';
    }
}

export function isNotificationPermissionGranted() {
    return granted;
}
