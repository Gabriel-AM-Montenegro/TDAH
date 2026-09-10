// =================================================================================
// CLOUD FUNCTIONS: notificaciones push reales (funcionan con la app cerrada).
// Primera pieza de backend real del proyecto — todo lo demás es 100% cliente.
//
// Dos funciones programadas (cada 1 minuto), cada una cubre un caso:
// - checklistReminders: recordatorios por hora ya existentes en Checklist
//   (antes solo disparaban con la pestaña abierta, via setInterval en el
//   cliente — ver checkReminders() en checklist.js, que se deja intacto
//   para cuando la app SÍ está abierta).
// - pomodoroFinishedPush: avisa cuando termina un bloque de foco/descanso
//   y el cliente no llegó a marcarlo (isRunning sigue true pasado el
//   horario esperado de fin) — señal indirecta de que la pestaña se cerró
//   antes de que terminara. Si la pestaña sigue abierta, el cliente ya
//   pone isRunning:false apenas termina (loop de 1s), mucho más rápido
//   que el chequeo de 1 minuto de acá — por eso no hace falta un flag
//   separado para "no duplicar si la pestaña está abierta", la carrera
//   ya la gana el cliente casi siempre.
// =================================================================================
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

initializeApp();
const db = getFirestore();

// Debe coincidir siempre con `publicDataDocId` en public/js/firebase.js —
// es la ruta real donde vive la data de producción (ver CLAUDE.md, nota
// sobre el typo histórico de appId).
const PUBLIC_DATA_DOC_ID = '1:765424031369:web:838eca686f68f21daa5858';

function userIdFromPath(path) {
    // artifacts/{PUBLIC_DATA_DOC_ID}/users/{userId}/...
    const parts = path.split('/');
    const idx = parts.indexOf('users');
    return idx !== -1 ? parts[idx + 1] : null;
}

async function getUserTimezone(userId) {
    const snap = await db
        .collection('artifacts').doc(PUBLIC_DATA_DOC_ID)
        .collection('users').doc(userId)
        .collection('settings').doc('appSettings')
        .get();
    return snap.exists && snap.data().timezone ? snap.data().timezone : 'America/Argentina/Buenos_Aires';
}

function currentHHMMInTimezone(timezone) {
    try {
        return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    } catch (error) {
        logger.warn('Timezone inválida, usando Buenos Aires:', timezone, error.message);
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    }
}

function todayDateStringInTimezone(timezone) {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()); // YYYY-MM-DD
    } catch (error) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    }
}

// Manda el push a todos los tokens guardados de ese usuario, y borra los
// que Firebase reporte como inválidos/expirados (housekeeping, si no la
// colección de tokens crece para siempre con dispositivos viejos).
async function sendPushToUser(userId, title, body) {
    const tokensRef = db
        .collection('artifacts').doc(PUBLIC_DATA_DOC_ID)
        .collection('users').doc(userId)
        .collection('pushTokens');
    const tokensSnap = await tokensRef.get();
    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map(d => d.id);
    const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
    });

    const deletions = [];
    response.responses.forEach((r, i) => {
        if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code)) {
            deletions.push(tokensRef.doc(tokens[i]).delete());
        }
    });
    await Promise.all(deletions);
}

exports.checklistReminders = onSchedule('every 1 minutes', async () => {
    const itemsSnap = await db.collectionGroup('checklistItems').where('reminderTime', '>', '').get();
    if (itemsSnap.empty) return;

    // Agrupar por usuario para no pedir su timezone una vez por ítem.
    const byUser = new Map();
    itemsSnap.forEach(doc => {
        const userId = userIdFromPath(doc.ref.path);
        if (!userId) return;
        if (!byUser.has(userId)) byUser.set(userId, []);
        byUser.get(userId).push(doc);
    });

    for (const [userId, docs] of byUser) {
        const timezone = await getUserTimezone(userId);
        const hhmm = currentHHMMInTimezone(timezone);
        const today = todayDateStringInTimezone(timezone);

        for (const doc of docs) {
            const item = doc.data();
            if (item.completed) continue;
            if (item.reminderTime !== hhmm) continue;
            if (item.lastReminderSentDate === today) continue;

            await sendPushToUser(userId, '⏰ Recordatorio de tarea', item.text || 'Tenés una tarea pendiente.');
            await doc.ref.update({ lastReminderSentDate: today });
        }
    }
});

exports.pomodoroFinishedPush = onSchedule('every 1 minutes', async () => {
    const runningSnap = await db.collectionGroup('pomodoroSettings').where('isRunning', '==', true).get();
    if (runningSnap.empty) return;

    const now = Date.now();
    for (const doc of runningSnap.docs) {
        const settings = doc.data();
        if (settings.pushNotified) continue;
        if (!settings.lastUpdated || typeof settings.timeLeft !== 'number') continue;

        const expectedEnd = new Date(settings.lastUpdated).getTime() + settings.timeLeft * 1000;
        if (now < expectedEnd + 30000) continue; // 30s de margen antes de asumir que el cliente no lo va a marcar solo

        const userId = userIdFromPath(doc.ref.path);
        if (!userId) continue;

        const title = settings.isBreakTime ? '¡Descanso terminado!' : '¡Pomodoro terminado!';
        const body = settings.isBreakTime ? 'Es hora de volver a concentrarte.' : 'Excelente trabajo. Es hora de un descanso.';
        await sendPushToUser(userId, title, body);
        await doc.ref.update({ pushNotified: true });
    }
});
