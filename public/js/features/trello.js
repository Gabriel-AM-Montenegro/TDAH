// =================================================================================
// INTEGRACIÓN TRELLO
// =================================================================================
import { doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, mostrarSeccion } from '../ui.js';

export function initTrello(db, userId) {
    const trelloConfigDocRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'trelloConfig', 'settings');

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

    if (!trelloApiKeyInput || !saveTrelloConfigBtn || !listaTareasUl || !trelloBoardLinkHeader) return;

    let boardUrl = '';

    const cargarTareasTrello = async () => {
        const configSnap = await getDoc(trelloConfigDocRef);
        if (!configSnap.exists()) return;
        const { apiKey, token, boardId } = configSnap.data();
        if (!apiKey || !token || !boardId) {
            listaTareasUl.innerHTML = '<li class="empty-section-message">Configura Trello para ver tus tareas.</li>';
            return;
        }
        listaTareasUl.innerHTML = '<li>Cargando tareas...</li>';
        try {
            const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
            if (!listsResponse.ok) throw new Error('Error al obtener listas de Trello.');
            const lists = await listsResponse.json();
            let allCards = [];
            for (const list of lists) {
                const cardsResponse = await fetch(`https://api.trello.com/1/lists/${list.id}/cards?key=${apiKey}&token=${token}`);
                const cards = await cardsResponse.json();
                allCards = allCards.concat(cards);
            }
            const today = new Date();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
            monday.setHours(0, 0, 0, 0);
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            friday.setHours(23, 59, 59, 999);

            const filteredCards = allCards.filter(card => card.due && !card.dueComplete && new Date(card.due) >= monday && new Date(card.due) <= friday);

            if (filteredCards.length > 0) {
                listaTareasUl.innerHTML = filteredCards.map(card => `<li>${card.name} (Vence: ${new Date(card.due).toLocaleDateString()})</li>`).join('');
            } else {
                listaTareasUl.innerHTML = '<li class="empty-section-message">No hay tareas que venzan esta semana.</li>';
            }
        } catch (error) {
            listaTareasUl.innerHTML = `<li class="empty-section-message">Error al cargar tareas: ${error.message}</li>`;
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
            trelloStatusDiv.textContent = `❌ Error: ${error.message}`;
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
