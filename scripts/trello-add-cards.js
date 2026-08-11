// Script de mantenimiento: agrega tarjetas nuevas a la lista "To Do" del
// tablero de Trello. Lee la API Key/Token desde Firestore (mismo patrón que
// trello-mark-done.js) — nunca hace falta escribirlos en la terminal.
//
// Uso:
//   1. npm install firebase-admin   (en esta misma carpeta)
//   2. Modo listado (de solo lectura, no requiere --confirm):
//        node trello-add-cards.js ./service-account.json
//      Imprime qué tarjetas se crearían.
//   3. Para crearlas de verdad:
//        node trello-add-cards.js ./service-account.json --confirm

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const serviceAccountPath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!serviceAccountPath) {
    console.error('Uso: node trello-add-cards.js <ruta-a-service-account.json> [--confirm]');
    process.exit(1);
}

const serviceAccount = require(require('path').resolve(serviceAccountPath));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

const PUBLIC_DATA_DOC_ID = '1:765424031369:web:838eca686f68f21daa5858';
const USER_EMAIL = 'gabriel.montenegro@redb.ee';

// Título + descripción de las tarjetas a crear en "To Do".
const CARDS_TO_ADD = [
    {
        name: 'Conectar Outlook Calendar (además de Google Calendar)',
        desc: 'Hoy la app solo integra Google Calendar (public/js/features/calendar.js, vía Google Identity Services). Agregar la opción de conectar Outlook/Microsoft Calendar como fuente alternativa u adicional para la agenda de Hoy.',
    },
    {
        name: 'Tour de bienvenida: mencionar los patrones de respiración editables en Pomodoro',
        desc: 'El tour de bienvenida (public/js/features/welcome-tour.js, paso "⏱️ Pomodoro") no menciona que se puede elegir el patrón de respiración (4-7-8 / Cuadrada / Triangular) desde la configuración de Pomodoro (#breathing-pattern-options). Agregar esa mención al paso correspondiente del tour.',
    },
];

async function trelloFetch(path, apiKey, token, options) {
    const url = `https://api.trello.com${path}${path.includes('?') ? '&' : '?'}key=${apiKey}&token=${token}`;
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Trello API ${res.status}: ${await res.text()}`);
    return res.json();
}

async function main() {
    const user = await auth.getUserByEmail(USER_EMAIL);
    const trelloConfigRef = db
        .collection('artifacts').doc(PUBLIC_DATA_DOC_ID)
        .collection('users').doc(user.uid)
        .collection('trelloConfig').doc('settings');

    const configSnap = await trelloConfigRef.get();
    if (!configSnap.exists) {
        console.error('No hay trelloConfig guardado para este usuario.');
        process.exit(1);
    }
    const { apiKey, token, boardId } = configSnap.data();

    const lists = await trelloFetch(`/1/boards/${boardId}/lists`, apiKey, token);
    const toDoList = lists.find(l => /to do/i.test(l.name));
    if (!toDoList) {
        console.error('No se encontró una lista "To Do". Listas disponibles:', lists.map(l => l.name));
        process.exit(1);
    }

    console.log(`\n=== ${confirmed ? 'Creando' : 'Se crearían (modo simulación)'} en "${toDoList.name}" ===\n`);
    for (const card of CARDS_TO_ADD) {
        console.log(`  · ${card.name}`);
        if (confirmed) {
            await trelloFetch('/1/cards', apiKey, token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idList: toDoList.id, name: card.name, desc: card.desc, pos: 'top' }),
            });
        }
    }

    if (!confirmed) {
        console.log('\nModo simulación: no se creó nada. Agregá --confirm para crear de verdad.');
    } else {
        console.log('\nListo.');
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
