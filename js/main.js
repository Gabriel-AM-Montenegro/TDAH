// Importar módulos de Firebase
import { initializeApp } from "[https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js](https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js)";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "[https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js](https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js)";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, getDocs } from "[https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js](https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js)";

// Variables globales para Firebase
let db;
let auth;
let currentUserId;

// Configuración de Firebase proporcionada por el usuario
const firebaseConfig = {
    apiKey: "AIzaSyAaC7FvY_9bDHBvl36YWAIIO9qXyvqZrUw",
    authDomain: "tdah-app-efca9.firebaseapp.com",
    projectId: "tdah-app-efca9",
    storageBucket: "tdah-app-efca9.firebasestorage.app",
    messagingSenderId: "765424031369",
    appId: "1:765424031369:web:838eca686f68f21daa5858",
    measurementId: "G-QY7X98XZZV"
};

// Asegurarse de usar el appId de la configuración de Firebase
const appId = firebaseConfig.appId; // Ahora appId se toma directamente de firebaseConfig
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// Función para mostrar/ocultar secciones (expuesta globalmente)
function mostrarSeccion(idSeccion) {
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.remove('active');
    });
    document.querySelectorAll('.nav-tabs button').forEach(button => {
        button.classList.remove('active');
    });

    const seccionActiva = document.getElementById(idSeccion);
    if (seccionActiva) {
        seccionActiva.classList.add('active');
    }
    const botonActivo = document.getElementById(`btn-${idSeccion}`);
    if (botonActivo) {
        botonActivo.classList.add('active');
    }
}
window.mostrarSeccion = mostrarSeccion; // Exponer globalmente para onclick en HTML

// Función para mostrar mensajes temporales (expuesta globalmente)
function showTempMessage(message, type = 'info', duration = 3000) {
    const tempMessageContainer = document.getElementById('temp-message-container');
    const msgElement = document.createElement('div');
    msgElement.className = `temp-message ${type}`;
    msgElement.textContent = message;
    tempMessageContainer.appendChild(msgElement);

    msgElement.offsetHeight;
    msgElement.classList.add('show');

    setTimeout(() => {
        msgElement.classList.remove('show');
        msgElement.classList.add('hide');
        msgElement.addEventListener('transitionend', () => msgElement.remove(), { once: true });
    }, duration);
}
window.showTempMessage = showTempMessage; // Exponer globalmente para llamadas en HTML

// Lógica principal de la aplicación que se ejecuta una vez que Firebase está listo
async function loadAllUserData() {
    if (!db || !auth || !currentUserId) {
        console.error("Firebase no está completamente inicializado o el usuario no está autenticado.");
        showTempMessage("Error: Firebase no está listo. Recargando...", 'error');
        return;
    }

    console.log("Firebase y Usuario Autenticado:", currentUserId);
    document.getElementById('user-id-display').textContent = `ID de Usuario: ${currentUserId}`;
    showTempMessage(`Bienvenido, usuario ${currentUserId.substring(0, 8)}...`, 'info');

    // --- Lógica del Journal ---
    const journalEntryTextarea = document.getElementById('journalEntry');
    const saveJournalEntryButton = document.getElementById('save-journal-entry-btn'); // ID actualizado
    const journalEntriesList = document.getElementById('journalEntriesList');

    const journalCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/journalEntries`);
    onSnapshot(query(journalCollectionRef, orderBy('timestamp', 'desc')), (snapshot) => {
        journalEntriesList.innerHTML = '';
        if (snapshot.empty) {
            journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const entry = doc.data();
            const listItem = document.createElement('li');
            const dateSpan = document.createElement('span');
            dateSpan.className = 'journal-date';
            dateSpan.textContent = new Date(entry.timestamp).toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const contentDiv = document.createElement('div');
            contentDiv.textContent = entry.text;

            listItem.appendChild(dateSpan);
            listItem.appendChild(contentDiv);
            journalEntriesList.appendChild(listItem);
        });
    }, (error) => {
        console.error("Error al escuchar entradas del diario:", error);
        showTempMessage(`Error al cargar diario: ${error.message}`, 'error');
    });

    saveJournalEntryButton.addEventListener('click', async () => {
        const entryText = journalEntryTextarea.value.trim();
        if (entryText) {
            try {
                await addDoc(journalCollectionRef, {
                    text: entryText,
                    timestamp: new Date().toISOString()
                });
                journalEntryTextarea.value = '';
                showTempMessage('Entrada guardada con éxito!', 'success');
            } catch (error) {
                console.error("Error al guardar entrada del diario:", error);
                showTempMessage(`Error al guardar: ${error.message}`, 'error');
            }
        } else {
            showTempMessage('Por favor, escribe algo en tu entrada antes de guardar.', 'warning');
        }
    });

    // --- Lógica del Temporizador Pomodoro ---
    let timer;
    let isRunning = false;
    let timeLeft = 25 * 60; // Default: 25 minutos
    const timerDisplay = document.getElementById('timer');
    const pomodoroSettingsDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/pomodoroSettings/current`);

    const startTimerBtn = document.getElementById('start-timer-btn'); // Nuevo ID
    const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn'); // Nuevo ID
    const resetTimerBtn = document.getElementById('reset-timer-btn'); // Nuevo ID

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Cargar estado del pomodoro desde Firestore
    onSnapshot(pomodoroSettingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const settings = docSnap.data();
            timeLeft = settings.timeLeft;
            isRunning = settings.isRunning;
            updateTimerDisplay();
            if (isRunning && settings.lastUpdated) {
                const elapsedSinceLastUpdate = (Date.now() - new Date(settings.lastUpdated).getTime()) / 1000;
                timeLeft = Math.max(0, timeLeft - Math.floor(elapsedSinceLastUpdate));
                if (timeLeft > 0 && !timer) {
                    startTimer();
                } else if (timeLeft <= 0) {
                    clearInterval(timer);
                    isRunning = false;
                    showTempMessage('¡Tiempo de trabajo completado!', 'success');
                    document.getElementById('sound-complete').play();
                    resetTimer();
                }
            }
        } else {
            setDoc(pomodoroSettingsDocRef, { timeLeft: 25 * 60, isRunning: false, lastUpdated: new Date().toISOString() });
        }
    }, (error) => {
        console.error("Error al cargar settings de Pomodoro:", error);
        showTempMessage(`Error al cargar Pomodoro: ${error.message}`, 'error');
    });

    async function savePomodoroState(newTimeLeft, newIsRunning) {
        try {
            await setDoc(pomodoroSettingsDocRef, {
                timeLeft: newTimeLeft,
                isRunning: newIsRunning,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error al guardar estado de Pomodoro:", error);
            showTempMessage(`Error al guardar Pomodoro: ${error.message}`, 'error');
        }
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            savePomodoroState(timeLeft, true);
            timer = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    isRunning = false;
                    savePomodoroState(0, false);
                    showTempMessage('¡Tiempo de trabajo completado!', 'success');
                    document.getElementById('sound-complete').play();
                    resetTimer();
                }
            }, 1000);
        }
    }

    function pausarPomodoro() {
        clearInterval(timer);
        isRunning = false;
        savePomodoroState(timeLeft, false);
        showTempMessage('Temporizador pausado.', 'info');
    }

    function resetTimer() {
        clearInterval(timer);
        isRunning = false;
        timeLeft = 25 * 60;
        updateTimerDisplay();
        savePomodoroState(timeLeft, false);
        showTempMessage('Temporizador reiniciado.', 'info');
    }

    // Adjuntar event listeners a los botones de Pomodoro
    startTimerBtn.addEventListener('click', startTimer);
    pausePomodoroBtn.addEventListener('click', pausarPomodoro);
    resetTimerBtn.addEventListener('click', resetTimer);


    // --- Lógica del Checklist ---
    const checkItemInput = document.getElementById('checkItem');
    const addCheckItemBtn = document.getElementById('add-check-item-btn'); // Nuevo ID
    const checkListUl = document.getElementById('checkList');
    const checklistCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/checklistItems`);

    onSnapshot(query(checklistCollectionRef, orderBy('timestamp', 'asc')), (snapshot) => {
        checkListUl.innerHTML = '';
        if (snapshot.empty) {
            checkListUl.innerHTML = '<li>No hay ítems en el checklist aún.</li>';
            return;
        }
        snapshot.forEach(docSnap => {
            const item = docSnap.data();
            const itemId = docSnap.id;
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <input type="checkbox" id="check-${itemId}" ${item.completed ? 'checked' : ''}>
                <label for="check-${itemId}"><span>${item.text}</span></label>
                <button class="button-danger" data-id="${itemId}">❌</button>
            `;
            checkListUl.appendChild(listItem);

            listItem.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
                try {
                    await updateDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/checklistItems`, itemId), {
                        completed: e.target.checked
                    });
                    if (e.target.checked) {
                        listItem.querySelector('span').classList.add('task-completed');
                        document.getElementById('sound-task-done').play();
                        showTempMessage('¡Tarea completada!', 'success');
                    } else {
                        listItem.querySelector('span').classList.remove('task-completed');
                    }
                } catch (error) {
                    console.error("Error al actualizar checklist:", error);
                    showTempMessage(`Error al actualizar tarea: ${error.message}`, 'error');
                }
            });

            listItem.querySelector('.button-danger').addEventListener('click', async (e) => {
                const itemToDeleteId = e.target.dataset.id;
                try {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/checklistItems`, itemToDeleteId));
                    showTempMessage('Elemento eliminado del checklist.', 'info');
                } catch (error) {
                    console.error("Error al eliminar checklist item:", error);
                    showTempMessage(`Error al eliminar: ${error.message}`, 'error');
                }
            });

            if (item.completed) {
                listItem.querySelector('span').classList.add('task-completed');
            }
        });
    }, (error) => {
        console.error("Error al escuchar checklist:", error);
        showTempMessage(`Error al cargar checklist: ${error.message}`, 'error');
    });

    async function addCheckItem() {
        const itemText = checkItemInput.value.trim();
        if (itemText) {
            try {
                await addDoc(checklistCollectionRef, {
                    text: itemText,
                    completed: false,
                    timestamp: new Date().toISOString()
                });
                checkItemInput.value = '';
                showTempMessage('Elemento añadido al checklist.', 'success');
            } catch (error) {
                console.error("Error al añadir checklist item:", error);
                showTempMessage(`Error al añadir: ${error.message}`, 'error');
            }
        } else {
            showTempMessage('Por favor, escribe un ítem para el checklist.', 'warning');
        }
    }
    // Adjuntar event listener al botón de agregar checklist
    addCheckItemBtn.addEventListener('click', addCheckItem);


    // --- Lógica de Trello ---
    const trelloApiKeyInput = document.getElementById('api-key');
    const trelloTokenInput = document.getElementById('token');
    const trelloBoardIdInput = document.getElementById('board-id');
    const trelloStatusDiv = document.getElementById('trello-status');
    const trelloSuccessMessage = document.getElementById('trello-success-message');
    const trelloConfigDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/trelloConfig/settings`);

    const configTrelloBtn = document.getElementById('config-trello-btn'); // Nuevo ID
    const testTrelloBtn = document.getElementById('test-trello-btn'); // Nuevo ID
    const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn'); // Nuevo ID

    onSnapshot(trelloConfigDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const config = docSnap.data();
            trelloApiKeyInput.value = config.apiKey || '';
            trelloTokenInput.value = config.token || '';
            trelloBoardIdInput.value = config.boardId || '';
            probarConexionTrello();
        } else {
            trelloApiKeyInput.value = '';
            trelloTokenInput.value = '';
            trelloBoardIdInput.value = '';
            trelloStatusDiv.textContent = '❌ Trello no conectado';
            trelloStatusDiv.className = 'status-indicator status-disconnected';
            trelloSuccessMessage.style.display = 'none';
        }
    }, (error) => {
        console.error("Error al cargar configuración de Trello:", error);
        showTempMessage(`Error al cargar config Trello: ${error.message}`, 'error');
    });

    async function guardarConfigTrello() {
        const apiKey = trelloApiKeyInput.value.trim();
        const token = trelloTokenInput.value.trim();
        const boardId = trelloBoardIdInput.value.trim();

        if (apiKey && token && boardId) {
            try {
                await setDoc(trelloConfigDocRef, { apiKey, token, boardId });
                showTempMessage('Configuración de Trello guardada.', 'success');
                probarConexionTrello();
            } catch (error) {
                console.error("Error al guardar configuración de Trello:", error);
                showTempMessage(`Error al guardar config Trello: ${error.message}`, 'error');
            }
        } else {
            showTempMessage('Por favor, completa todos los campos de configuración de Trello.', 'warning');
        }
    }

    async function probarConexionTrello() {
        const configSnap = await getDoc(trelloConfigDocRef);
        if (!configSnap.exists()) {
            trelloStatusDiv.textContent = '❌ Trello no conectado';
            trelloStatusDiv.className = 'status-indicator status-disconnected';
            trelloSuccessMessage.style.display = 'none';
            return;
        }
        const { apiKey, token, boardId } = configSnap.data();

        if (!apiKey || !token || !boardId) {
            trelloStatusDiv.textContent = '❌ Trello no conectado';
            trelloStatusDiv.className = 'status-indicator status-disconnected';
            trelloSuccessMessage.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    trelloStatusDiv.textContent = '✅ Trello conectado';
                    trelloStatusDiv.className = 'status-indicator status-connected';
                    trelloSuccessMessage.style.display = 'block';
                    showTempMessage('Conexión con Trello exitosa!', 'success');
                    cargarTareasTrello();
                } else {
                    trelloStatusDiv.textContent = '⚠️ Board ID inválido o sin listas';
                    trelloStatusDiv.className = 'status-indicator status-warning';
                    trelloSuccessMessage.style.display = 'none';
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al conectar con Trello');
            }
        }
        catch (error) {
            console.error('Error de conexión con Trello:', error);
            trelloStatusDiv.textContent = `❌ Error: ${error.message}`;
            trelloStatusDiv.className = 'status-indicator status-disconnected';
            trelloSuccessMessage.style.display = 'none';
            showTempMessage(`Error de Trello: ${error.message}`, 'error');
        }
    }

    async function cargarTareasTrello() {
        const configSnap = await getDoc(trelloConfigDocRef);
        if (!configSnap.exists()) return;
        const { apiKey, token, boardId } = configSnap.data();

        const listaTareasUl = document.getElementById('listaTareas');
        listaTareasUl.innerHTML = '';

        if (!apiKey || !token || !boardId) {
            listaTareasUl.innerHTML = '<p>Configura Trello para ver tus tareas.</p>';
            return;
        }

        try {
            const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
            const lists = await listsResponse.json();

            if (!listsResponse.ok) throw new Error(lists.message || 'Error al obtener listas de Trello.');

            let allCards = [];
            for (const list of lists) {
                const cardsResponse = await fetch(`https://api.trello.com/1/lists/${list.id}/cards?key=${apiKey}&token=${token}`);
                const cards = await cardsResponse.json();
                if (!cardsResponse.ok) throw new Error(cards.message || `Error al obtener tarjetas de la lista ${list.name}.`);
                allCards = allCards.concat(cards);
            }

            if (allCards.length > 0) {
                allCards.forEach(card => {
                    const listItem = document.createElement('li');
                    listItem.textContent = card.name;
                    listaTareasUl.appendChild(listItem);
                });
            } else {
                listaTareasUl.innerHTML = '<li>No hay tareas en tu board de Trello.</li>';
            }
        } catch (error) {
            console.error('Error al cargar tareas de Trello:', error);
            listaTareasUl.innerHTML = `<li>Error al cargar tareas: ${error.message}</li>`;
            showTempMessage(`Error al cargar tareas de Trello: ${error.message}`, 'error');
        }
    }
    // Adjuntar event listeners a los botones de Trello
    configTrelloBtn.addEventListener('click', () => mostrarSeccion('config')); // Para el botón de "Configurar Trello" en la sección de Tareas
    testTrelloBtn.addEventListener('click', probarConexionTrello);
    saveTrelloConfigBtn.addEventListener('click', guardarConfigTrello);


    // --- Lógica de Limpiar Datos ---
    const clearDataBtn = document.getElementById('clear-data-btn'); // Nuevo ID
    async function limpiarDatos() {
        if (confirm('¿Estás seguro de que quieres limpiar TODOS los datos guardados (Pomodoro, Checklist, Trello Config, Journal)? Esta acción es irreversible.')) {
            try {
                const journalDocs = await getDocs(journalCollectionRef);
                journalDocs.forEach(async (d) => await deleteDoc(d.ref));

                const checklistDocs = await getDocs(checklistCollectionRef);
                checklistDocs.forEach(async (d) => await deleteDoc(d.ref));

                const pomodoroDocSnap = await getDoc(pomodoroSettingsDocRef);
                if (pomodoroDocSnap.exists()) {
                    await deleteDoc(pomodoroSettingsDocRef);
                }

                const trelloDocSnap = await getDoc(trelloConfigDocRef);
                if (trelloDocSnap.exists()) {
                    await deleteDoc(trelloConfigDocRef);
                }

                showTempMessage('Todos los datos han sido limpiados.', 'info');
                location.reload();
            } catch (error) {
                console.error("Error al limpiar datos:", error);
                showTempMessage(`Error al limpiar datos: ${error.message}`, 'error');
            }
        }
    }
    // Adjuntar event listener al botón de limpiar datos
    clearDataBtn.addEventListener('click', limpiarDatos);


    // --- Lógica de Notas de Blog y Nutrición (no usan DB) ---
    const blogContentDiv = document.getElementById('blog-content');
    const refreshBlogBtn = document.getElementById('refresh-blog-btn'); // Nuevo ID
    async function cargarNotasBlog() {
        blogContentDiv.innerHTML = '<p>Cargando artículos...</p>';
        try {
            const response = await fetch('[https://jsonplaceholder.typicode.com/posts?_limit=5](https://jsonplaceholder.typicode.com/posts?_limit=5)');
            const articles = await response.json();
            blogContentDiv.innerHTML = '';
            articles.forEach(article => {
                const articleCard = document.createElement('div');
                articleCard.className = 'blog-article-card';
                articleCard.innerHTML = `
                    <h4>${article.title}</h4>
                    <p>${article.body.substring(0, 100)}...</p>
                    <small>Fuente: Blog de Neurodiversidad</small>
                    <a href="#" class="article-link">Leer Más ↗</a>
                `;
                blogContentDiv.appendChild(articleCard);
            });
            showTempMessage('Artículos del blog actualizados.', 'success');
        } catch (error) {
            blogContentDiv.innerHTML = '<p>Error al cargar artículos del blog.</p>';
            console.error('Error al cargar notas de blog:', error);
            showTempMessage('Error al cargar artículos del blog.', 'error');
        }
    }
    // Adjuntar event listener al botón de actualizar blog
    refreshBlogBtn.addEventListener('click', cargarNotasBlog);
    cargarNotasBlog(); // Cargar al inicio

    const nutricionContentDiv = document.getElementById('nutricion-content');
    const refreshNutricionBtn = document.getElementById('refresh-nutricion-btn'); // Nuevo ID
    async function cargarNutricion() {
        nutricionContentDiv.innerHTML = '<p>Cargando recomendaciones...</p>';
        try {
            const data = [
                { title: "Hidratación Esencial", content: "Beber suficiente agua es crucial para la función cerebral y la energía. Intenta beber 8 vasos al día.", source: "OMS" },
                { title: "Omega-3 y Cerebro", content: "Los ácidos grasos Omega-3, encontrados en pescados grasos y nueces, son vitales para la salud cerebral y la concentración.", source: "Harvard Health" },
                { title: "Alimentos Integrales", content: "Opta por granos enteros, frutas y verduras para un suministro constante de energía y nutrientes.", source: "Nutrición al Día" }
            ];
            nutricionContentDiv.innerHTML = '';
            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'nutricion-card';
                card.innerHTML = `
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                    <small>Fuente: ${item.source}</small>
                `;
                nutricionContentDiv.appendChild(card);
            });
            showTempMessage('Contenido de nutrición actualizado.', 'success');
        } catch (error) {
            nutricionContentDiv.innerHTML = '<p>Error al cargar contenido de nutrición.</p>';
            console.error('Error al cargar nutrición:', error);
            showTempMessage('Error al cargar contenido de nutrición.', 'error');
        }
    }
    // Adjuntar event listener al botón de actualizar nutrición
    refreshNutricionBtn.addEventListener('click', cargarNutricion);
    cargarNutricion(); // Cargar al inicio

    // Actualizar contadores de estado
    function updateAppStatus() {
        const checklistItemsCount = checkListUl.children.length;
        document.getElementById('tasks-count').textContent = checklistItemsCount;
        document.getElementById('checklist-count').textContent = checklistItemsCount;
    }
    setInterval(updateAppStatus, 5000);
    updateAppStatus();
}

// Escuchar el evento DOMContentLoaded para inicializar Firebase y luego la app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar Firebase con la configuración proporcionada
        const firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);

        // Adjuntar event listeners a los botones de navegación
        document.getElementById('btn-pomodoro').addEventListener('click', () => mostrarSeccion('pomodoro'));
        document.getElementById('btn-tareas').addEventListener('click', () => mostrarSeccion('tareas'));
        document.getElementById('btn-checklist').addEventListener('click', () => mostrarSeccion('checklist'));
        document.getElementById('btn-journal').addEventListener('click', () => mostrarSeccion('journal'));
        document.getElementById('btn-notas').addEventListener('click', () => mostrarSeccion('notas'));
        document.getElementById('btn-config').addEventListener('click', () => mostrarSeccion('config'));

        // Manejar la autenticación
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                // Una vez autenticado, cargar todos los datos
                loadAllUserData();
            } else {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Error al iniciar sesión en Firebase:", error);
                    showTempMessage(`Error de autenticación: ${error.message}`, 'error');
                }
            }
        });

        // Inicializar la primera sección visible al cargar la página
        mostrarSeccion('pomodoro');

    } catch (error) {
        console.error("Error al inicializar la aplicación:", error);
        showTempMessage(`Error crítico al iniciar la app: ${error.message}`, 'error');
    }
});
