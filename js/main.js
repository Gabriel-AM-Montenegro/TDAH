// Las importaciones de Firebase SDK se eliminan de aquí porque se cargan globalmente en index.html
// Las variables globales db, auth, currentUserId, appId, initialAuthToken
// se acceden a través del objeto window, ya que se exponen en el script de index.html.

// Exponer loadAllUserData globalmente para que el script inline de index.html pueda llamarla
window.loadAllUserData = loadAllUserData;

// Variables globales para Firebase (se inicializarán a través de window en loadAllUserData)
let db;
let auth;
let currentUserId;


// Lógica principal de la aplicación que se ejecuta una vez que Firebase está listo
async function loadAllUserData() {
    console.log("loadAllUserData: Iniciando carga de datos del usuario...");
    // Acceder a las variables globales de Firebase expuestas en el objeto window
    db = window.db;
    auth = window.auth;
    currentUserId = window.currentUserId;
    const appId = window.appId; // appId también es global ahora

    if (!db || !auth || !currentUserId) {
        console.error("loadAllUserData: Firebase no está completamente inicializado o el usuario no está autenticado. Reintentando...");
        window.showTempMessage("Error: Firebase no está listo. Recargando...", 'error');
        return;
    }

    console.log("loadAllUserData: Firebase y Usuario Autenticado:", currentUserId);
    const userIdDisplay = document.getElementById('user-id-display');
    if (userIdDisplay) {
        userIdDisplay.textContent = `ID de Usuario: ${currentUserId}`;
    } else {
        console.warn("Elemento 'user-id-display' no encontrado.");
    }
    window.showTempMessage(`Bienvenido, usuario ${currentUserId.substring(0, 8)}...`, 'info');

    // --- Lógica del Journal ---
    const journalEntryTextarea = document.getElementById('journalEntry');
    const saveJournalEntryButton = document.getElementById('save-journal-entry-btn');
    const journalEntriesList = document.getElementById('journalEntriesList');

    if (journalEntryTextarea && saveJournalEntryButton && journalEntriesList) {
        // Acceder a las funciones de Firestore a través del objeto global 'firebase.firestore()' o 'db'
        const journalCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/journalEntries`);
        journalCollectionRef.orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            console.log("Journal: Recibiendo snapshot de entradas.");
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
            console.error("Journal: Error al escuchar entradas del diario:", error);
            window.showTempMessage(`Error al cargar diario: ${error.message}`, 'error');
        });

        saveJournalEntryButton.addEventListener('click', async () => {
            const entryText = journalEntryTextarea.value.trim();
            if (entryText) {
                try {
                    await journalCollectionRef.add({
                        text: entryText,
                        timestamp: new Date().toISOString()
                    });
                    journalEntryTextarea.value = '';
                    window.showTempMessage('Entrada guardada con éxito!', 'success');
                } catch (error) {
                    console.error("Journal: Error al guardar entrada del diario:", error);
                    window.showTempMessage(`Error al guardar: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, escribe algo en tu entrada antes de guardar.', 'warning');
            }
        });
    } else {
        console.warn("Journal: Elementos HTML del Journal no encontrados.");
    }


    // --- Lógica del Temporizador Pomodoro ---
    let timer;
    let isRunning = false;
    let timeLeft = 1 * 60; // Default: 1 minuto para pruebas (antes 25 * 60)
    let isBreakTime = false; // Add isBreakTime variable for Pomodoro
    const timerDisplay = document.getElementById('timer');
    const pomodoroSettingsDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/pomodoroSettings`).doc('current');

    const startTimerBtn = document.getElementById('start-timer-btn');
    const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn');
    const resetTimerBtn = document.getElementById('reset-timer-btn');

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (timerDisplay && startTimerBtn && pausePomodoroBtn && resetTimerBtn) {
        // Cargar estado del pomodoro desde Firestore
        pomodoroSettingsDocRef.onSnapshot((docSnap) => {
            console.log("Pomodoro: Recibiendo snapshot de settings.");
            if (docSnap.exists) {
                const settings = docSnap.data();
                timeLeft = settings.timeLeft;
                isRunning = settings.isRunning;
                isBreakTime = settings.isBreakTime || false; // Load isBreakTime
                updateTimerDisplay();
                if (isRunning && settings.lastUpdated) {
                    const elapsedSinceLastUpdate = (Date.now() - new Date(settings.lastUpdated).getTime()) / 1000;
                    timeLeft = Math.max(0, timeLeft - Math.floor(elapsedSinceLastUpdate));
                    if (timeLeft > 0 && !timer) {
                        startTimer();
                    } else if (timeLeft <= 0) {
                        clearInterval(timer);
                        isRunning = false;
                        savePomodoroState(0, false, isBreakTime); // Save state on completion

                        console.log("Pomodoro (onSnapshot): Tiempo terminado. isBreakTime:", isBreakTime);

                        if (!isBreakTime) { // If work time ended
                            console.log("Pomodoro (onSnapshot): Tiempo de trabajo terminado. Activando confeti y sonido.");
                            window.triggerConfetti();
                            document.getElementById('sound-complete').play().catch(e => {
                                console.error("Error al reproducir sonido de completado (onSnapshot):", e);
                                window.showTempMessage('Error: No se pudo reproducir el sonido de finalización.', 'error', 5000);
                            });

                            setTimeout(async () => { // Use async for await showCustomConfirm
                                console.log("Pomodoro (onSnapshot): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (onSnapshot): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60; // 5 minutos para descanso
                                    isBreakTime = true;
                                    updateTimerDisplay();
                                    savePomodoroState(timeLeft, true, isBreakTime); // Save break state
                                    document.getElementById('sound-break').play().catch(e => {
                                        console.error("Error al reproducir sonido de descanso (onSnapshot):", e);
                                        window.showTempMessage('Error: No se pudo reproducir el sonido de descanso.', 'error', 5000);
                                    });
                                    window.showTempMessage('¡Disfruta tu descanso!', 'info', 4000);
                                    startTimer(); // Start the break timer
                                } else {
                                    console.log("Pomodoro (onSnapshot): Usuario eligió NO iniciar descanso. Reiniciando temporizador.");
                                    resetTimer();
                                }
                            }, 1000); // Small delay to allow messages/confetti to show
                        } else { // If break time ended
                            console.log("Pomodoro (onSnapshot): Tiempo de descanso terminado. Reiniciando temporizador.");
                            window.showTempMessage('¡Descanso terminado! ¡Has recargado energías! Es hora de volver a concentrarte y darlo todo. ¡A por ello!', 'info', 7000); // Motivational message
                            resetTimer();
                        }
                    }
                }
            } else {
                console.log("Pomodoro: No hay settings, creando por defecto.");
                pomodoroSettingsDocRef.set({ timeLeft: 1 * 60, isRunning: false, isBreakTime: false, lastUpdated: new Date().toISOString() }); // Default: 1 minuto para pruebas
            }
        }, (error) => {
            console.error("Pomodoro: Error al cargar settings:", error);
            window.showTempMessage(`Error al cargar Pomodoro: ${error.message}`, 'error');
        });

        async function savePomodoroState(newTimeLeft, newIsRunning, newIsBreakTime) {
            try {
                await pomodoroSettingsDocRef.set({
                    timeLeft: newTimeLeft,
                    isRunning: newIsRunning,
                    isBreakTime: newIsBreakTime, // Save isBreakTime
                    lastUpdated: new Date().toISOString()
                });
                console.log("Pomodoro: Estado guardado en Firestore.");
            } catch (error) {
                console.error("Pomodoro: Error al guardar estado:", error);
                window.showTempMessage(`Error al guardar Pomodoro: ${error.message}`, 'error');
            }
        }

        function startTimer() {
            if (!isRunning) {
                isRunning = true;
                savePomodoroState(timeLeft, true, isBreakTime);
                timer = setInterval(() => {
                    timeLeft--;
                    updateTimerDisplay();
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        isRunning = false;
                        savePomodoroState(0, false, isBreakTime); // Save state on completion
                        
                        console.log("Pomodoro (startTimer): Tiempo terminado. isBreakTime:", isBreakTime);

                        if (!isBreakTime) { // If work time ended
                            console.log("Pomodoro (startTimer): Tiempo de trabajo terminado. Activando confeti y sonido.");
                            window.triggerConfetti();
                            document.getElementById('sound-complete').play().catch(e => {
                                console.error("Error al reproducir sonido de completado (startTimer):", e);
                                window.showTempMessage('Error: No se pudo reproducir el sonido de finalización.', 'error', 5000);
                            });

                            setTimeout(async () => { // Use async for await showCustomConfirm
                                console.log("Pomodoro (startTimer): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (startTimer): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60; // 5 minutos para descanso
                                    isBreakTime = true;
                                    updateTimerDisplay();
                                    savePomodoroState(timeLeft, true, isBreakTime); // Save break state
                                    document.getElementById('sound-break').play().catch(e => {
                                        console.error("Error al reproducir sonido de descanso (startTimer):", e);
                                        window.showTempMessage('Error: No se pudo reproducir el sonido de descanso.', 'error', 5000);
                                    });
                                    window.showTempMessage('¡Disfruta tu descanso!', 'info', 4000);
                                    startTimer(); // Start the break timer
                                } else {
                                    console.log("Pomodoro (startTimer): Usuario eligió NO iniciar descanso. Reiniciando temporizador.");
                                    resetTimer();
                                }
                            }, 1000); // Small delay to allow messages/confetti to show
                        } else { // If break time ended
                            console.log("Pomodoro (startTimer): Tiempo de descanso terminado. Reiniciando temporizador.");
                            window.showTempMessage('¡Descanso terminado! ¡Has recargado energías! Es hora de volver a concentrarte y darlo todo. ¡A por ello!', 'info', 7000); // Motivational message
                            resetTimer();
                        }
                    }
                }, 1000);
                console.log("Pomodoro: Temporizador iniciado.");
            }
        }

        function pausarPomodoro() {
            clearInterval(timer);
            isRunning = false;
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador pausado.', 'info');
            console.log("Pomodoro: Temporizador pausado.");
        }

        function resetTimer() {
            clearInterval(timer);
            isRunning = false;
            timeLeft = 1 * 60; // Always reset to 1 minute work time for testing (before 25 * 60)
            isBreakTime = false; // Ensure we are not in break time
            updateTimerDisplay();
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador reiniciado.', 'info');
            console.log("Pomodoro: Temporizador reiniciado.");
        }

        // Adjuntar event listeners a los botones de Pomodoro
        startTimerBtn.addEventListener('click', startTimer);
        pausePomodoroBtn.addEventListener('click', pausarPomodoro);
        resetTimerBtn.addEventListener('click', resetTimer);
    } else {
        console.warn("Pomodoro: Elementos HTML del Temporizador no encontrados.");
    }


    // --- Lógica del Checklist ---
    const checkItemInput = document.getElementById('checkItem');
    const addCheckItemBtn = document.getElementById('add-check-item-btn');
    const checkListUl = document.getElementById('checkList');
    const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);

    if (checkItemInput && addCheckItemBtn && checkListUl) {
        // Event delegation for checklist items
        checkListUl.addEventListener('change', async (e) => {
            const target = e.target;
            const listItem = target.closest('li'); // Get the parent <li> element
            if (!listItem) return; // Not a list item

            const itemId = target.dataset.itemId; // Get the item ID from the target element's dataset

            if (target.classList.contains('completion-checkbox')) {
                // Handle completion checkbox
                try {
                    await checklistCollectionRef.doc(itemId).update({
                        completed: target.checked
                    });
                    if (target.checked) {
                        listItem.querySelector('span').classList.add('task-completed');
                        document.getElementById('sound-task-done').play().catch(e => console.error("Error playing task done sound:", e));
                        window.showTempMessage('¡Tarea completada!', 'success');
                    } else {
                        listItem.querySelector('span').classList.remove('task-completed');
                    }
                    console.log(`Checklist: Ítem ${itemId} actualizado.`);
                } catch (error) {
                    console.error("Checklist: Error updating item:", error);
                    window.showTempMessage(`Error al actualizar tarea: ${error.message}`, 'error');
                }
            } else if (target.classList.contains('mit-checkbox')) {
                // Handle MIT checkbox
                const newIsMIT = target.checked;
                console.log(`MIT checkbox clicked for item ${itemId}. Intended state: ${newIsMIT}`);

                if (newIsMIT) {
                    try {
                        const mitSnapshot = await checklistCollectionRef.where('isMIT', '==', true).get();
                        const currentMitCount = mitSnapshot.size;
                        console.log(`Current MIT count from Firestore: ${currentMitCount}`);

                        if (currentMitCount >= 3) {
                            target.checked = false; // Revert UI
                            window.showTempMessage('Solo puedes seleccionar hasta 3 MITs a la vez.', 'warning');
                            console.log(`MIT limit exceeded. Reverting checkbox for ${itemId}. Current Firestore MITs: ${currentMitCount}`);
                            return;
                        }
                    } catch (error) {
                        console.error("Error counting MITs from Firestore:", error);
                        window.showTempMessage(`Error al verificar MITs: ${error.message}`, 'error');
                        target.checked = false; // Revert checkbox on error
                        return;
                    }
                }

                try {
                    await checklistCollectionRef.doc(itemId).update({
                        isMIT: newIsMIT
                    });
                    console.log(`Checklist: Ítem ${itemId} MIT updated to ${newIsMIT} in Firestore.`);
                } catch (error) {
                    console.error("Checklist: Error updating MIT:", error);
                    window.showTempMessage(`Error al actualizar MIT: ${error.message}`, 'error');
                    target.checked = !newIsMIT; // Revert to previous state
                }
            }
        });

        // Event delegation for click events (e.g., delete button)
        checkListUl.addEventListener('click', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;

            if (target.classList.contains('button-danger')) {
                const itemToDeleteId = target.dataset.id;
                try {
                    await checklistCollectionRef.doc(itemToDeleteId).delete();
                    window.showTempMessage('Elemento eliminado del checklist.', 'info');
                    console.log(`Checklist: Ítem ${itemToDeleteId} eliminado.`);
                } catch (error) {
                    console.error("Checklist: Error deleting item:", error);
                    window.showTempMessage(`Error al eliminar: ${error.message}`, 'error');
                }
            }
        });


        checklistCollectionRef.orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
            console.log("Checklist: Recibiendo snapshot de ítems.");
            checkListUl.innerHTML = ''; // Clear existing list items
            if (snapshot.empty) {
                checkListUl.innerHTML = '<li>No hay ítems en el checklist aún.</li>';
                return;
            }
            snapshot.forEach(docSnap => {
                const item = docSnap.data();
                const itemId = docSnap.id;
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <input type="checkbox" class="completion-checkbox" id="check-${itemId}" data-item-id="${itemId}" ${item.completed ? 'checked' : ''}>
                    <label for="check-${itemId}"><span>${item.text}</span></label>
                    <div class="mit-controls">
                        <input type="checkbox" class="mit-checkbox" id="mit-${itemId}" data-item-id="${itemId}" ${item.isMIT ? 'checked' : ''} style="display: inline-block !important; width: 25px !important; height: 25px !important; border: 2px solid purple !important;">
                        MIT
                    </div>
                    <button class="button-danger" data-id="${itemId}">❌</button>
                `;
                checkListUl.appendChild(listItem);

                if (item.isMIT) {
                    listItem.classList.add('mit-task');
                }
                if (item.completed) {
                    listItem.querySelector('span').classList.add('task-completed');
                }
            });
        }, (error) => {
            console.error("Checklist: Error listening to items:", error);
            window.showTempMessage(`Error al cargar checklist: ${error.message}`, 'error');
        });

        async function addCheckItem() {
            const itemText = checkItemInput.value.trim();
            if (itemText) {
                try {
                    await checklistCollectionRef.add({
                        text: itemText,
                        completed: false,
                        isMIT: false, // New field for MIT
                        timestamp: new Date().toISOString()
                    });
                    checkItemInput.value = '';
                    window.showTempMessage('Elemento añadido al checklist.', 'success');
                    console.log("Checklist: Nuevo ítem añadido.");
                } catch (error) {
                    console.error("Checklist: Error adding item:", error);
                    window.showTempMessage(`Error al añadir: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, escribe un ítem para el checklist.', 'warning');
            }
        }
        addCheckItemBtn.addEventListener('click', addCheckItem);
    } else {
        console.warn("Checklist: Elementos HTML del Checklist no encontrados.");
    }


    // --- Lógica de Trello ---
    const trelloApiKeyInput = document.getElementById('api-key');
    const trelloTokenInput = document.getElementById('token');
    const trelloBoardIdInput = document.getElementById('board-id');
    const trelloStatusDiv = document.getElementById('trello-status');
    const trelloSuccessMessage = document.getElementById('trello-success-message');
    const trelloConfigDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/trelloConfig`).doc('settings');

    const configTrelloBtn = document.getElementById('config-trello-btn');
    const testTrelloBtn = document.getElementById('test-trello-btn');
    const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn');

    if (trelloApiKeyInput && trelloTokenInput && trelloBoardIdInput && trelloStatusDiv && trelloSuccessMessage && configTrelloBtn && testTrelloBtn && saveTrelloConfigBtn) {
        trelloConfigDocRef.onSnapshot((docSnap) => {
            console.log("Trello: Recibiendo snapshot de configuración.");
            if (docSnap.exists) {
                const config = docSnap.data();
                trelloApiKeyInput.value = config.apiKey || '';
                trelloTokenInput.value = config.token || '';
                trelloBoardIdInput.value = config.boardId || '';
                probarConexionTrello();
            } else {
                console.log("Trello: No hay configuración, inicializando campos vacíos.");
                trelloApiKeyInput.value = '';
                trelloTokenInput.value = '';
                trelloBoardIdInput.value = '';
                trelloStatusDiv.textContent = '❌ Trello no conectado';
                trelloStatusDiv.className = 'status-indicator status-disconnected';
                trelloSuccessMessage.style.display = 'none';
            }
        }, (error) => {
            console.error("Trello: Error al cargar configuración:", error);
            window.showTempMessage(`Error al cargar config Trello: ${error.message}`, 'error');
        });

        async function guardarConfigTrello() {
            const apiKey = trelloApiKeyInput.value.trim();
            const token = trelloTokenInput.value.trim();
            const boardId = trelloBoardIdInput.value.trim();

            if (apiKey && token && boardId) {
                try {
                    await trelloConfigDocRef.set({ apiKey, token, boardId });
                    window.showTempMessage('Configuración de Trello guardada.', 'success');
                    probarConexionTrello();
                    console.log("Trello: Configuración guardada.");
                } catch (error) {
                    console.error("Trello: Error al guardar configuración:", error);
                    window.showTempMessage(`Error al guardar config Trello: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, completa todos los campos de configuración de Trello.', 'warning');
            }
        }

        async function probarConexionTrello() {
            console.log("Trello: Probando conexión...");
            const configSnap = await trelloConfigDocRef.get();
            if (!configSnap.exists) {
                trelloStatusDiv.textContent = '❌ Trello no conectado';
                trelloStatusDiv.className = 'status-indicator status-disconnected';
                trelloSuccessMessage.style.display = 'none';
                console.log("Trello: No hay configuración para probar.");
                return;
            }
            const { apiKey, token, boardId } = configSnap.data();

            if (!apiKey || !token || !boardId) {
                trelloStatusDiv.textContent = '❌ Trello no conectado';
                trelloStatusDiv.className = 'status-indicator status-disconnected';
                trelloSuccessMessage.style.display = 'none';
                console.log("Trello: Configuración incompleta para probar.");
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
                        window.showTempMessage('Conexión con Trello exitosa!', 'success');
                        cargarTareasTrello();
                        console.log("Trello: Conexión exitosa.");
                    } else {
                        trelloStatusDiv.textContent = '⚠️ Board ID inválido o sin listas';
                        trelloStatusDiv.className = 'status-indicator status-warning';
                        trelloSuccessMessage.style.display = 'none';
                        console.warn("Trello: Board ID inválido o sin listas.");
                    }
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al conectar con Trello');
                }
            }
            catch (error) {
                console.error('Trello: Error de conexión:', error);
                trelloStatusDiv.textContent = `❌ Error: ${error.message}`;
                trelloStatusDiv.className = 'status-indicator status-disconnected';
                trelloSuccessMessage.style.display = 'none';
                window.showTempMessage(`Error de Trello: ${error.message}`, 'error');
            }
        }

        async function cargarTareasTrello() {
            console.log("Trello: Cargando tareas...");
            const configSnap = await trelloConfigDocRef.get();
            if (!configSnap.exists) {
                console.log("Trello: No hay configuración de Trello para cargar tareas.");
                return;
            }
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

                // Filtrar tareas para la semana actual (lunes a viernes)
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                // Calculate Monday of the current week
                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Adjust for Sunday
                monday.setHours(0, 0, 0, 0);

                // Calculate Friday of the current week
                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4); // Monday + 4 days = Friday
                friday.setHours(23, 59, 59, 999);

                console.log(`Trello: Filtrando tareas entre ${monday.toISOString()} y ${friday.toISOString()}`);

                const filteredCards = allCards.filter(card => {
                    if (!card.due || card.dueComplete) {
                        return false; // Exclude cards without due date or already completed
                    }
                    const cardDueDate = new Date(card.due);
                    return cardDueDate >= monday && cardDueDate <= friday;
                });

                if (filteredCards.length > 0) {
                    filteredCards.forEach(card => {
                        const listItem = document.createElement('li');
                        const dueDate = card.due ? new Date(card.due).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Sin fecha';
                        listItem.textContent = `${card.name} (Vence: ${dueDate})`;
                        listaTareasUl.appendChild(listItem);
                    });
                    console.log(`Trello: ${filteredCards.length} tareas cargadas para esta semana.`);
                } else {
                    listaTareasUl.innerHTML = '<li>No hay tareas que venzan esta semana en tu board de Trello.</li>';
                    console.log("Trello: No hay tareas para esta semana.");
                }
            } catch (error) {
                console.error('Trello: Error al cargar tareas:', error);
                listaTareasUl.innerHTML = `<li>Error al cargar tareas: ${error.message}</li>`;
                window.showTempMessage(`Error al cargar tareas de Trello: ${error.message}`, 'error');
            }
        }
        configTrelloBtn.addEventListener('click', () => window.mostrarSeccion('config'));
        testTrelloBtn.addEventListener('click', probarConexionTrello);
        saveTrelloConfigBtn.addEventListener('click', guardarConfigTrello);
    } else {
        console.warn("Trello: Elementos HTML de Trello no encontrados.");
    }


    // --- Lógica de Limpiar Datos ---
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        async function limpiarDatos() {
            if (await window.showCustomConfirm('¿Estás seguro de que quieres limpiar TODOS los datos guardados (Pomodoro, Checklist, Trello Config, Journal)? Esta acción es irreversible.')) {
                try {
                    console.log("Limpiar Datos: Iniciando limpieza...");
                    const journalCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/journalEntries`);
                    const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);
                    const pomodoroSettingsDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/pomodoroSettings`).doc('current');
                    const trelloConfigDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/trelloConfig`).doc('settings');

                    const journalDocs = await journalCollectionRef.get();
                    journalDocs.forEach(async (d) => await d.ref.delete());

                    const checklistDocs = await checklistCollectionRef.get();
                    checklistDocs.forEach(async (d) => await d.ref.delete());

                    const pomodoroDocSnap = await pomodoroSettingsDocRef.get();
                    if (pomodoroDocSnap.exists) {
                        await pomodoroSettingsDocRef.delete();
                        console.log("Limpiar Datos: Configuración de Pomodoro eliminada.");
                    }

                    const trelloDocSnap = await trelloConfigDocRef.get();
                    if (trelloDocSnap.exists) {
                        await trelloConfigDocRef.delete();
                        console.log("Limpiar Datos: Configuración de Trello eliminada.");
                    }

                    window.showTempMessage('Todos los datos han sido limpiados.', 'info');
                    location.reload();
                } catch (error) {
                    console.error("Limpiar Datos: Error al limpiar datos:", error);
                    window.showTempMessage(`Error al limpiar datos: ${error.message}`, 'error');
                }
            }
        }
        clearDataBtn.addEventListener('click', limpiarDatos);
    } else {
        console.warn("Limpiar Datos: Botón 'clear-data-btn' no encontrado.");
    }


    // --- Lógica de Notas de Blog y Nutrición (ahora usan DB) ---
    const blogContentDiv = document.getElementById('blog-content');
    const refreshBlogBtn = document.getElementById('refresh-blog-btn');
    // Colección de Firestore para artículos del blog
    // Usaremos la colección pública para que todos los usuarios vean los mismos artículos curados
    // CAMBIO DE RUTA AQUÍ: Ajustado para que coincida con tu estructura actual en Firestore
    const blogArticlesCollectionRef = db.collection(`artifacts/${appId}/blogArticles`); 

    if (blogContentDiv && refreshBlogBtn) {
        async function cargarNotasBlog() {
            blogContentDiv.innerHTML = '<p>Cargando artículos...</p>';
            try {
                // Obtener documentos de la colección blogArticles
                const snapshot = await blogArticlesCollectionRef.orderBy('timestamp', 'desc').get();
                blogContentDiv.innerHTML = ''; // Limpiar contenido existente

                if (snapshot.empty) {
                    blogContentDiv.innerHTML = '<p>No hay artículos de blog disponibles aún.</p>';
                    console.log("Blog: No hay artículos en Firestore.");
                    window.showTempMessage('No hay artículos de blog disponibles.', 'info');
                    return;
                }

                snapshot.forEach(doc => {
                    const article = doc.data();
                    const articleCard = document.createElement('div');
                    articleCard.className = 'blog-article-card';
                    articleCard.innerHTML = `
                        <h4>${article.title}</h4>
                        <p>${article.content}</p>
                        <small>Fuente: ${article.source}</small>
                        ${article.url ? `<a href="${article.url}" target="_blank" class="article-link">Leer Más ↗</a>` : ''}
                    `;
                    blogContentDiv.appendChild(articleCard);
                });
                window.showTempMessage('Artículos del blog actualizados desde Firestore.', 'success');
                console.log("Blog: Artículos cargados desde Firestore.");
            } catch (error) {
                blogContentDiv.innerHTML = '<p>Error al cargar artículos del blog.</p>';
                console.error('Blog: Error al cargar notas de blog desde Firestore:', error);
                window.showTempMessage(`Error al cargar artículos del blog: ${error.message}`, 'error');
            }
        }
        refreshBlogBtn.addEventListener('click', cargarNotasBlog);
        cargarNotasBlog(); // Cargar al inicio
    } else {
        console.warn("Blog: Elementos HTML del Blog no encontrados.");
    }


    const nutricionContentDiv = document.getElementById('nutricion-content');
    const refreshNutricionBtn = document.getElementById('refresh-nutricion-btn');
    if (nutricionContentDiv && refreshNutricionBtn) {
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
                window.showTempMessage('Contenido de nutrición actualizado.', 'success');
                console.log("Nutrición: Contenido cargado.");
            } catch (error) {
                nutricionContentDiv.innerHTML = '<p>Error al cargar contenido de nutrición.</p>';
                console.error('Nutrición: Error al cargar nutrición:', error);
                window.showTempMessage('Error al cargar contenido de nutrición.', 'error');
            }
        }
        refreshNutricionBtn.addEventListener('click', cargarNutricion);
        cargarNutricion();
    } else {
        console.warn("Nutrición: Elementos HTML de Nutrición no encontrados.");
    }


    // Actualizar contadores de estado
    function updateAppStatus() {
        if (window.currentUserId && window.db) {
            const checklistCollectionRef = window.db.collection(`artifacts/${window.appId}/users/${window.currentUserId}/checklistItems`);
            checklistCollectionRef.get().then(snapshot => {
                const checklistItemsCount = snapshot.size;
                const tasksCountElement = document.getElementById('tasks-count');
                const checklistCountElement = document.getElementById('checklist-count');

                if (tasksCountElement) tasksCountElement.textContent = checklistItemsCount;
                if (checklistCountElement) checklistCountElement.textContent = checklistItemsCount;
            }).catch(error => {
                console.error("Error getting checklist count:", error);
            });
        } else {
            const tasksCountElement = document.getElementById('tasks-count');
            const checklistCountElement = document.getElementById('checklist-count');
            if (tasksCountElement) tasksCountElement.textContent = '0';
            if (checklistCountElement) checklistCountElement.textContent = '0';
        }
    }
    setInterval(updateAppStatus, 5000);
    updateAppStatus();
}; // End of loadAllUserData
