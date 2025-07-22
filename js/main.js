// Las importaciones de Firebase SDK se eliminan de aquí porque se cargan globalmente en index.html
// Las variables globales db, auth, currentUserId, appId, initialAuthToken
// se acceden a través del objeto window, ya que se exponen en el script de index.html.

// Inicializar variables globales de Firebase directamente desde window.
// Esto asume que el script inline en index.html ya las ha definido antes de que main.js se cargue.
const db = window.db;
const auth = window.auth;
let currentUserId = window.currentUserId; // currentUserId puede cambiar con la autenticación
const appId = window.appId; // appId debería ser constante
let isLoggingOut = false; // Nueva bandera para controlar el estado de cierre de sesión
let notificationPermissionGranted = false; // Variable global para el estado del permiso de notificación

// Exponer loadAllUserData globalmente para que el script inline de index.html pueda llamarla
window.loadAllUserData = loadAllUserData;

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
                dot.setAttribute('tabindex', '0'); // Hacer el dot tabbable
                dot.setAttribute('role', 'button'); // Indicar que es interactivo
                dot.setAttribute('aria-label', `Paso ${index + 1} del tour`); // Etiqueta para lectores de pantalla

                if (index === currentTourStep) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    currentTourStep = index;
                    renderTourStep();
                });
                dot.addEventListener('keydown', (e) => { // Manejar Enter para los dots
                    if (e.key === 'Enter') {
                        currentTourStep = index;
                        renderTourStep();
                    }
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
    let totalTimeForPomodoro = 1 * 60; // Duración total del ciclo actual (trabajo o descanso)
    let isBreakTime = false; // Add isBreakTime variable for Pomodoro
    const timerDisplay = document.getElementById('timer');
    const pomodoroSettingsDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/pomodoroSettings`).doc('current');
    const pomodoroProgressCircle = document.querySelector('.pomodoro-progress-ring-progress');
    const pomodoroProgressRing = document.querySelector('.pomodoro-progress-ring'); // Para cambiar el color del stroke

    const startTimerBtn = document.getElementById('start-timer-btn');
    const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn');
    const resetTimerBtn = document.getElementById('reset-timer-btn');

    // Calcular la circunferencia del círculo para la barra de progreso
    const radius = pomodoroProgressCircle ? parseFloat(pomodoroProgressCircle.getAttribute('r')) : 90;
    const circumference = radius * 2 * Math.PI;

    if (pomodoroProgressCircle) {
        pomodoroProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        pomodoroProgressCircle.style.strokeDashoffset = circumference; // Empieza lleno
    }

    function setProgress(percent) {
        if (!pomodoroProgressCircle) return;
        const offset = circumference - percent * circumference;
        pomodoroProgressCircle.style.strokeDashoffset = offset;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Actualizar la barra de progreso
        const progressPercent = timeLeft / totalTimeForPomodoro;
        setProgress(progressPercent);

        // Cambiar color de la barra de progreso según el estado
        if (pomodoroProgressCircle) {
            if (isBreakTime) {
                pomodoroProgressCircle.style.stroke = 'var(--secondary-color)'; // Color para descanso
            } else {
                pomodoroProgressCircle.style.stroke = 'var(--primary-color)'; // Color para trabajo
            }
        }
    }

    if (timerDisplay && startTimerBtn && pausePomodoroBtn && resetTimerBtn && pomodoroProgressCircle) {
        console.log("Pomodoro: Elementos HTML del Temporizador y SVG encontrados.");
        pomodoroSettingsDocRef.onSnapshot((docSnap) => {
            console.log("Pomodoro: Recibiendo snapshot de settings.");
            if (docSnap.exists) {
                const settings = docSnap.data();
                console.log("Pomodoro: Configuración de Pomodoro encontrada:", settings);
                timeLeft = settings.timeLeft;
                isRunning = settings.isRunning;
                isBreakTime = settings.isBreakTime || false; // Load isBreakTime
                totalTimeForPomodoro = isBreakTime ? (5 * 60) : (1 * 60); // Set total time based on state
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
                            // Notificación del navegador para fin de tiempo de trabajo
                            if (notificationPermissionGranted) {
                                new Notification('¡Pomodoro Terminado!', {
                                    body: '¡Excelente trabajo! Es hora de un descanso.',
                                    icon: 'https://placehold.co/48x48/4F46E5/FFFFFF?text=P', // Icono de ejemplo
                                    tag: 'pomodoro-complete' // Para evitar notificaciones duplicadas
                                });
                            }

                            setTimeout(async () => { // Use async for await showCustomConfirm
                                console.log("Pomodoro (onSnapshot): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (onSnapshot): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60; // 5 minutos para descanso
                                    totalTimeForPomodoro = 5 * 60; // Update total time for break
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
                            // Notificación del navegador para fin de descanso
                            if (notificationPermissionGranted) {
                                new Notification('¡Descanso Terminado!', {
                                    body: '¡Es hora de volver al trabajo!',
                                    icon: 'https://placehold.co/48x48/7C3AED/FFFFFF?text=D', // Icono de ejemplo
                                    tag: 'pomodoro-break' // Para evitar notificaciones duplicadas
                                });
                            }
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
                            // Notificación del navegador para fin de tiempo de trabajo
                            if (notificationPermissionGranted) {
                                new Notification('¡Pomodoro Terminado!', {
                                    body: '¡Excelente trabajo! Es hora de un descanso.',
                                    icon: 'https://placehold.co/48x48/4F46E5/FFFFFF?text=P', // Icono de ejemplo
                                    tag: 'pomodoro-complete'
                                });
                            }

                            setTimeout(async () => { // Use async for await showCustomConfirm
                                console.log("Pomodoro (startTimer): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (startTimer): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60; // 5 minutos para descanso
                                    totalTimeForPomodoro = 5 * 60; // Update total time for break
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
                            // Notificación del navegador para fin de descanso
                            if (notificationPermissionGranted) {
                                new Notification('¡Descanso Terminado!', {
                                    body: '¡Es hora de volver al trabajo!',
                                    icon: 'https://placehold.co/48x48/7C3AED/FFFFFF?text=D', // Icono de ejemplo
                                    tag: 'pomodoro-break'
                                });
                            }
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
            totalTimeForPomodoro = 1 * 60; // Reset total time to work time
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
        console.log("Limpiar Datos: Botón 'clear-data-btn' encontrado.");
        async function limpiarDatos() {
            if (await window.showCustomConfirm('¿Estás seguro de que quieres limpiar TODOS los datos guardados (Pomodoro, Checklist, Trello Config, Journal)? Esta acción es irreversible.')) {
                try {
                    console.log("Limpiar Datos: Iniciando limpieza...");
                    const journalCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/journalEntries`);
                    const checklistCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/checklistItems`);
                    const pomodoroSettingsDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/pomodoroSettings`).doc('current');
                    const trelloConfigDocRef = db.collection(`artifacts/${appId}/users/${currentUserId}/trelloConfig`).doc('settings');
                    const habitsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/habits`); // Referencia a la colección de hábitos

                    // Eliminar documentos de Journal
                    const journalDocs = await journalCollectionRef.get();
                    journalDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Entradas de Journal eliminadas.");

                    // Eliminar documentos de Checklist
                    const checklistDocs = await checklistCollectionRef.get();
                    checklistDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Ítems de Checklist eliminados.");

                    // Eliminar documentos de Hábitos
                    const habitsDocs = await habitsCollectionRef.get();
                    habitsDocs.forEach(async (d) => await d.ref.delete());
                    console.log("Limpiar Datos: Hábitos eliminados.");


                    // Eliminar documento de configuración de Pomodoro
                    const pomodoroDocSnap = await pomodoroSettingsDocRef.get();
                    if (pomodoroDocSnap.exists) {
                        await pomodoroSettingsDocRef.delete();
                        console.log("Limpiar Datos: Configuración de Pomodoro eliminada.");
                    }

                    // Eliminar documento de configuración de Trello
                    const trelloDocSnap = await trelloConfigDocRef.get();
                    if (trelloDocSnap.exists) {
                        await trelloConfigDocRef.delete();
                        console.log("Limpiar Datos: Configuración de Trello eliminada.");
                    }

                    window.showTempMessage('Todos los datos han sido limpiados.', 'info');
                    location.reload(); // Recargar la página para reflejar los cambios
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
        console.log("Blog: Elementos HTML del Blog encontrados.");
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
        console.log("Nutrición: Elementos HTML de Nutrición encontrados.");
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

    // --- Lógica de Hábitos ---
    const newHabitInput = document.getElementById('newHabitInput');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const habitsList = document.getElementById('habitsList');
    const habitsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUserId}/habits`);

    if (newHabitInput && addHabitBtn && habitsList) {
        console.log("Hábitos: Elementos HTML de Hábitos encontrados.");
        // Listener para cargar hábitos
        habitsCollectionRef.orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
            console.log("Hábitos: Recibiendo snapshot de hábitos.");
            habitsList.innerHTML = '';
            if (snapshot.empty) {
                console.log("Hábitos: Colección vacía. Mostrando mensaje de vacío.");
                habitsList.innerHTML = '<li>No hay hábitos registrados aún. ¡Añade tu primer hábito!</li>';
                return;
            }
            console.log(`Hábitos: ${snapshot.size} hábitos encontrados. Renderizando...`);
            snapshot.forEach(doc => {
                const habit = doc.data();
                const habitId = doc.id;
                const listItem = document.createElement('li');
                // Representar el seguimiento diario (ej. los últimos 7 días)
                const today = new Date();
                const dailyTrackingHtml = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (6 - i)); // Últimos 7 días
                    const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
                    const isCompleted = habit.dailyCompletions && habit.dailyCompletions[dateString];
                    return `
                        <span class="habit-day-dot ${isCompleted ? 'completed' : ''}" data-date="${dateString}" data-habit-id="${habitId}" title="${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} ${isCompleted ? 'Completado' : 'Pendiente'}" tabindex="0" role="button" aria-label="Marcar hábito ${habit.name} para el ${date.toLocaleDateString('es-ES')}"></span>
                    `;
                }).join('');

                listItem.innerHTML = `
                    <span>${habit.name}</span>
                    <div class="habit-tracking-dots">${dailyTrackingHtml}</div>
                    <button class="button-danger" data-id="${habitId}">❌</button>
                `;
                habitsList.appendChild(listItem);
                console.log(`Hábitos: Añadido hábito "${habit.name}" a la lista.`);
            });
        }, (error) => {
            console.error("Hábitos: Error al escuchar hábitos:", error);
            window.showTempMessage(`Error al cargar hábitos: ${error.message}`, 'error');
        });

        // Añadir nuevo hábito
        addHabitBtn.addEventListener('click', async () => {
            const habitName = newHabitInput.value.trim();
            if (habitName) {
                addHabitBtn.classList.add('button-clicked');
                setTimeout(() => {
                    addHabitBtn.classList.remove('button-clicked');
                }, 300);
                try {
                    await habitsCollectionRef.add({
                        name: habitName,
                        timestamp: new Date().toISOString(),
                        dailyCompletions: {} // Mapa para guardar el estado de completado por fecha
                    });
                    newHabitInput.value = '';
                    window.showTempMessage('Hábito añadido con éxito.', 'success');
                    console.log("Hábitos: Nuevo hábito añadido.");
                } catch (error) {
                    console.error("Hábitos: Error al añadir hábito:", error);
                    window.showTempMessage(`Error al añadir hábito: ${error.message}`, 'error');
                }
            } else {
                window.showTempMessage('Por favor, escribe el nombre del hábito.', 'warning');
            }
        });

        // Marcar hábito como completado/incompleto para un día específico (delegación de eventos)
        habitsList.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('habit-day-dot')) {
                const habitId = target.dataset.habitId;
                const dateString = target.dataset.date; // YYYY-MM-DD
                
                try {
                    const habitDocRef = habitsCollectionRef.doc(habitId);
                    const docSnap = await habitDocRef.get();
                    if (docSnap.exists) {
                        const habitData = docSnap.data();
                        const currentCompletions = habitData.dailyCompletions || {};
                        const isCurrentlyCompleted = currentCompletions[dateString];

                        currentCompletions[dateString] = !isCurrentlyCompleted; // Toggle state

                        await habitDocRef.update({
                            dailyCompletions: currentCompletions
                        });
                        window.showTempMessage(`Hábito ${habitData.name} ${isCurrentlyCompleted ? 'marcado como pendiente' : 'completado'} para ${dateString}.`, 'info');
                        console.log(`Hábito: ${habitId} actualizado para fecha ${dateString}.`);
                    }
                } catch (error) {
                    console.error("Hábitos: Error al actualizar estado de completado:", error);
                    window.showTempMessage(`Error al actualizar hábito: ${error.message}`, 'error');
                }
            } else if (target.classList.contains('button-danger')) {
                // Eliminar hábito
                const habitIdToDelete = target.dataset.id;
                if (await window.showCustomConfirm('¿Estás seguro de que quieres eliminar este hábito?')) {
                    try {
                        await habitsCollectionRef.doc(habitIdToDelete).delete();
                        window.showTempMessage('Hábito eliminado.', 'info');
                        console.log(`Hábito: ${habitIdToDelete} eliminado.`);
                    } catch (error) {
                        console.error("Hábitos: Error al eliminar hábito:", error);
                        window.showTempMessage(`Error al eliminar hábito: ${error.message}`, 'error');
                    }
                }
            }
        });

        // Manejar eventos de teclado para los habit-day-dot
        habitsList.addEventListener('keydown', async (e) => {
            const target = e.target;
            // Si el elemento enfocado es un habit-day-dot y se presiona Enter o Espacio
            if (target.classList.contains('habit-day-dot') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault(); // Prevenir el scroll de la página con Espacio
                const habitId = target.dataset.habitId;
                const dateString = target.dataset.date;
                
                try {
                    const habitDocRef = habitsCollectionRef.doc(habitId);
                    const docSnap = await habitDocRef.get();
                    if (docSnap.exists) {
                        const habitData = docSnap.data();
                        const currentCompletions = habitData.dailyCompletions || {};
                        const isCurrentlyCompleted = currentCompletions[dateString];

                        currentCompletions[dateString] = !isCurrentlyCompleted; // Toggle state

                        await habitDocRef.update({
                            dailyCompletions: currentCompletions
                        });
                        window.showTempMessage(`Hábito ${habitData.name} ${isCurrentlyCompleted ? 'marcado como pendiente' : 'completado'} para ${dateString}.`, 'info');
                        console.log(`Hábito: ${habitId} actualizado para fecha ${dateString}.`);
                    }
                } catch (error) {
                    console.error("Hábitos: Error al actualizar estado de completado (keydown):", error);
                    window.showTempMessage(`Error al actualizar hábito: ${error.message}`, 'error');
                }
            }
        });

    } else {
        console.warn("Hábitos: Elementos HTML de Hábitos no encontrados.");
    }


    // Actualizar contadores de estado
    function updateAppStatus() {
        if (window.currentUserId && window.db) {
            const checklistCollectionRef = window.db.collection(`artifacts/${window.appId}/users/${window.currentUserId}/checklistItems`);
            const habitsCollectionRef = window.db.collection(`artifacts/${window.appId}/users/${window.currentUserId}/habits`);

            checklistCollectionRef.get().then(snapshot => {
                const checklistItemsCount = snapshot.size;
                const checklistCountElement = document.getElementById('checklist-count');
                if (checklistCountElement) checklistCountElement.textContent = checklistItemsCount;
            }).catch(error => {
                console.error("Error getting checklist count:", error);
            });

            habitsCollectionRef.get().then(snapshot => {
                const habitsCount = snapshot.size;
                const tasksCountElement = document.getElementById('tasks-count'); // Reutilizando tasks-count para hábitos
                if (tasksCountElement) tasksCountElement.textContent = habitsCount;
            }).catch(error => {
                console.error("Error getting habits count:", error);
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

// Función para solicitar permiso de notificaciones
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("Este navegador no soporta notificaciones de escritorio.");
        return;
    }

    if (Notification.permission === "granted") {
        notificationPermissionGranted = true;
        console.log("Permiso de notificación ya concedido.");
        return;
    }

    if (Notification.permission === "denied") {
        notificationPermissionGranted = false;
        console.warn("Permiso de notificación denegado por el usuario.");
        window.showTempMessage("Las notificaciones están bloqueadas. Habilítalas en la configuración de tu navegador para recibirlas.", 'warning', 7000);
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            notificationPermissionGranted = true;
            console.log("Permiso de notificación concedido.");
            window.showTempMessage("Notificaciones habilitadas. Te avisaremos cuando el Pomodoro termine.", 'info', 5000);
        } else {
            notificationPermissionGranted = false;
            console.warn("Permiso de notificación denegado.");
            window.showTempMessage("No se pudo habilitar las notificaciones. Puedes activarlas manualmente en la configuración de tu navegador.", 'warning', 7000);
        }
    } catch (error) {
        console.error("Error al solicitar permiso de notificación:", error);
        notificationPermissionGranted = false;
        window.showTempMessage(`Error al solicitar permiso de notificación: ${error.message}`, 'error', 7000);
    }
}


// Asegurarse de que el DOM esté completamente cargado antes de interactuar con elementos HTML
document.addEventListener('DOMContentLoaded', async () => {
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

    // Solicitar permiso de notificación al cargar la aplicación
    await requestNotificationPermission();

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
