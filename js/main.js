// Las importaciones de Firebase SDK se eliminan de aquí porque se cargan globalmente en index.html
// Las variables globales db, auth, currentUserId, appId, initialAuthToken
// se acceden a través del objeto window, ya que se exponen en el script de index.html.

// Inicializar variables globales de Firebase directamente desde window.
// Esto asume que el script inline en index.html ya las ha definido antes de que main.js se cargue.
const db = window.db;
const auth = window.auth;
let currentUserId = window.currentUserId; // currentUserId puede cambiar con la autenticación
const appId = window.appId; // appId debería ser constante

// Exponer loadAllUserData globalmente para que el script inline de index.html pueda llamarla
window.loadAllUserData = loadAllUserData;

let isLoggingOut = false; // Nueva bandera para controlar el estado de cierre de sesión

// Lógica principal de la aplicación que se ejecuta una vez que Firebase está listo
async function loadAllUserData() {
    console.log("loadAllUserData: Iniciando carga de datos del usuario...");
    
    // Las variables db, auth, currentUserId, appId ya están inicializadas globalmente
    // por lo que no necesitamos reasignarlas aquí desde window.
    
    // Si Firebase no está completamente inicializado o el usuario no está autenticado, no cargamos los datos.
    // onAuthStateChanged se encargará de llamar a loadAllUserData cuando sea apropiado.
    if (!db || !auth || !currentUserId) {
        console.warn("loadAllUserData: Firebase o currentUserId no disponibles. No se cargarán los datos del usuario.");
        return;
    }

    console.log("loadAllUserData: Firebase y Usuario Autenticado. UID:", currentUserId);
    // Obtener el usuario actual para mostrar el nombre
    const user = auth.currentUser; // Usar la variable global 'auth'
    const userDisplayNameElement = document.getElementById('user-display-name');
    if (userDisplayNameElement) {
        userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
    } else {
        console.error("loadAllUserData: Elemento 'user-display-name' no encontrado.");
    }
    window.showTempMessage(`Bienvenido, usuario ${user.displayName || user.email || user.uid.substring(0, 8)}...`, 'info'); // Usar userName aquí también

    // --- Lógica del Tour de Bienvenida ---
    const tourOverlay = document.getElementById('welcome-tour-overlay');
    const tourTitle = document.getElementById('tour-title');
    const tourDescription = document.getElementById('tour-description');
    const tourHighlightImage = document.getElementById('tour-highlight-image');
    const tourBackBtn = document.getElementById('tour-back-btn');
    const tourNextBtn = document.getElementById('tour-next-btn');
    const tourSkipBtn = document.getElementById('tour-skip-btn');
    const tourDotsContainer = document.getElementById('tour-dots');

    let currentTourStep = 0;
    const tourSteps = [
        {
            title: "¡Bienvenido a TDAH Helper App!",
            description: "Esta aplicación está diseñada para ayudarte a gestionar tu día a día, mejorar tu concentración y organizar tus tareas de forma efectiva. ¡Vamos a explorar sus funciones principales!",
            image: "" // No image for intro
        },
        {
            title: "⏱️ Temporizador Pomodoro",
            description: "Usa el temporizador Pomodoro para trabajar en bloques de tiempo concentrado (25 min) seguidos de descansos cortos (5 min). ¡Ideal para mantener el foco y evitar el agotamiento!",
            image: "https://placehold.co/400x200/4F46E5/FFFFFF?text=Pomodoro+Timer" // Placeholder image for Pomodoro
        },
        {
            title: "✅ Checklist Rápido",
            description: "Añade y gestiona tus tareas diarias de forma sencilla. Marca las completadas y prioriza tus 'Tareas Más Importantes' (MITs) para un día productivo.",
            image: "https://placehold.co/400x200/7C3AED/FFFFFF?text=Checklist" // Placeholder image for Checklist
        },
        {
            title: "📝 Journal Personal",
            description: "Un espacio seguro para escribir tus pensamientos, emociones, logros y desafíos. Reflexionar te ayudará a entenderte mejor y a gestionar tu bienestar.",
            image: "https://placehold.co/400x200/667eea/FFFFFF?text=Journal" // Placeholder image for Journal
        },
        {
            title: "✅ Hábitos Diarios", // Título actualizado para el tour
            description: "Establece y sigue tus hábitos diarios, como beber agua o meditar. ¡Construye rutinas saludables y visualiza tu progreso día a día!",
            image: "https://placehold.co/400x200/764ba2/FFFFFF?text=Habits" // Placeholder image for Habits
        },
        {
            title: "¡Listo para Empezar!",
            description: "Explora las secciones, personaliza tu experiencia y descubre cómo TDAH Helper App puede transformar tu productividad y bienestar. ¡Estamos aquí para apoyarte!",
            image: "" // No image for outro
        }
    ];

    if (tourOverlay && tourTitle && tourDescription && tourHighlightImage && tourBackBtn && tourNextBtn && tourSkipBtn && tourDotsContainer) {
        console.log("Tour: Todos los elementos HTML del Tour de Bienvenida encontrados.");
        async function showWelcomeTour() {
            const userSettingsRef = db.collection(`artifacts/${appId}/users/${currentUserId}/settings`).doc('appSettings');
            try {
                const doc = await userSettingsRef.get();
                console.log("Tour: Documento de configuración de usuario para el tour:", doc.exists ? doc.data() : "No existe");
                if (doc.exists && doc.data().tourCompleted) {
                    console.log("Tour: Ya completado para este usuario. No se mostrará.");
                    return; // No mostrar el tour si ya fue completado
                }
            } catch (error) {
                console.error("Tour: Error al verificar estado del tour en Firestore:", error);
                // Si hay un error, por seguridad, mostramos el tour
            }

            console.log("Tour: Mostrando overlay del tour. Añadiendo 'active' a welcome-tour-overlay.");
            tourOverlay.classList.add('active');
            renderTourStep();
            createTourDots();
        }

        function renderTourStep() {
            const step = tourSteps[currentTourStep];
            tourTitle.textContent = step.title;
            tourDescription.textContent = step.description;

            if (step.image) {
                tourHighlightImage.src = step.image;
                tourHighlightImage.style.display = 'block';
                console.log("Tour: Imagen de paso actual:", step.image);
            } else {
                tourHighlightImage.style.display = 'none';
                console.log("Tour: No hay imagen para este paso.");
            }

            tourBackBtn.style.display = currentTourStep === 0 ? 'none' : 'block';
            tourNextBtn.textContent = currentTourStep === tourSteps.length - 1 ? 'Finalizar' : 'Siguiente ➡️';
            tourSkipBtn.style.display = currentTourStep === tourSteps.length - 1 ? 'none' : 'block'; // Hide skip on last step

            updateTourDots();
            console.log(`Tour: Renderizando paso ${currentTourStep + 1}/${tourSteps.length}: ${step.title}`);
        }

        function createTourDots() {
            tourDotsContainer.innerHTML = '';
            tourSteps.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.classList.add('tour-dot');
                if (index === currentTourStep) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    currentTourStep = index;
                    renderTourStep();
                });
                tourDotsContainer.appendChild(dot);
            });
            console.log("Tour: Dots de navegación creados.");
        }

        function updateTourDots() {
            document.querySelectorAll('.tour-dot').forEach((dot, index) => {
                if (index === currentTourStep) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
            console.log("Tour: Dots de navegación actualizados.");
        }

        async function nextTourStep() {
            console.log("Tour: Click en Siguiente/Finalizar.");
            if (currentTourStep < tourSteps.length - 1) {
                currentTourStep++;
                renderTourStep();
            } else {
                await completeTour();
            }
        }

        async function prevTourStep() {
            console.log("Tour: Click en Anterior.");
            if (currentTourStep > 0) {
                currentTourStep--;
                renderTourStep();
            }
        }

        async function completeTour() {
            console.log("Tour: Completando tour.");
            const userSettingsRef = db.collection(`artifacts/${appId}/users/${currentUserId}/settings`).doc('appSettings');
            try {
                await userSettingsRef.set({ tourCompleted: true }, { merge: true });
                console.log("Tour: Estado de tour completado guardado en Firestore.");
            } catch (error) {
                console.error("Tour: Error al guardar estado de tour completado:", error);
            }
            tourOverlay.classList.remove('active');
            window.showTempMessage("¡Tour de bienvenida completado! Explora la app.", 'info', 5000);
            console.log("Tour: Tour completado y ocultado.");
        }

        tourNextBtn.addEventListener('click', nextTourStep);
        tourBackBtn.addEventListener('click', prevTourStep);
        tourSkipBtn.addEventListener('click', completeTour); // Skip also completes the tour

        // Llamar al tour de bienvenida después de que todo lo demás esté cargado
        showWelcomeTour();
    } else {
        console.warn("Tour: Algunos elementos HTML del Tour de Bienvenida no encontrados. Asegúrate de que tu HTML esté actualizado con los IDs correctos.");
    }


    // --- Lógica del Journal ---
    const journalEntryTextarea = document.getElementById('journalEntry');
    const saveJournalEntryButton = document.getElementById('save-journal-entry-btn');
    const journalEntriesList = document.getElementById('journalEntriesList');

    if (journalEntryTextarea && saveJournalEntryButton && journalEntriesList) {
        console.log("Journal: Elementos HTML del Journal encontrados.");
        const journalCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/journalEntries`);
        journalCollectionRef.orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            console.log("Journal: Recibiendo snapshot de entradas.");
            journalEntriesList.innerHTML = ''; // Limpiar la lista antes de añadir nuevos elementos
            if (snapshot.empty) {
                console.log("Journal: Colección vacía. Mostrando mensaje de vacío.");
                journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún. ¡Escribe tu primera entrada!</li>'; // Mensaje si está vacío
                return;
            }
            console.log(`Journal: ${snapshot.size} entradas encontradas. Renderizando...`);
            snapshot.forEach((doc, index) => {
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
                console.log(`Journal: Añadida entrada "${entry.text.substring(0, Math.min(entry.text.length, 20))}..." a la lista.`);
            });
        }, (error) => {
            console.error("Journal: Error al escuchar entradas del diario:", error);
            window.showTempMessage(`Error al cargar diario: ${error.message}`, 'error');
        });

        saveJournalEntryButton.addEventListener('click', async () => {
            const entryText = journalEntryTextarea.value.trim();
            if (entryText) {
                saveJournalEntryButton.classList.add('button-clicked');
                setTimeout(() => {
                    saveJournalEntryButton.classList.remove('button-clicked');
                }, 300);

                try {
                    await journalCollectionRef.add({
                        text: entryText,
                        timestamp: new Date().toISOString()
                    });
                    journalEntryTextarea.value = '';
                    window.showTempMessage('Entrada guardada con éxito!', 'success');
                    console.log("Journal: Nueva entrada guardada en Firestore.");
                } catch (error) {
                    console.error("Journal: Error al guardar entrada del diario:", error);
                    window.showTempMessage(`Error al guardar: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, escribe algo en tu entrada antes de guardar.', 'warning');
            }
        });
    } else {
        console.warn("Journal: Elementos HTML del Journal no encontrados. Asegúrate de que tu HTML esté actualizado.");
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
        console.log("Pomodoro: Elementos HTML del Temporizador encontrados.");
        pomodoroSettingsDocRef.onSnapshot((docSnap) => {
            console.log("Pomodoro: Recibiendo snapshot de settings.");
            if (docSnap.exists) {
                const settings = docSnap.data();
                console.log("Pomodoro: Configuración de Pomodoro encontrada:", settings);
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
                startTimerBtn.classList.add('button-clicked');
                setTimeout(() => {
                    startTimerBtn.classList.remove('button-clicked');
                }, 300);

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
            pausePomodoroBtn.classList.add('button-clicked');
            setTimeout(() => {
                pausePomodoroBtn.classList.remove('button-clicked');
            }, 300);
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
            resetTimerBtn.classList.add('button-clicked');
            setTimeout(() => {
                resetTimerBtn.classList.remove('button-clicked');
            }, 300);
            window.showTempMessage('Temporizador reiniciado.', 'info');
            console.log("Pomodoro: Temporizador reiniciado.");
        }

        // Adjuntar event listeners a los botones de Pomodoro
        startTimerBtn.addEventListener('click', startTimer);
        pausePomodoroBtn.addEventListener('click', pausarPomodoro);
        resetTimerBtn.addEventListener('click', resetTimer);
    } else {
        console.warn("Pomodoro: Elementos HTML del Temporizador no encontrados. Asegúrate de que tu HTML esté actualizado.");
    }


    // --- Lógica del Checklist ---
    const checkItemInput = document.getElementById('checkItem');
    const addCheckItemBtn = document.getElementById('add-check-item-btn');
    const checkListUl = document.getElementById('checkList');
    const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);

    if (checkItemInput && addCheckItemBtn && checkListUl) {
        console.log("Checklist: Elementos HTML del Checklist encontrados.");
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
                        console.error("Checklist: Error counting MITs from Firestore:", error);
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
                if (await window.showCustomConfirm('¿Estás seguro de que quieres eliminar este ítem del checklist?')) {
                    try {
                        await checklistCollectionRef.doc(itemToDeleteId).delete();
                        window.showTempMessage('Elemento eliminado del checklist.', 'info');
                        console.log(`Checklist: Ítem ${itemToDeleteId} eliminado.`);
                    } catch (error) {
                        console.error("Checklist: Error deleting item:", error);
                        window.showTempMessage(`Error al eliminar: ${error.message}`, 'error');
                    }
                }
            }
        });


        checklistCollectionRef.orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
            console.log("Checklist: Recibiendo snapshot de ítems.");
            checkListUl.innerHTML = ''; // Clear existing list items
            if (snapshot.empty) {
                console.log("Checklist: Colección vacía. Mostrando mensaje de vacío.");
                checkListUl.innerHTML = '<li>No hay ítems en el checklist aún. ¡Añade tu primera tarea!</li>'; // Mensaje si está vacío
                return;
            }
            console.log(`Checklist: ${snapshot.size} ítems encontrados. Renderizando...`);
            snapshot.forEach((docSnap, index) => {
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
                console.log(`Checklist: Añadido ítem "${item.text.substring(0, Math.min(item.text.length, 20))}..." a la lista.`);

                // Micro-interacción: Añadir clase para animación de aparición
                listItem.classList.add('new-item-animation');

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
                addCheckItemBtn.classList.add('button-clicked');
                setTimeout(() => {
                    addCheckItemBtn.classList.remove('button-clicked');
                }, 300);

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
        console.warn("Checklist: Elementos HTML del Checklist no encontrados. Asegúrate de que tu HTML esté actualizado.");
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
        console.log("Trello: Elementos HTML de Trello encontrados.");
        trelloConfigDocRef.onSnapshot((docSnap) => {
            console.log("Trello: Recibiendo snapshot de configuración.");
            if (docSnap.exists) {
                const config = docSnap.data();
                console.log("Trello: Configuración de Trello encontrada:", config);
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
                saveTrelloConfigBtn.classList.add('button-clicked');
                setTimeout(() => {
                    saveTrelloConfigBtn.classList.remove('button-clicked');
                }, 300);

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

            testTrelloBtn.classList.add('button-clicked');
            setTimeout(() => {
                testTrelloBtn.classList.remove('button-clicked');
            }, 300);

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
                    console.log(`Trello: ${filteredCards.length} tareas encontradas para esta semana. Renderizando...`);
                    filteredCards.forEach((card, index) => {
                        const listItem = document.createElement('li');
                        const dueDate = card.due ? new Date(card.due).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Sin fecha';
                        listItem.textContent = `${card.name} (Vence: ${dueDate})`;
                        listaTareasUl.appendChild(listItem);
                        console.log(`Trello: Añadida tarea "${card.name.substring(0, Math.min(card.name.length, 20))}..." a la lista.`);
                    });
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
        console.warn("Trello: Elementos HTML de Trello no encontrados. Asegúrate de que tu HTML esté actualizado.");
    }


    // --- Lógica de Limpiar Datos ---
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        console.log("Limpiar Datos: Botón 'clear-data-btn' encontrado.");
        async function limpiarDatos() {
            if (await window.showCustomConfirm('¿Estás seguro de que quieres limpiar TODOS los datos guardados (Pomodoro, Checklist, Trello Config, Journal, Hábitos)? Esta acción es irreversible.')) {
                clearDataBtn.classList.add('button-clicked');
                setTimeout(() => {
                    clearDataBtn.classList.remove('button-clicked');
                }, 300);

                try {
                    console.log("Limpiar Datos: Iniciando limpieza...");
                    const journalCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/journalEntries`);
                    const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);
                    const pomodoroSettingsDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/pomodoroSettings`).doc('current');
                    const trelloConfigDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/trelloConfig`).doc('settings');
                    const habitsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/habits`);

                    const journalDocs = await journalCollectionRef.get();
                    journalDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Entradas de Journal eliminadas.");

                    const checklistDocs = await checklistCollectionRef.get();
                    checklistDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Ítems de Checklist eliminados.");

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

                    const habitDocs = await habitsCollectionRef.get();
                    habitDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Hábitos eliminados.");


                    window.showTempMessage('Todos los datos han sido limpiados.', 'info');
                    // No recargar la página aquí, dejar que onAuthStateChanged maneje el estado de no autenticado
                    // o que el usuario elija una opción de inicio de sesión.
                } catch (error) {
                    console.error("Limpiar Datos: Error al limpiar datos:", error);
                    window.showTempMessage(`Error al limpiar datos: ${error.message}`, 'error');
                }
            }
        }
        clearDataBtn.addEventListener('click', limpiarDatos);
    } else {
        console.warn("Limpiar Datos: Botón 'clear-data-btn' no encontrado. Asegúrate de que tu HTML esté actualizado.");
    }


    // --- Lógica de Notas de Blog y Nutrición (ahora usan DB) ---
    const blogContentDiv = document.getElementById('blog-content');
    const refreshBlogBtn = document.getElementById('refresh-blog-btn');
    // Colección de Firestore para artículos del blog
    // Usaremos la colección pública para que todos los usuarios vean los mismos artículos curados
    const blogArticlesCollectionRef = db.collection(`artifacts/${appId}/blogArticles`);

    if (blogContentDiv && refreshBlogBtn) {
        console.log("Blog: Elementos HTML del Blog encontrados.");
        async function cargarNotasBlog() {
            blogContentDiv.innerHTML = '<p>Cargando artículos...</p>';
            try {
                // Obtener documentos de la colección blogArticles
                const snapshot = await blogArticlesCollectionRef.orderBy('timestamp', 'desc').get();
                blogContentDiv.innerHTML = ''; // Limpiar contenido existente

                if (snapshot.empty) {
                    console.log("Blog: Colección vacía. Mostrando mensaje de vacío.");
                    blogContentDiv.innerHTML = '<p>No hay artículos de blog disponibles aún. ¡Añade algunos desde la consola de Firebase!</p>'; // Mensaje si está vacío
                    return;
                }
                console.log(`Blog: ${snapshot.size} artículos encontrados. Renderizando...`);
                snapshot.forEach((doc, index) => {
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
                    console.log(`Blog: Añadido artículo "${article.title.substring(0, Math.min(article.title.length, 20))}..." a la lista.`);
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
        console.warn("Blog: Elementos HTML del Blog no encontrados. Asegúrate de que tu HTML esté actualizado.");
    }


    const nutricionContentDiv = document.getElementById('nutricion-content');
    const refreshNutricionBtn = document.getElementById('refresh-nutricion-btn');
    // Colección de Firestore para contenido de nutrición
    // Usaremos la colección pública para que todos los usuarios vean el mismo contenido curado
    const nutricionCollectionRef = db.collection(`artifacts/${appId}/public/data/nutritionContent`);

    if (nutricionContentDiv && refreshNutricionBtn) {
        console.log("Nutrición: Elementos HTML de Nutrición encontrados.");
        async function cargarNutricion() {
            nutricionContentDiv.innerHTML = '<p>Cargando recomendaciones...</p>';
            try {
                // Obtener documentos de la colección nutritionContent
                const snapshot = await nutricionCollectionRef.orderBy('timestamp', 'desc').get(); // Ordenar por timestamp
                nutricionContentDiv.innerHTML = ''; // Limpiar contenido existente

                if (snapshot.empty) {
                    console.log("Nutrición: Colección vacía. Mostrando mensaje de vacío.");
                    nutricionContentDiv.innerHTML = '<p>No hay contenido de nutrición disponible aún. ¡Añade algunas recomendaciones!</p>'; // Mensaje si está vacío
                    return;
                }
                console.log(`Nutrición: ${snapshot.size} ítems encontrados. Renderizando...`);
                snapshot.forEach((doc, index) => {
                    const item = doc.data();
                    const card = document.createElement('div');
                    card.className = 'nutricion-card';
                    card.innerHTML = `
                        <h4>${item.title}</h4>
                        <p>${item.content}</p>
                        <small>Fuente: ${item.source}</small>
                        ${item.url ? `<a href="${item.url}" target="_blank" class="article-link">Leer Más ↗</a>` : ''}
                    `;
                    nutricionContentDiv.appendChild(card);
                    console.log(`Nutrición: Añadido ítem "${item.title.substring(0, Math.min(item.title.length, 20))}..." a la lista.`);
                });
                window.showTempMessage('Contenido de nutrición actualizado desde Firestore.', 'success');
                console.log("Nutrición: Contenido cargado desde Firestore.");
            } catch (error) {
                nutricionContentDiv.innerHTML = '<p>Error al cargar contenido de nutrición.</p>';
                console.error('Nutrición: Error al cargar nutrición desde Firestore:', error);
                window.showTempMessage(`Error al cargar contenido de nutrición: ${error.message}`, 'error');
            }
        }
        refreshNutricionBtn.addEventListener('click', cargarNutricion);
        cargarNutricion(); // Cargar al inicio
    } else {
        console.warn("Nutrición: Elementos HTML de Nutrición no encontrados. Asegúrate de que tu HTML esté actualizado.");
    }

    // --- Lógica de Hábitos ---
    const newHabitInput = document.getElementById('newHabitInput');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const habitsListUl = document.getElementById('habitsList');
    const habitsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/habits`);

    // Helper para obtener la fecha de hoy en formato YYYY-MM-DD
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Cargar hábitos desde Firestore
    if (habitsListUl) {
        console.log("Hábitos: Elemento HTML 'habitsList' encontrado.");
        habitsCollectionRef.orderBy('creationDate', 'asc').onSnapshot((snapshot) => {
            console.log("Hábitos: Recibiendo snapshot de hábitos.");
            habitsListUl.innerHTML = ''; // Limpiar lista existente
            if (snapshot.empty) {
                console.log("Hábitos: Colección vacía. Mostrando mensaje de vacío.");
                habitsListUl.innerHTML = '<li>No hay hábitos registrados aún. ¡Añade un nuevo hábito!</li>'; // Mensaje si está vacío
                return;
            }
            console.log(`Hábitos: ${snapshot.size} hábitos encontrados. Renderizando...`);
            snapshot.forEach((docSnap, index) => {
                const habit = docSnap.data();
                const habitId = docSnap.id;
                const listItem = document.createElement('li');
                listItem.className = 'habit-item'; // Clase para estilos de hábito

                const habitNameSpan = document.createElement('span');
                habitNameSpan.textContent = habit.name;
                habitNameSpan.className = 'habit-name';

                const completionContainer = document.createElement('div');
                completionContainer.className = 'habit-completion-track';

                // Generar los últimos 7 días
                const todayDate = new Date();
                const todayDateString = getTodayDateString();

                for (let i = 6; i >= 0; i--) { // Últimos 7 días, incluyendo hoy
                    const date = new Date(todayDate);
                    date.setDate(todayDate.getDate() - i);
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    
                    const isCompleted = habit.dailyCompletions && habit.dailyCompletions[dateString];
                    
                    const checkboxWrapper = document.createElement('div');
                    checkboxWrapper.className = 'completion-checkbox-wrapper';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `habit-${habitId}-${dateString}`;
                    checkbox.dataset.habitId = habitId;
                    checkbox.dataset.date = dateString;
                    checkbox.checked = isCompleted;
                    checkbox.disabled = (dateString !== todayDateString); // Solo el checkbox de hoy es editable

                    const label = document.createElement('label');
                    label.htmlFor = `habit-${habitId}-${dateString}`;
                    label.className = 'completion-label';
                    label.title = date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });

                    checkboxWrapper.appendChild(checkbox);
                    checkboxWrapper.appendChild(label);
                    completionContainer.appendChild(checkboxWrapper);
                }

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'button-danger';
                deleteBtn.textContent = '❌';
                deleteBtn.dataset.id = habitId; // Usar data-id para el ID del documento

                listItem.appendChild(habitNameSpan);
                listItem.appendChild(completionContainer);
                listItem.appendChild(deleteBtn);
                habitsListUl.appendChild(listItem);
                console.log(`Hábitos: Añadido hábito "${habit.name.substring(0, Math.min(habit.name.length, 20))}..." a la lista.`);
            });
        }, (error) => {
            console.error("Hábitos: Error al escuchar hábitos:", error);
            window.showTempMessage(`Error al cargar hábitos: ${error.message}`, 'error');
        });
    } else {
        console.warn("Hábitos: Elemento HTML 'habitsList' no encontrado. Asegúrate de que tu HTML esté actualizado.");
    }

    // Añadir nuevo hábito
    if (newHabitInput && addHabitBtn) {
        console.log("Hábitos: Elementos HTML 'newHabitInput' y 'addHabitBtn' encontrados.");
        addHabitBtn.addEventListener('click', async () => {
            const habitName = newHabitInput.value.trim();
            if (habitName) {
                // Micro-interacción: Feedback visual al botón
                addHabitBtn.classList.add('button-clicked');
                setTimeout(() => {
                    addHabitBtn.classList.remove('button-clicked');
                }, 300);

                try {
                    await habitsCollectionRef.add({
                        name: habitName,
                        creationDate: new Date().toISOString(),
                        dailyCompletions: {} // Mapa para almacenar el seguimiento diario
                    });
                    newHabitInput.value = '';
                    window.showTempMessage('Hábito añadido con éxito!', 'success');
                    console.log("Hábitos: Nuevo hábito añadido.");
                } catch (error) {
                    console.error("Hábitos: Error al añadir hábito:", error);
                    window.showTempMessage(`Error al añadir hábito: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, escribe el nombre del hábito.', 'warning');
            }
        });
    } else {
        console.warn("Hábitos: Elementos HTML 'newHabitInput' o 'addHabitBtn' no encontrados. Asegúrate de que tu HTML esté actualizado.");
    }

    // Manejar el toggle de completado de hábito
    if (habitsListUl) {
        habitsListUl.addEventListener('change', async (e) => {
            const target = e.target;
            if (target.type === 'checkbox' && target.closest('.habit-item')) {
                const habitId = target.dataset.habitId;
                const date = target.dataset.date;
                const isCompleted = target.checked;

                try {
                    const habitDocRef = habitsCollectionRef.doc(habitId);
                    await habitDocRef.update({
                        [`dailyCompletions.${date}`]: isCompleted
                    });
                    window.showTempMessage(`Hábito '${target.closest('.habit-item').querySelector('.habit-name').textContent}' ${isCompleted ? 'completado' : 'desmarcado'} para hoy.`, 'success');
                    console.log(`Hábito ${habitId} actualizado para la fecha ${date}.`);
                } catch (error) {
                    console.error("Hábitos: Error al actualizar completado:", error);
                    window.showTempMessage(`Error al actualizar hábito: ${error.message}`, 'error');
                    target.checked = !isCompleted; // Revert UI on error
                }
            }
        });

        // Manejar la eliminación de hábito
        habitsListUl.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('button-danger') && target.closest('.habit-item')) {
                const habitId = target.dataset.id;
                if (await window.showCustomConfirm('¿Estás seguro de que quieres eliminar este hábito?')) {
                    try {
                        await habitsCollectionRef.doc(habitId).delete();
                        window.showTempMessage('Hábito eliminado.', 'info');
                        console.log(`Hábito ${habitId} eliminado.`);
                    } catch (error) {
                        console.error("Hábitos: Error al eliminar hábito:", error);
                        window.showTempMessage(`Error al eliminar hábito: ${error.message}`, 'error');
                    }
                }
            }
        });
    }


    // Actualizar contadores de estado
    function updateAppStatus() {
        if (currentUserId && db) { // Usar las variables globales
            const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);
            // const habitsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/habits`); // Referencia a la colección de hábitos

            checklistCollectionRef.get().then(snapshot => {
                const checklistItemsCount = snapshot.size;
                const tasksCountElement = document.getElementById('tasks-count');
                const checklistCountElement = document.getElementById('checklist-count');

                if (tasksCountElement) tasksCountElement.textContent = checklistItemsCount;
                if (checklistCountElement) checklistCountElement.textContent = checklistItemsCount;
            }).catch(error => {
                console.error("Error getting checklist count:", error);
            });

            // Puedes añadir un contador para hábitos si lo deseas
            // habitsCollectionRef.get().then(snapshot => {
            //     const habitsCount = snapshot.size;
            //     // Actualiza un elemento HTML si tienes uno para el conteo de hábitos
            // }).catch(error => {
            //     console.error("Error getting habits count:", error);
            // });

        } else {
            const tasksCountElement = document.getElementById('tasks-count');
            const checklistCountElement = document.getElementById('checklist-count');
            if (tasksCountElement) tasksCountElement.textContent = '0';
            if (checklistCountElement) checklistCountElement.textContent = '0';
        }
    }
    setInterval(updateAppStatus, 5000);
    updateAppStatus();
}


// Asegurarse de que el DOM esté completamente cargado antes de interactuar con elementos HTML
document.addEventListener('DOMContentLoaded', async () => {
    // Acceder a las variables globales de Firebase expuestas en el objeto window
    // Estas ya están disponibles porque el script inline en index.html las inicializa
    // NO reasignar db, auth, appId aquí, ya están inicializadas como const/let globales.
    // db = window.db; // REMOVER
    // auth = window.auth; // REMOVER
    // const appId = window.appId; // REMOVER

    // Elementos de la UI de autenticación
    const userDisplayName = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');
    const authButtonsWrapper = document.querySelector('.auth-buttons-wrapper');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const emailSigninToggleBtn = document.getElementById('email-signin-toggle-btn');
    const anonymousSigninBtn = document.getElementById('anonymous-signin-btn');

    // Firebase Auth State Listener
    // Asegurarse de que auth esté definido antes de añadir el listener
    if (!auth) {
        console.error("DOMContentLoaded: Firebase Auth no está inicializado. No se puede configurar el listener onAuthStateChanged.");
        // Podríamos añadir un retry o un mensaje al usuario aquí.
        return;
    }

    auth.onAuthStateChanged(async (user) => { // Usar la variable global 'auth'
        console.log("onAuthStateChanged: Estado de autenticación cambiado. User:", user ? user.uid : "null");

        // Comprobaciones defensivas para asegurar que los elementos existen
        if (!userDisplayName) console.error("onAuthStateChanged: Elemento 'user-display-name' no encontrado en el DOM.");
        if (!logoutBtn) console.error("onAuthStateChanged: Elemento 'logout-btn' no encontrado en el DOM.");
        if (!authButtonsWrapper) console.error("onAuthStateChanged: Elemento '.auth-buttons-wrapper' no encontrado en el DOM.");
        if (!googleSigninBtn) console.error("onAuthStateChanged: Elemento 'google-signin-btn' no encontrado en el DOM.");
        if (!emailSigninToggleBtn) console.error("onAuthStateChanged: Elemento 'email-signin-toggle-btn' no encontrado en el DOM.");
        if (!anonymousSigninBtn) console.error("onAuthStateChanged: Elemento 'anonymous-signin-btn' no encontrado en el DOM.");


        if (user) {
            currentUserId = user.uid; // Actualizar la variable global currentUserId
            console.log("onAuthStateChanged: Usuario autenticado. UID:", currentUserId);

            // Mostrar información del usuario y botón de cerrar sesión
            if (userDisplayName) userDisplayName.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'none'; // Ocultar el wrapper de botones
            if (googleSigninBtn) googleSigninBtn.style.display = 'none'; // Ocultar botón de Google
            if (emailSigninToggleBtn) emailSigninToggleBtn.style.display = 'none'; // Ocultar botón de Email
            if (anonymousSigninBtn) anonymousSigninBtn.style.display = 'none'; // Ocultar botón de Anónimo
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            // Asegurarse de que el user-info-area no esté en modo centrado si el usuario está logueado
            const userInfoArea = document.getElementById('user-info-area');
            if (userInfoArea) userInfoArea.classList.remove('auth-options-visible');


            // Cargar datos del usuario solo si no estamos en el proceso de cierre de sesión
            if (!isLoggingOut) { // Usar la variable global isLoggingOut
                 loadAllUserData(); // Llama a la función globalmente definida
            } else {
                console.log("onAuthStateChanged: Usuario reautenticado por initialAuthToken después de un cierre de sesión explícito. Reiniciando isLoggingOut.");
                isLoggingOut = false; // Usar la variable global isLoggingOut
                loadAllUserData(); // Cargar datos incluso si se reautentica por initialAuthToken
            }

        } else { // Usuario es null (no autenticado)
            currentUserId = null; // Actualizar la variable global currentUserId
            console.log("onAuthStateChanged: Usuario no autenticado.");
            if (userDisplayName) userDisplayName.textContent = 'Por favor, inicia sesión:';
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex'; // Mostrar el wrapper de botones
            if (googleSigninBtn) googleSigninBtn.style.display = 'inline-block'; // Mostrar botón de Google
            if (emailSigninToggleBtn) emailSigninToggleBtn.style.display = 'inline-block'; // Mostrar botón de Email
            if (anonymousSigninBtn) anonymousSigninBtn.style.display = 'inline-block'; // Mostrar botón de Anónimo
            if (logoutBtn) logoutBtn.style.display = 'none';
            // Asegurarse de que el user-info-area esté en modo centrado si no hay usuario
            const userInfoArea = document.getElementById('user-info-area');
            if (userInfoArea) userInfoArea.classList.add('auth-options-visible');

            // Solo intentar signInWithCustomToken si initialAuthToken está presente
            // Y no hay usuario actualmente autenticado Y no estamos explícitamente cerrando sesión.
            if (window.initialAuthToken && !isLoggingOut) { // Usar la variable global isLoggingOut
                try {
                    console.log("onAuthStateChanged: Intentando signInWithCustomToken con initialAuthToken.");
                    await auth.signInWithCustomToken(window.initialAuthToken); // Usar la variable global 'auth'
                    console.log("onAuthStateChanged: signInWithCustomToken exitoso.");
                } catch (error) {
                    console.error("onAuthStateChanged: Error al iniciar sesión con CustomToken:", error);
                    window.showTempMessage(`Error de autenticación inicial: ${error.message}`, 'error');
                }
            } else if (isLoggingOut) { // Usar la variable global isLoggingOut
                // Si estamos explícitamente cerrando sesión, simplemente reiniciamos la bandera y no hacemos nada más.
                isLoggingOut = false; // Usar la variable global isLoggingOut
                console.log("onAuthStateChanged: Cierre de sesión explícito completado. Mostrando opciones de autenticación.");
            }
        }
    });

    // Lógica para el botón de cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                isLoggingOut = true; // Establecer la bandera antes de cerrar sesión
                await auth.signOut(); // Usar la variable global 'auth'
                window.showTempMessage('Sesión cerrada correctamente.', 'info');
                // onAuthStateChanged manejará las actualizaciones de la UI
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                window.showTempMessage(`Error al cerrar sesión: ${error.message}`, 'error');
                isLoggingOut = false; // Resetear la bandera si el cierre de sesión falla
            }
        });
    }

    // Lógica para los nuevos botones de inicio de sesión
    if (anonymousSigninBtn) {
        anonymousSigninBtn.addEventListener('click', async () => {
            anonymousSigninBtn.classList.add('button-clicked');
            setTimeout(() => {
                anonymousSigninBtn.classList.remove('button-clicked');
            }, 300);

            try {
                await auth.signInAnonymously(); // Usar la variable global 'auth'
                window.showTempMessage('Sesión anónima iniciada.', 'success');
            } catch (error) {
                window.showTempMessage(`Error al iniciar sesión anónima: ${error.message}`, 'error');
                console.error("Error al iniciar sesión anónima:", error);
            }
        });
    }

    if (emailSigninToggleBtn) {
        emailSigninToggleBtn.addEventListener('click', () => {
            emailSigninToggleBtn.classList.add('button-clicked');
            setTimeout(() => {
                emailSigninToggleBtn.classList.remove('button-clicked');
            }, 300);
            window.showTempMessage('Funcionalidad de inicio de sesión con Email no implementada aún. ¡Pronto estará disponible!', 'info', 5000);
            console.log("Intento de inicio de sesión con Email.");
        });
    }

    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', async () => {
            googleSigninBtn.classList.add('button-clicked');
            setTimeout(() => {
                googleSigninBtn.classList.remove('button-clicked');
            }, 300);

            try {
                // Usar la API de Firebase v8 (compatibilidad) que ya está cargada globalmente
                const provider = new firebase.auth.GoogleAuthProvider();
                // CORRECCIÓN: Llamar signInWithPopup con UN SOLO argumento (el proveedor)
                await firebase.auth().signInWithPopup(provider);
                window.showTempMessage('Sesión con Google iniciada correctamente.', 'success');
            } catch (error) {
                console.error("Error al iniciar sesión con Google:", error);
                let errorMessage = error.message;
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'El popup de inicio de sesión fue cerrado. Inténtalo de nuevo.';
                } else if (error.code === 'auth/cancelled-popup-request') {
                    errorMessage = 'Ya hay una solicitud de inicio de sesión pendiente. Por favor, completa la anterior o inténtalo de nuevo.';
                } else if (error.code === 'auth/auth-domain-config-error') {
                    errorMessage = 'Error de configuración del dominio de autenticación. Asegúrate de que tu dominio esté autorizado en la consola de Firebase.';
                }
                window.showTempMessage(`Error al iniciar sesión con Google: ${errorMessage}`, 'error');
            }
        });
    }

    // Inicializar la sección Pomodoro al cargar la página
    console.log("DOMContentLoaded: Llamando a mostrarSeccion('pomodoro').");
    window.mostrarSeccion('pomodoro');

    // Añadir listeners a los botones de navegación para mostrar/ocultar secciones
    document.getElementById('btn-pomodoro').addEventListener('click', () => {
        window.mostrarSeccion('pomodoro');
        console.log("Sección Pomodoro activa. ClassList:", document.getElementById('pomodoro').classList.value);
    });
    document.getElementById('btn-tareas').addEventListener('click', () => {
        window.mostrarSeccion('tareas');
        console.log("Sección Tareas activa. ClassList:", document.getElementById('tareas').classList.value);
    });
    document.getElementById('btn-checklist').addEventListener('click', () => {
        window.mostrarSeccion('checklist');
        console.log("Sección Checklist activa. ClassList:", document.getElementById('checklist').classList.value);
    });
    document.getElementById('btn-journal').addEventListener('click', () => {
        window.mostrarSeccion('journal');
        console.log("Sección Journal activa. ClassList:", document.getElementById('journal').classList.value);
    });
    document.getElementById('btn-notas').addEventListener('click', () => {
        window.mostrarSeccion('notas');
        console.log("Sección Notas activa. ClassList:", document.getElementById('notas').classList.value);
    });
    document.getElementById('btn-nutricion').addEventListener('click', () => {
        window.mostrarSeccion('nutricion');
        console.log("Sección Nutrición activa. ClassList:", document.getElementById('nutricion').classList.value);
    });
    document.getElementById('btn-habitos').addEventListener('click', () => {
        window.mostrarSeccion('habitos');
        console.log("Sección Hábitos activa. ClassList:", document.getElementById('habitos').classList.value);
    });
    document.getElementById('btn-config').addEventListener('click', () => {
        window.mostrarSeccion('config');
        console.log("Sección Configuración activa. ClassList:", document.getElementById('config').classList.value);
    });

}); // End of DOMContentLoaded
