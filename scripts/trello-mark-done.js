// Script de mantenimiento: lee tu API Key/Token/Board ID de Trello desde
// Firestore (los mismos que ya guardaste en Configuración > Trello dentro de
// la app) y los usa para listar el tablero o mover tarjetas específicas a la
// lista "Done".
//
// No pide la API Key/Token por parámetro a propósito: ya viven en Firestore
// (guardados por la app), así nunca hace falta escribirlos en la terminal ni
// pegarlos en el chat.
//
// Uso:
//   1. npm install firebase-admin   (en esta misma carpeta)
//   2. Modo listado (siempre de solo lectura, no requiere --confirm):
//        node trello-mark-done.js ./service-account.json
//      Imprime todas las listas del tablero y las tarjetas de cada una.
//   3. Una vez decidido qué tarjetas mover a "Done", completar el array
//      CARDS_TO_MARK_DONE de abajo con los títulos EXACTOS y correr:
//        node trello-mark-done.js ./service-account.json --confirm
//      Sin --confirm, este mismo comando solo muestra qué movería.

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const serviceAccountPath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!serviceAccountPath) {
    console.error('Uso: node trello-mark-done.js <ruta-a-service-account.json> [--confirm]');
    process.exit(1);
}

const serviceAccount = require(require('path').resolve(serviceAccountPath));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

// Debe coincidir con `publicDataDocId` en public/js/firebase.js.
const PUBLIC_DATA_DOC_ID = '1:765424031369:web:838eca686f68f21daa5858';
const USER_EMAIL = 'gabriel.montenegro@redb.ee';

// Completar con los títulos EXACTOS de las tarjetas a mover a "Done" (ver
// salida del modo listado) antes de correr con --confirm.
const CARDS_TO_MARK_DONE = [
    // -- To Do --
    'Vista de Calendario Simple para el Journal',
    'Buscar Entradas por Palabras Clave en el Journal',
    'Mensajes y Sugerencias en Secciones Vacías',
    'Optimizar Contraste de Colores para Accesibilidad',
    'Unificar Estilos y Pulir la Interfaz Visual',
    'Dividir Tareas en Subtareas en el Checklist',
    'Priorización de Tareas con Etiquetas de Color Personalizables',
    'Recordatorios Personalizables por Hora para Tareas',
    'Registrar Nivel de Ánimo/Energía en el Journal',
    'Guías de Respiración/Meditación en Descansos de Pomodoro',
    'Etiquetar y Filtrar Entradas del Journal y Artículos del Blog',
    'Configuración de Sonidos y Volumen Individuales',
    'Seleccionar Temas de Color para la Aplicación',
    'Estilo del Checkbox MIT (Refactorización)',
    'Favicon de la Aplicación',
    'Título Dinámico de la Página',
    'Control Global de Sonido',
    'Sistema de Puntos por Pomodoros Completados',
    // -- Doing (excepto "traea 2", que es la tarjeta de prueba manual del usuario) --
    'Visualizar eventos próximos del calendario para no olvidar citas.',
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
        console.error('No hay trelloConfig guardado para este usuario. Conectá Trello en la app primero.');
        process.exit(1);
    }
    const { apiKey, token, boardId } = configSnap.data();
    if (!apiKey || !token || !boardId) {
        console.error('trelloConfig incompleto (falta apiKey/token/boardId).');
        process.exit(1);
    }

    const lists = await trelloFetch(`/1/boards/${boardId}/lists`, apiKey, token);
    const cards = await trelloFetch(`/1/boards/${boardId}/cards`, apiKey, token);

    const listById = Object.fromEntries(lists.map(l => [l.id, l.name]));

    if (!CARDS_TO_MARK_DONE.length) {
        console.log('\n=== Modo listado (no se movió nada) ===\n');
        lists.forEach(list => {
            console.log(`\n-- ${list.name} (${list.id}) --`);
            cards.filter(c => c.idList === list.id).forEach(c => console.log(`  · ${c.name}`));
        });
        console.log('\nCompletá CARDS_TO_MARK_DONE en el script con los títulos exactos a mover, y volvé a correr con --confirm.');
        return;
    }

    const doneList = lists.find(l => /done/i.test(l.name));
    if (!doneList) {
        console.error('No se encontró una lista "Done" en el tablero. Listas disponibles:', lists.map(l => l.name));
        process.exit(1);
    }

    for (const title of CARDS_TO_MARK_DONE) {
        const card = cards.find(c => c.name === title);
        if (!card) {
            console.log(`  [no encontrada] "${title}"`);
            continue;
        }
        if (card.idList === doneList.id) {
            console.log(`  [ya está en Done] "${title}"`);
            continue;
        }
        console.log(`  ${confirmed ? 'Moviendo' : 'Movería'} "${title}" (${listById[card.idList]} -> ${doneList.name})`);
        if (confirmed) {
            await trelloFetch(`/1/cards/${card.id}?idList=${doneList.id}`, apiKey, token, { method: 'PUT' });
        }
    }

    if (!confirmed) {
        console.log('\nModo simulación: no se movió nada. Agregá --confirm para aplicar de verdad.');
    } else {
        console.log('\nListo.');
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
