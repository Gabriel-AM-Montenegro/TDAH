// =================================================================================
// INTEGRACIÓN TRELLO
// =================================================================================
import { collection, doc, getDocs, setDoc, getDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, mostrarSeccion, renderEmptyState } from '../ui.js';

function isToday(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function initTrello(db, userId) {
    const trelloConfigDocRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'trelloConfig', 'settings');
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'checklistItems');

    const trelloApiKeyInput = document.getElementById('api-key');
    const trelloTokenInput = document.getElementById('token');
    const trelloBoardIdInput = document.getElementById('board-id');
    const trelloStatusDiv = document.getElementById('trello-status');
    const trelloSuccessMessage = document.getElementById('trello-success-message');
    const configTrelloBtn = document.getElementById('config-trello-btn');
    const testTrelloBtn = document.getElementById('test-trello-btn');
    const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn');
    const listaTareasUl = document.getElementById('listaTareas');
    const trelloBoardLinkHeader = document.getElementById('trello-board-link-header');
    const todayTrelloTasksList = document.getElementById('today-trello-tasks-list');

    if (!trelloApiKeyInput || !saveTrelloConfigBtn || !listaTareasUl || !trelloBoardLinkHeader) return;

    let boardUrl = '';

    const renderTareasList = (container, cards, emptyMessage) => {
        if (!container) return;
        if (!cards.length) {
            renderEmptyState(container, { message: emptyMessage });
            return;
        }
        container.innerHTML = '';
        cards.forEach(card => {
            const li = document.createElement('li');
            li.className = 'trello-task-item';
            li.textContent = `${card.name} (Vence: ${new Date(card.due).toLocaleDateString()})`;
            li.setAttribute('tabindex', '0');
            li.setAttribute('role', 'button');
            const abrirTarjeta = () => window.open(card.shortUrl || boardUrl, '_blank');
            li.onclick = abrirTarjeta;
            li.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrirTarjeta();
                }
            };
            container.appendChild(li);
        });
    };

    // Importa las tarjetas de esta semana como ítems del Checklist (una sola
    // vez por tarjeta, vía trelloCardId) para poder marcarlas MIT, editarlas
    // o agregarles subtareas igual que a cualquier otro ítem.
    const syncTrelloCardsToChecklist = async (cards) => {
        if (!cards.length) return;
        try {
            const existingSnapshot = await getDocs(checklistCollectionRef);
            const existingTrelloIds = new Set(
                existingSnapshot.docs.map(d => d.data().trelloCardId).filter(Boolean)
            );
            const newCards = cards.filter(card => !existingTrelloIds.has(card.id));
            if (!newCards.length) return;

            let nextPosition = existingSnapshot.docs.reduce((max, d) => Math.max(max, d.data().position ?? -1), -1) + 1;
            const batch = writeBatch(db);
            newCards.forEach(card => {
                batch.set(doc(checklistCollectionRef), {
                    text: card.name,
                    completed: false,
                    isMIT: false,
                    timestamp: new Date().toISOString(),
                    position: nextPosition++,
                    trelloCardId: card.id
                });
            });
            await batch.commit();
            showTempMessage(`Se agregaron ${newCards.length} tarea(s) de Trello al Checklist.`, 'success');
        } catch (error) {
            console.error("Trello: Error al sincronizar con Checklist:", error);
        }
    };

    const cargarTareasTrello = async () => {
        const configSnap = await getDoc(trelloConfigDocRef);
        const { apiKey, token, boardId } = configSnap.exists() ? configSnap.data() : {};
        if (!apiKey || !token || !boardId) {
            renderEmptyState(listaTareasUl, {
                message: 'Conectá tu cuenta de Trello para ver acá tus tareas de la semana.',
                actionLabel: '⚙️ Configurar Trello',
                onAction: () => mostrarSeccion('config')
            });
            return;
        }
        listaTareasUl.innerHTML = '<li>Cargando tareas...</li>';
        try {
            const fields = 'name,due,dueComplete,shortUrl';
            const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
            if (!listsResponse.ok) throw new Error('Error al obtener listas de Trello.');
            const lists = await listsResponse.json();
            const cardsPerList = await Promise.all(lists.map(list =>
                fetch(`https://api.trello.com/1/lists/${list.id}/cards?key=${apiKey}&token=${token}&fields=${fields}`).then(res => res.json())
            ));
            const allCards = cardsPerList.flat();
            const today = new Date();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const filteredCards = allCards.filter(card => card.due && !card.dueComplete && new Date(card.due) >= monday && new Date(card.due) <= sunday);

            renderTareasList(listaTareasUl, filteredCards, '¡Nada vence esta semana! Buen momento para adelantar algo o descansar.');
            renderTareasList(todayTrelloTasksList, filteredCards.filter(card => isToday(card.due)), 'Nada de Trello vence hoy.');
            syncTrelloCardsToChecklist(filteredCards);
        } catch (error) {
            console.error("Trello: Error al cargar tareas:", error);
            listaTareasUl.innerHTML = `<li class="empty-section-message">No se pudieron cargar las tareas de Trello. Probá de nuevo.</li>`;
        }
    };

    const probarConexionTrello = async () => {
        const apiKey = trelloApiKeyInput.value.trim();
        const token = trelloTokenInput.value.trim();
        const boardId = trelloBoardIdInput.value.trim();
        if (!apiKey || !token || !boardId) {
            trelloStatusDiv.textContent = '❌ Configuración incompleta';
            return;
        }
        try {
            const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
            if (response.ok) {
                trelloStatusDiv.textContent = '✅ Trello conectado';
                trelloStatusDiv.className = 'status-indicator status-connected';
                trelloSuccessMessage.style.display = 'block';
                boardUrl = `https://trello.com/b/${boardId}`;
                cargarTareasTrello();
            } else {
                throw new Error('Respuesta no válida de Trello');
            }
        } catch (error) {
            console.error("Trello: Error al probar conexión:", error);
            trelloStatusDiv.textContent = '❌ No se pudo conectar con Trello';
            trelloStatusDiv.className = 'status-indicator status-disconnected';
            trelloSuccessMessage.style.display = 'none';
        }
    };

    const unsubscribe = onSnapshot(trelloConfigDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const config = docSnap.data();
            trelloApiKeyInput.value = config.apiKey || '';
            trelloTokenInput.value = config.token || '';
            trelloBoardIdInput.value = config.boardId || '';
            probarConexionTrello();
        } else {
            cargarTareasTrello();
        }
    });
    registerListener(unsubscribe);

    saveTrelloConfigBtn.onclick = async () => {
        const apiKey = trelloApiKeyInput.value.trim();
        const token = trelloTokenInput.value.trim();
        const boardId = trelloBoardIdInput.value.trim();
        if (apiKey && token && boardId) {
            await setDoc(trelloConfigDocRef, { apiKey, token, boardId });
            showTempMessage('Configuración de Trello guardada.', 'success');
            probarConexionTrello();
        } else {
            showTempMessage('Por favor, completa todos los campos.', 'warning');
        }
    };

    testTrelloBtn.onclick = probarConexionTrello;
    configTrelloBtn.onclick = () => mostrarSeccion('config');
    trelloBoardLinkHeader.onclick = () => {
        if (boardUrl) {
            window.open(boardUrl, '_blank');
        } else {
            showTempMessage('Configura Trello primero para abrir el tablero.', 'warning');
        }
    };
}
