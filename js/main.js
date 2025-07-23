// Importaciones de Firebase SDKs como módulos ES6
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, getDocs, writeBatch, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Inicializar variables globales de Firebase
let app;
let db;
//let auth;
let currentUserId; // currentUserId puede cambiar con la autenticación
const appId = window.appId; // appId debería ser constante, viene de window.appId
let isLoggingOut = false; // Nueva bandera para controlar el estado de cierre de sesión
let notificationPermissionGranted = false; // Variable global para el estado del permiso de notificación
const auth = getAuth(firebaseApp);
onAuthStateChanged(auth, user => {
  // Check for user status
});
// Exponer loadAllUserData globalmente para que el script inline de index.html pueda llamarla
window.loadAllUserData = loadAllUserData;

// Función para inicializar Firebase y autenticar
async function initializeFirebaseAndAuth() {
    try {
        // **NUEVA VERIFICACIÓN: Asegurarse de que projectId esté presente en la configuración de Firebase**
        if (!window.firebaseConfig || !window.firebaseConfig.projectId) {
            const errorMessage = "Error de configuración de Firebase: 'projectId' no proporcionado. Asegúrate de que la variable de entorno '__firebase_config' esté correctamente configurada con tu Project ID de Firebase.";
            console.error(errorMessage);
            // Mostrar un mensaje de error crítico en la UI para el usuario
            document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: var(--error-dark); background-color: var(--error-light); border-radius: var(--border-radius-md); margin: 50px auto; max-width: 600px; box-shadow: var(--glass-shadow);">
                <h1 style="color: var(--error-dark);">Error Crítico de Configuración</h1>
                <p style="font-size: 1.1em; margin-bottom: 20px;">${errorMessage}</p>
                <p style="font-size: 0.9em; color: var(--text-medium);">Por favor, revisa la configuración de tu entorno o contacta al soporte.</p>
            </div>`;
            return; // Detener la inicialización si la configuración es inválida
        }

        app = initializeApp(window.firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase inicializado con éxito en main.js.");

        // Listener de estado de autenticación
        onAuthStateChanged(auth, async (user) => {
            console.log("onAuthStateChanged: Estado de autenticación cambiado. User:", user ? user.uid : "null");

            const userDisplayNameElement = document.getElementById('user-display-name');
            const logoutBtn = document.getElementById('logout-btn');
            const authButtonsWrapper = document.querySelector('.auth-buttons-wrapper');
            const googleSigninBtn = document.getElementById('google-signin-btn');
            const emailSigninToggleBtn = document.getElementById('email-signin-toggle-btn');
            const anonymousSigninBtn = document.getElementById('anonymous-signin-btn');
            const userIdDisplay = document.getElementById('user-id-display');
            const userInfoArea = document.getElementById('user-info-area');

            if (user) {
                currentUserId = user.uid;
                console.log("onAuthStateChanged: Usuario autenticado. UID:", currentUserId);

                if (userDisplayNameElement) userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
                if (userIdDisplay) userIdDisplay.textContent = `ID de Usuario: ${user.uid}`;
                if (authButtonsWrapper) authButtonsWrapper.style.display = 'none';
                if (googleSigninBtn) googleSigninBtn.style.display = 'none';
                if (emailSigninToggleBtn) emailSigninToggleBtn.style.display = 'none';
                if (anonymousSigninBtn) anonymousSigninBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'inline-block';
                if (userInfoArea) userInfoArea.classList.remove('auth-options-visible');

                if (!isLoggingOut) {
                    loadAllUserData();
                } else {
                    console.log("onAuthStateChanged: Usuario reautenticado por initialAuthToken después de un cierre de sesión explícito. Reiniciando isLoggingOut.");
                    isLoggingOut = false;
                    loadAllUserData();
                }

            } else { // Usuario es null (no autenticado)
                currentUserId = null;
                console.log("onAuthStateChanged: Usuario no autenticado.");
                if (userDisplayNameElement) userDisplayNameElement.textContent = 'Por favor, inicia sesión:';
                if (userIdDisplay) userIdDisplay.textContent = '';
                if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex';
                if (googleSigninBtn) googleSigninBtn.style.display = 'inline-block';
                if (emailSigninToggleBtn) emailSigninToggleBtn.style.display = 'inline-block';
                if (anonymousSigninBtn) anonymousSigninBtn.style.display = 'inline-block';
                if (logoutBtn) logoutBtn.style.display = 'none';
                if (userInfoArea) userInfoArea.classList.add('auth-options-visible');

                if (window.initialAuthToken && !isLoggingOut) {
                    try {
                        console.log("onAuthStateChanged: Intentando signInWithCustomToken con initialAuthToken.");
                        await signInWithCustomToken(auth, window.initialAuthToken);
                        console.log("onAuthStateChanged: signInWithCustomToken exitoso.");
                    } catch (error) {
                        console.error("onAuthStateChanged: Error al iniciar sesión con CustomToken:", error);
                        window.showTempMessage(`Error de autenticación inicial: ${error.message}`, 'error');
                    }
                } else if (!isLoggingOut) { // Si no hay token inicial y no estamos cerrando sesión, iniciar anónimamente
                    try {
                        console.log("onAuthStateChanged: No hay token inicial, intentando signInAnonymously.");
                        await signInAnonymously(auth);
                        console.log("onAuthStateChanged: signInAnonymously exitoso.");
                    } catch (error) {
                        console.error("onAuthStateChanged: Error al iniciar sesión anónima:", error);
                        window.showTempMessage(`Error al iniciar sesión anónima: ${error.message}`, 'error');
                    }
                } else if (isLoggingOut) {
                    isLoggingOut = false;
                    console.log("onAuthStateChanged: Cierre de sesión explícito completado. Mostrando opciones de autenticación.");
                }
            }
        });

        // Lógica para el botón de cerrar sesión
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    isLoggingOut = true;
                    await signOut(auth);
                    window.showTempMessage('Sesión cerrada correctamente.', 'info');
                } catch (error) {
                    console.error("Error al cerrar sesión:", error);
                    window.showTempMessage(`Error al cerrar sesión: ${error.message}`, 'error');
                    isLoggingOut = false;
                }
            });
        }

        // Lógica para los nuevos botones de inicio de sesión
        const anonymousSigninButton = document.getElementById('anonymous-signin-btn');
        if (anonymousSigninButton) {
            anonymousSigninButton.addEventListener('click', async () => {
                anonymousSigninButton.classList.add('button-clicked');
                setTimeout(() => { anonymousSigninButton.classList.remove('button-clicked'); }, 300);
                try {
                    await signInAnonymously(auth);
                    window.showTempMessage('Sesión anónima iniciada.', 'success');
                } catch (error) {
                    window.showTempMessage(`Error al iniciar sesión anónima: ${error.message}`, 'error');
                    console.error("Error al iniciar sesión anónima:", error);
                }
            });
        }

        const emailSigninToggleButton = document.getElementById('email-signin-toggle-btn');
        if (emailSigninToggleButton) {
            emailSigninToggleButton.addEventListener('click', () => {
                emailSigninToggleButton.classList.add('button-clicked');
                setTimeout(() => { emailSigninToggleButton.classList.remove('button-clicked'); }, 300);
                window.showTempMessage('Funcionalidad de inicio de sesión con Email no implementada aún. ¡Pronto estará disponible!', 'info', 5000);
                console.log("Intento de inicio de sesión con Email.");
            });
        }

        const googleSigninButton = document.getElementById('google-signin-btn');
        if (googleSigninButton) {
            googleSigninButton.addEventListener('click', async () => {
                googleSigninButton.classList.add('button-clicked');
                setTimeout(() => { googleSigninButton.classList.remove('button-clicked'); }, 300);
                try {
                    const provider = new GoogleAuthProvider();
                    await signInWithPopup(auth, provider);
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

    } catch (e) {
        console.error("Error crítico al inicializar Firebase en main.js:", e);
        document.addEventListener('DOMContentLoaded', () => {
            window.showTempMessage(`Error crítico: Firebase no pudo inicializarse. ${e.message}`, 'error', 10000);
        });
    }
}


// Lógica principal de la aplicación que se ejecuta una vez que Firebase está listo y el usuario autenticado
async function loadAllUserData() {
    console.log("loadAllUserData: Iniciando carga de datos del usuario...");
    
    if (!db || !auth || !currentUserId) {
        console.warn("loadAllUserData: Firebase o currentUserId no disponibles. No se cargarán los datos del usuario.");
        return;
    }

    console.log("loadAllUserData: Firebase y Usuario Autenticado. UID:", currentUserId);
    const user = auth.currentUser;
    const userDisplayNameElement = document.getElementById('user-display-name');
    if (userDisplayNameElement) {
        userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
    } else {
        console.error("loadAllUserData: Elemento 'user-display-name' no encontrado.");
    }
    window.showTempMessage(`Bienvenido, usuario ${user.displayName || user.email || user.uid.substring(0, 8)}...`, 'info');

    // --- Referencias a colecciones de Firestore específicas del usuario ---
    const journalCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/journalEntries`);
    const checklistCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/checklistItems`);
    const pomodoroSettingsDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/pomodoroSettings`, 'current');
    const trelloConfigDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/trelloConfig`, 'settings');
    const habitsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/habits`);
    const userSettingsRef = doc(db, `artifacts/${appId}/users/${currentUserId}/settings`, 'appSettings');


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
            try {
                const docSnap = await getDoc(userSettingsRef);
                console.log("Tour: Documento de configuración de usuario para el tour:", docSnap.exists() ? docSnap.data() : "No existe");
                if (docSnap.exists() && docSnap.data().tourCompleted) {
                    console.log("Tour: Ya completado para este usuario. No se mostrará.");
                    return;
                }
            } catch (error) {
                console.error("Tour: Error al verificar estado del tour en Firestore:", error);
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
            tourSkipBtn.style.display = currentTourStep === tourSteps.length - 1 ? 'none' : 'block';

            updateTourDots();
            console.log(`Tour: Renderizando paso ${currentTourStep + 1}/${tourSteps.length}: ${step.title}`);
        }

        function createTourDots() {
            tourDotsContainer.innerHTML = '';
            tourSteps.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.classList.add('tour-dot');
                dot.setAttribute('tabindex', '0');
                dot.setAttribute('role', 'button');
                dot.setAttribute('aria-label', `Paso ${index + 1} del tour`);

                if (index === currentTourStep) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    currentTourStep = index;
                    renderTourStep();
                });
                dot.addEventListener('keydown', (e) => {
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
            try {
                await setDoc(userSettingsRef, { tourCompleted: true }, { merge: true });
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
        tourSkipBtn.addEventListener('click', completeTour);

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
        onSnapshot(query(journalCollectionRef, orderBy('timestamp', 'desc')), (snapshot) => {
            console.log("Journal: Recibiendo snapshot de entradas.");
            journalEntriesList.innerHTML = '';
            if (snapshot.empty) {
                console.log("Journal: Colección vacía. Mostrando mensaje de vacío.");
                journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún. ¡Escribe tu primera entrada!</li>';
                return;
            }
            console.log(`Journal: ${snapshot.size} entradas encontradas. Renderizando...`);
            snapshot.forEach((docSnap) => {
                const entry = docSnap.data();
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
                    await addDoc(journalCollectionRef, {
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
    const pomodoroProgressCircle = document.querySelector('.pomodoro-progress-ring-progress');
    const pomodoroProgressRing = document.querySelector('.pomodoro-progress-ring');

    const radius = pomodoroProgressCircle ? parseFloat(pomodoroProgressCircle.getAttribute('r')) : 90;
    const circumference = radius * 2 * Math.PI;

    if (pomodoroProgressCircle) {
        pomodoroProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        pomodoroProgressCircle.style.strokeDashoffset = circumference;
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
        
        const progressPercent = timeLeft / totalTimeForPomodoro;
        setProgress(progressPercent);

        if (pomodoroProgressCircle) {
            if (isBreakTime) {
                pomodoroProgressCircle.style.stroke = 'var(--secondary-color)';
            } else {
                pomodoroProgressCircle.style.stroke = 'var(--primary-color)';
            }
        }
    }

    const startTimerBtn = document.getElementById('start-timer-btn');
    const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn');
    const resetTimerBtn = document.getElementById('reset-timer-btn');

    if (timerDisplay && startTimerBtn && pausePomodoroBtn && resetTimerBtn && pomodoroProgressCircle) {
        console.log("Pomodoro: Elementos HTML del Temporizador y SVG encontrados.");
        onSnapshot(pomodoroSettingsDocRef, (docSnap) => {
            console.log("Pomodoro: Recibiendo snapshot de settings.");
            if (docSnap.exists()) {
                const settings = docSnap.data();
                console.log("Pomodoro: Configuración de Pomodoro encontrada:", settings);
                timeLeft = settings.timeLeft;
                isRunning = settings.isRunning;
                isBreakTime = settings.isBreakTime || false;
                totalTimeForPomodoro = isBreakTime ? (5 * 60) : (1 * 60);
                updateTimerDisplay();
                if (isRunning && settings.lastUpdated) {
                    const elapsedSinceLastUpdate = (Date.now() - new Date(settings.lastUpdated).getTime()) / 1000;
                    timeLeft = Math.max(0, timeLeft - Math.floor(elapsedSinceLastUpdate));
                    if (timeLeft > 0 && !timer) {
                        startTimer();
                    } else if (timeLeft <= 0) {
                        clearInterval(timer);
                        isRunning = false;
                        setDoc(pomodoroSettingsDocRef, { timeLeft: 0, isRunning: false, isBreakTime: isBreakTime, lastUpdated: new Date().toISOString() });

                        console.log("Pomodoro (onSnapshot): Tiempo terminado. isBreakTime:", isBreakTime);

                        if (!isBreakTime) {
                            console.log("Pomodoro (onSnapshot): Tiempo de trabajo terminado. Activando confeti y sonido.");
                            window.triggerConfetti();
                            document.getElementById('sound-complete').play().catch(e => {
                                console.error("Error al reproducir sonido de completado (onSnapshot):", e);
                                window.showTempMessage('Error: No se pudo reproducir el sonido de finalización.', 'error', 5000);
                            });
                            if (notificationPermissionGranted) {
                                new Notification('¡Pomodoro Terminado!', {
                                    body: '¡Excelente trabajo! Es hora de un descanso.',
                                    icon: 'https://placehold.co/48x48/4F46E5/FFFFFF?text=P',
                                    tag: 'pomodoro-complete'
                                });
                            }

                            setTimeout(async () => {
                                console.log("Pomodoro (onSnapshot): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (onSnapshot): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60;
                                    totalTimeForPomodoro = 5 * 60;
                                    isBreakTime = true;
                                    updateTimerDisplay();
                                    setDoc(pomodoroSettingsDocRef, { timeLeft: timeLeft, isRunning: true, isBreakTime: isBreakTime, lastUpdated: new Date().toISOString() });
                                    document.getElementById('sound-break').play().catch(e => {
                                        console.error("Error al reproducir sonido de descanso (onSnapshot):", e);
                                        window.showTempMessage('Error: No se pudo reproducir el sonido de descanso.', 'error', 5000);
                                    });
                                    window.showTempMessage('¡Disfruta tu descanso!', 'info', 4000);
                                    startTimer();
                                } else {
                                    console.log("Pomodoro (onSnapshot): Usuario eligió NO iniciar descanso. Reiniciando temporizador.");
                                    resetTimer();
                                }
                            }, 1000);
                        } else {
                            console.log("Pomodoro (onSnapshot): Tiempo de descanso terminado. Reiniciando temporizador.");
                            window.showTempMessage('¡Descanso terminado! ¡Has recargado energías! Es hora de volver a concentrarte y darlo todo. ¡A por ello!', 'info', 7000);
                            if (notificationPermissionGranted) {
                                new Notification('¡Descanso Terminado!', {
                                    body: '¡Es hora de volver al trabajo!',
                                    icon: 'https://placehold.co/48x48/7C3AED/FFFFFF?text=D',
                                    tag: 'pomodoro-break'
                                });
                            }
                            resetTimer();
                        }
                    }
                }
            } else {
                console.log("Pomodoro: No hay settings, creando por defecto.");
                setDoc(pomodoroSettingsDocRef, { timeLeft: 1 * 60, isRunning: false, isBreakTime: false, lastUpdated: new Date().toISOString() });
            }
        }, (error) => {
            console.error("Pomodoro: Error al cargar settings:", error);
            window.showTempMessage(`Error al cargar Pomodoro: ${error.message}`, 'error');
        });

        async function savePomodoroState(newTimeLeft, newIsRunning, newIsBreakTime) {
            try {
                await setDoc(pomodoroSettingsDocRef, {
                    timeLeft: newTimeLeft,
                    isRunning: newIsRunning,
                    isBreakTime: newIsBreakTime,
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
                        savePomodoroState(0, false, isBreakTime);
                        
                        console.log("Pomodoro (startTimer): Tiempo terminado. isBreakTime:", isBreakTime);

                        if (!isBreakTime) {
                            console.log("Pomodoro (startTimer): Tiempo de trabajo terminado. Activando confeti y sonido.");
                            window.triggerConfetti();
                            document.getElementById('sound-complete').play().catch(e => {
                                console.error("Error al reproducir sonido de completado (startTimer):", e);
                                window.showTempMessage('Error: No se pudo reproducir el sonido de finalización.', 'error', 5000);
                            });
                            if (notificationPermissionGranted) {
                                new Notification('¡Pomodoro Terminado!', {
                                    body: '¡Excelente trabajo! Es hora de un descanso.',
                                    icon: 'https://placehold.co/48x48/4F46E5/FFFFFF?text=P',
                                    tag: 'pomodoro-complete'
                                });
                            }

                            setTimeout(async () => {
                                console.log("Pomodoro (startTimer): Preguntando por descanso...");
                                const startBreak = await window.showCustomConfirm('¡Excelente trabajo! ¿Quieres comenzar tu descanso de 5 minutos?');
                                if (startBreak) {
                                    console.log("Pomodoro (startTimer): Usuario eligió iniciar descanso.");
                                    timeLeft = 5 * 60;
                                    totalTimeForPomodoro = 5 * 60;
                                    isBreakTime = true;
                                    updateTimerDisplay();
                                    savePomodoroState(timeLeft, true, isBreakTime);
                                    document.getElementById('sound-break').play().catch(e => {
                                        console.error("Error al reproducir sonido de descanso (startTimer):", e);
                                        window.showTempMessage('Error: No se pudo reproducir el sonido de descanso.', 'error', 5000);
                                    });
                                    window.showTempMessage('¡Disfruta tu descanso!', 'info', 4000);
                                    startTimer();
                                } else {
                                    console.log("Pomodoro (startTimer): Usuario eligió NO iniciar descanso. Reiniciando temporizador.");
                                    resetTimer();
                                }
                            }, 1000);
                        } else {
                            console.log("Pomodoro (startTimer): Tiempo de descanso terminado. Reiniciando temporizador.");
                            window.showTempMessage('¡Descanso terminado! ¡Has recargado energías! Es hora de volver a concentrarte y darlo todo. ¡A por ello!', 'info', 7000);
                            if (notificationPermissionGranted) {
                                new Notification('¡Descanso Terminado!', {
                                    body: '¡Es hora de volver al trabajo!',
                                    icon: 'https://placehold.co/48x48/7C3AED/FFFFFF?text=D',
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
            timeLeft = 1 * 60;
            totalTimeForPomodoro = 1 * 60;
            isBreakTime = false;
            updateTimerDisplay();
            savePomodoroState(timeLeft, false, isBreakTime);
            resetTimerBtn.classList.add('button-clicked');
            setTimeout(() => {
                resetTimerBtn.classList.remove('button-clicked');
            }, 300);
            window.showTempMessage('Temporizador reiniciado.', 'info');
            console.log("Pomodoro: Temporizador reiniciado.");
        }

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

    let draggedItem = null;
    let originalText = '';

    if (checkItemInput && addCheckItemBtn && checkListUl) {
        console.log("Checklist: Elementos HTML del Checklist encontrados.");

        checkListUl.addEventListener('change', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;

            const itemId = listItem.dataset.id;

            if (target.classList.contains('completion-checkbox')) {
                try {
                    await updateDoc(doc(checklistCollectionRef, itemId), {
                        completed: target.checked
                    });
                    if (target.checked) {
                        listItem.querySelector('.item-text').classList.add('task-completed');
                        document.getElementById('sound-task-done').play().catch(e => console.error("Error playing task done sound:", e));
                        window.showTempMessage('¡Tarea completada!', 'success');
                    } else {
                        listItem.querySelector('.item-text').classList.remove('task-completed');
                    }
                    console.log(`Checklist: Ítem ${itemId} actualizado.`);
                } catch (error) {
                    console.error("Checklist: Error updating item:", error);
                    window.showTempMessage(`Error al actualizar tarea: ${error.message}`, 'error');
                }
            } else if (target.classList.contains('mit-checkbox')) {
                const newIsMIT = target.checked;
                console.log(`MIT checkbox clicked for item ${itemId}. Intended state: ${newIsMIT}`);

                if (newIsMIT) {
                    try {
                        const q = query(checklistCollectionRef, where('isMIT', '==', true));
                        const mitSnapshot = await getDocs(q);
                        const currentMitCount = mitSnapshot.size;
                        console.log(`Current MIT count from Firestore: ${currentMitCount}`);

                        if (currentMitCount >= 3) {
                            target.checked = false;
                            window.showTempMessage('Solo puedes seleccionar hasta 3 MITs a la vez.', 'warning');
                            console.log(`MIT limit exceeded. Reverting checkbox for ${itemId}. Current Firestore MITs: ${currentMitCount}`);
                            return;
                        }
                    } catch (error) {
                        console.error("Checklist: Error counting MITs from Firestore:", error);
                        window.showTempMessage(`Error al verificar MITs: ${error.message}`, 'error');
                        target.checked = false;
                        return;
                    }
                }

                try {
                    await updateDoc(doc(checklistCollectionRef, itemId), {
                        isMIT: newIsMIT
                    });
                    console.log(`Checklist: Ítem ${itemId} MIT updated to ${newIsMIT} in Firestore.`);
                } catch (error) {
                    console.error("Checklist: Error updating MIT:", error);
                    window.showTempMessage(`Error al actualizar MIT: ${error.message}`, 'error');
                    target.checked = !newIsMIT;
                }
            }
        });

        checkListUl.addEventListener('click', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;

            if (target.classList.contains('button-danger')) {
                const itemToDeleteId = listItem.dataset.id;
                if (await window.showCustomConfirm('¿Estás seguro de que quieres eliminar este ítem del checklist?')) {
                    try {
                        await deleteDoc(doc(checklistCollectionRef, itemToDeleteId));
                        window.showTempMessage('Elemento eliminado del checklist.', 'info');
                        console.log(`Checklist: Ítem ${itemToDeleteId} eliminado.`);
                    } catch (error) {
                        console.error("Checklist: Error deleting item:", error);
                        window.showTempMessage(`Error al eliminar: ${error.message}`, 'error');
                    }
                }
            }
        });

        checkListUl.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            if (draggedItem.tagName !== 'LI') {
                draggedItem = null;
                return;
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', draggedItem.innerHTML);
            draggedItem.classList.add('dragging');
            console.log("Drag & Drop: Drag start for item:", draggedItem.dataset.id);
        });

        checkListUl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('li');
            if (target && target !== draggedItem) {
                target.classList.add('drag-over');
            }
        });

        checkListUl.addEventListener('dragleave', (e) => {
            const target = e.target.closest('li');
            if (target) {
                target.classList.remove('drag-over');
            }
        });

        checkListUl.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('li');

            if (dropTarget && draggedItem && dropTarget !== draggedItem) {
                dropTarget.classList.remove('drag-over');

                const bounding = dropTarget.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                
                if (offset > bounding.height / 2) {
                    checkListUl.insertBefore(draggedItem, dropTarget.nextSibling);
                } else {
                    checkListUl.insertBefore(draggedItem, dropTarget);
                }
                
                console.log("Drag & Drop: Item dropped. Updating positions...");
                await updateItemPositionsInFirestore();
                window.showTempMessage('Orden de tareas actualizado.', 'info');
            } else if (dropTarget) {
                dropTarget.classList.remove('drag-over');
            }
        });

        checkListUl.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
            }
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedItem = null;
            console.log("Drag & Drop: Drag end.");
        });

        async function updateItemPositionsInFirestore() {
            const listItems = Array.from(checkListUl.children);
            const batch = writeBatch(db);

            listItems.forEach((item, index) => {
                const itemId = item.dataset.id;
                const itemRef = doc(checklistCollectionRef, itemId);
                batch.update(itemRef, { position: index });
            });

            try {
                await batch.commit();
                console.log("Drag & Drop: Posiciones de ítems actualizadas en Firestore.");
            } catch (error) {
                console.error("Drag & Drop: Error al actualizar posiciones en Firestore:", error);
                window.showTempMessage(`Error al guardar orden: ${error.message}`, 'error');
            }
        }

        onSnapshot(query(checklistCollectionRef, orderBy('position', 'asc'), orderBy('timestamp', 'asc')), (snapshot) => {
            console.log("Checklist (onSnapshot): Recibiendo snapshot de ítems. Tamaño del snapshot:", snapshot.size);
            checkListUl.innerHTML = '';
            if (snapshot.empty) {
                console.log("Checklist (onSnapshot): Colección vacía. Mostrando mensaje de vacío.");
                checkListUl.innerHTML = '<li>No hay ítems en el checklist aún. ¡Añade tu primera tarea!</li>';
                return;
            }
            console.log(`Checklist (onSnapshot): ${snapshot.size} ítems encontrados. Renderizando...`);
            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const itemId = docSnap.id;
                console.log("Checklist (onSnapshot): Procesando ítem:", item.text, "ID:", itemId, "Completed:", item.completed, "MIT:", item.isMIT, "Position:", item.position);
                const listItem = document.createElement('li');
                listItem.setAttribute('draggable', 'true');
                listItem.dataset.id = itemId;

                const completionCheckbox = document.createElement('input');
                completionCheckbox.type = 'checkbox';
                completionCheckbox.className = 'completion-checkbox';
                completionCheckbox.id = `check-${itemId}`;
                completionCheckbox.dataset.itemId = itemId;
                if (item.completed) {
                    completionCheckbox.checked = true;
                }

                const label = document.createElement('label');
                label.htmlFor = `check-${itemId}`;

                const itemTextSpan = document.createElement('span');
                itemTextSpan.className = 'item-text';
                itemTextSpan.dataset.itemId = itemId;
                itemTextSpan.contentEditable = 'false';
                itemTextSpan.textContent = item.text;

                const mitControlsDiv = document.createElement('div');
                mitControlsDiv.className = 'mit-controls';
                const mitCheckbox = document.createElement('input');
                mitCheckbox.type = 'checkbox';
                mitCheckbox.className = 'mit-checkbox';
                mitCheckbox.id = `mit-${itemId}`;
                mitCheckbox.dataset.itemId = itemId;
                if (item.isMIT) {
                    mitCheckbox.checked = true;
                }
                const mitText = document.createTextNode('MIT');
                mitControlsDiv.appendChild(mitCheckbox);
                mitControlsDiv.appendChild(mitText);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'button-danger';
                deleteButton.dataset.id = itemId;
                deleteButton.textContent = '❌';

                label.appendChild(itemTextSpan);
                listItem.appendChild(completionCheckbox);
                listItem.appendChild(label);
                listItem.appendChild(mitControlsDiv);
                listItem.appendChild(deleteButton);

                checkListUl.appendChild(listItem);
                console.log("Checklist (onSnapshot): Ítem añadido al DOM. HTML del nuevo listItem:", listItem.outerHTML);

                itemTextSpan.addEventListener('dblclick', () => {
                    originalText = itemTextSpan.textContent;
                    itemTextSpan.contentEditable = 'true';
                    itemTextSpan.focus();
                    itemTextSpan.classList.add('editing');
                    console.log(`Checklist: Editing item ${itemId}.`);
                });

                itemTextSpan.addEventListener('blur', async () => {
                    itemTextSpan.contentEditable = 'false';
                    itemTextSpan.classList.remove('editing');
                    const newText = itemTextSpan.textContent.trim();
                    if (newText !== originalText) {
                        try {
                            await updateDoc(doc(checklistCollectionRef, itemId), { text: newText });
                            window.showTempMessage('Tarea actualizada con éxito.', 'success');
                            console.log(`Checklist: Item ${itemId} text updated to "${newText}".`);
                        } catch (error) {
                            console.error("Checklist: Error updating item text:", error);
                            window.showTempMessage(`Error al actualizar tarea: ${error.message}`, 'error');
                            itemTextSpan.textContent = originalText;
                        }
                    } else {
                        console.log(`Checklist: No changes made to item ${itemId}.`);
                    }
                });

                itemTextSpan.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        itemTextSpan.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        itemTextSpan.textContent = originalText;
                        itemTextSpan.blur();
                    }
                });

                if (item.isMIT) {
                    listItem.classList.add('mit-task');
                }
                if (item.completed) {
                    itemTextSpan.classList.add('task-completed');
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
                    const lastItemSnapshot = await getDocs(query(checklistCollectionRef, orderBy('position', 'desc'), limit(1)));
                    const newPosition = lastItemSnapshot.empty ? 0 : lastItemSnapshot.docs[0].data().position + 1;

                    await addDoc(checklistCollectionRef, {
                        text: itemText,
                        completed: false,
                        isMIT: false,
                        timestamp: new Date().toISOString(),
                        position: newPosition
                    });
                    checkItemInput.value = '';
                    window.showTempMessage('Elemento añadido al checklist.', 'success');
                    console.log("Checklist: Nuevo ítem añadido con posición:", newPosition);
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

    const configTrelloBtn = document.getElementById('config-trello-btn');
    const testTrelloBtn = document.getElementById('test-trello-btn');
    const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn');

    if (trelloApiKeyInput && trelloTokenInput && trelloBoardIdInput && trelloStatusDiv && trelloSuccessMessage && configTrelloBtn && testTrelloBtn && saveTrelloConfigBtn) {
        console.log("Trello: Elementos HTML de Trello encontrados.");
        onSnapshot(trelloConfigDocRef, (docSnap) => {
            console.log("Trello: Recibiendo snapshot de configuración.");
            if (docSnap.exists()) {
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
                    await setDoc(trelloConfigDocRef, { apiKey, token, boardId });
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
            const configSnap = await getDoc(trelloConfigDocRef);
            if (!configSnap.exists()) {
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
            const configSnap = await getDoc(trelloConfigDocRef);
            if (!configSnap.exists()) {
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

                const today = new Date();
                const dayOfWeek = today.getDay();

                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                monday.setHours(0, 0, 0, 0);

                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4);
                friday.setHours(23, 59, 59, 999);

                console.log(`Trello: Filtrando tareas entre ${monday.toISOString()} y ${friday.toISOString()}`);

                const filteredCards = allCards.filter(card => {
                    if (!card.due || card.dueComplete) {
                        return false;
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
                    
                    const batch = writeBatch(db); // Usar un batch para eliminaciones

                    // Eliminar documentos de Journal
                    const journalDocs = await getDocs(journalCollectionRef);
                    journalDocs.forEach((d) => batch.delete(d.ref));
                    console.log("Limpiar Datos: Entradas de Journal marcadas para eliminación.");

                    // Eliminar documentos de Checklist
                    const checklistDocs = await getDocs(checklistCollectionRef);
                    checklistDocs.forEach((d) => batch.delete(d.ref));
                    console.log("Limpiar Datos: Ítems de Checklist marcados para eliminación.");

                    // Eliminar documentos de Hábitos
                    const habitsDocs = await getDocs(habitsCollectionRef);
                    habitsDocs.forEach((d) => batch.delete(d.ref));
                    console.log("Limpiar Datos: Hábitos marcados para eliminación.");

                    // Eliminar documento de configuración de Pomodoro
                    const pomodoroDocSnap = await getDoc(pomodoroSettingsDocRef);
                    if (pomodoroDocSnap.exists()) {
                        batch.delete(pomodoroSettingsDocRef);
                        console.log("Limpiar Datos: Configuración de Pomodoro marcada para eliminación.");
                    }

                    // Eliminar documento de configuración de Trello
                    const trelloDocSnap = await getDoc(trelloConfigDocRef);
                    if (trelloDocSnap.exists()) {
                        batch.delete(trelloConfigDocRef);
                        console.log("Limpiar Datos: Configuración de Trello marcada para eliminación.");
                    }
                    
                    // Eliminar documento de user settings (tourCompleted)
                    const userSettingsDocSnap = await getDoc(userSettingsRef);
                    if (userSettingsDocSnap.exists()) {
                        batch.delete(userSettingsRef);
                        console.log("Limpiar Datos: Configuración de usuario (tourCompleted) marcada para eliminación.");
                    }

                    await batch.commit(); // Ejecutar todas las eliminaciones en un solo batch
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
    const blogArticlesCollectionRef = collection(db, `artifacts/${appId}/blogArticles`); 

    if (blogContentDiv && refreshBlogBtn) {
        console.log("Blog: Elementos HTML del Blog encontrados.");
        async function cargarNotasBlog() {
            blogContentDiv.innerHTML = '<p>Cargando artículos...</p>';
            try {
                const snapshot = await getDocs(query(blogArticlesCollectionRef, orderBy('timestamp', 'desc')));
                blogContentDiv.innerHTML = '';

                if (snapshot.empty) {
                    blogContentDiv.innerHTML = '<p>No hay artículos de blog disponibles aún.</p>';
                    console.log("Blog: No hay artículos en Firestore.");
                    window.showTempMessage('No hay artículos de blog disponibles.', 'info');
                    return;
                }

                snapshot.forEach(docSnap => {
                    const article = docSnap.data();
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
        cargarNotasBlog();
    } else {
        console.warn("Blog: Elementos HTML del Blog no encontrados.");
    }


    const nutricionContentDiv = document.getElementById('nutricion-content');
    const refreshNutricionBtn = document.getElementById('refresh-nutricion-btn');
    const nutricionCollectionRef = collection(db, `artifacts/${appId}/public/data/nutritionContent`);

    if (nutricionContentDiv && refreshNutricionBtn) {
        console.log("Nutrición: Elementos HTML de Nutrición encontrados.");
        async function cargarNutricion() {
            nutricionContentDiv.innerHTML = '<p>Cargando recomendaciones...</p>';
            try {
                const snapshot = await getDocs(query(nutricionCollectionRef, orderBy('timestamp', 'desc')));
                nutricionContentDiv.innerHTML = '';

                if (snapshot.empty) {
                    nutricionContentDiv.innerHTML = '<p>No hay contenido de nutrición disponible aún.</p>';
                    console.log("Nutrición: No hay contenido en Firestore.");
                    window.showTempMessage('No hay contenido de nutrición disponible.', 'info');
                    return;
                }

                snapshot.forEach(docSnap => {
                    const item = docSnap.data();
                    const card = document.createElement('div');
                    card.className = 'nutricion-card';
                    card.innerHTML = `
                        <h4>${item.title}</h4>
                        <p>${item.content}</p>
                        <small>Fuente: ${item.source}</small>
                        ${item.url ? `<a href="${item.url}" target="_blank" class="article-link">Leer Más ↗</a>` : ''}
                    `;
                    nutricionContentDiv.appendChild(card);
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
        cargarNutricion();
    } else {
        console.warn("Nutrición: Elementos HTML de Nutrición no encontrados.");
    }

    // --- Lógica de Hábitos ---
    const newHabitInput = document.getElementById('newHabitInput');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const habitsList = document.getElementById('habitsList');

    if (newHabitInput && addHabitBtn && habitsList) {
        console.log("Hábitos: Elementos HTML de Hábitos encontrados.");
        onSnapshot(query(habitsCollectionRef, orderBy('timestamp', 'asc')), (snapshot) => {
            console.log("Hábitos: Recibiendo snapshot de hábitos.");
            habitsList.innerHTML = '';
            if (snapshot.empty) {
                console.log("Hábitos: Colección vacía. Mostrando mensaje de vacío.");
                habitsList.innerHTML = '<li>No hay hábitos registrados aún. ¡Añade tu primer hábito!</li>';
                return;
            }
            console.log(`Hábitos: ${snapshot.size} hábitos encontrados. Renderizando...`);
            snapshot.forEach(docSnap => {
                const habit = docSnap.data();
                const habitId = docSnap.id;
                const listItem = document.createElement('li');
                const today = new Date();
                const dailyTrackingHtml = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (6 - i));
                    const dateString = date.toISOString().split('T')[0];
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

        addHabitBtn.addEventListener('click', async () => {
            const habitName = newHabitInput.value.trim();
            if (habitName) {
                addHabitBtn.classList.add('button-clicked');
                setTimeout(() => {
                    addHabitBtn.classList.remove('button-clicked');
                }, 300);
                try {
                    await addDoc(habitsCollectionRef, {
                        name: habitName,
                        timestamp: new Date().toISOString(),
                        dailyCompletions: {}
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

        habitsList.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('habit-day-dot')) {
                const habitId = target.dataset.habitId;
                const dateString = target.dataset.date;
                
                try {
                    const habitDocRef = doc(habitsCollectionRef, habitId);
                    const docSnap = await getDoc(habitDocRef);
                    if (docSnap.exists()) {
                        const habitData = docSnap.data();
                        const currentCompletions = habitData.dailyCompletions || {};
                        const isCurrentlyCompleted = currentCompletions[dateString];

                        currentCompletions[dateString] = !isCurrentlyCompleted;

                        await updateDoc(habitDocRef, {
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
                const habitIdToDelete = target.dataset.id;
                if (await window.showCustomConfirm('¿Estás seguro de que quieres eliminar este hábito?')) {
                    try {
                        await deleteDoc(doc(habitsCollectionRef, habitIdToDelete));
                        window.showTempMessage('Hábito eliminado.', 'info');
                        console.log(`Hábito: ${habitIdToDelete} eliminado.`);
                    } catch (error) {
                        console.error("Hábitos: Error al eliminar hábito:", error);
                        window.showTempMessage(`Error al eliminar hábito: ${error.message}`, 'error');
                    }
                }
            }
        });

        habitsList.addEventListener('keydown', async (e) => {
            const target = e.target;
            if (target.classList.contains('habit-day-dot') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const habitId = target.dataset.habitId;
                const dateString = target.dataset.date;
                
                try {
                    const habitDocRef = doc(habitsCollectionRef, habitId);
                    const docSnap = await getDoc(habitDocRef);
                    if (docSnap.exists()) {
                        const habitData = docSnap.data();
                        const currentCompletions = habitData.dailyCompletions || {};
                        const isCurrentlyCompleted = currentCompletions[dateString];

                        currentCompletions[dateString] = !isCurrentlyCompleted;

                        await updateDoc(habitDocRef, {
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
        if (currentUserId && db) {
            getDocs(checklistCollectionRef).then(snapshot => {
                const checklistItemsCount = snapshot.size;
                const checklistCountElement = document.getElementById('checklist-count');
                if (checklistCountElement) checklistCountElement.textContent = checklistItemsCount;
            }).catch(error => {
                console.error("Error getting checklist count:", error);
            });

            getDocs(habitsCollectionRef).then(snapshot => {
                const habitsCount = snapshot.size;
                const tasksCountElement = document.getElementById('tasks-count');
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
    // Inicializar Firebase y la autenticación primero
    await initializeFirebaseAndAuth();

    // Solicitar permiso de notificación al cargar la aplicación
    await requestNotificationPermission();

    // Inicializar la sección Pomodoro al cargar la página
    console.log("DOMContentLoaded: Llamando a mostrarSeccion('pomodoro').");
    window.mostrarSeccion('pomodoro');

    // Añadir listeners a los botones de navegación para mostrar/ocultar secciones
    document.getElementById('btn-pomodoro').addEventListener('click', () => {
        window.mostrarSeccion('pomodoro');
        console.log("Sección Pomodoro activa. ClassList:", document.getElementById('pomodoro').classList.value);
    });
    document.getElementById('btn-checklist').addEventListener('click', () => {
        window.mostrarSeccion('checklist');
        console.log("Sección Checklist activa. ClassList:", document.getElementById('checklist').classList.value);
    });
    document.getElementById('btn-journal').addEventListener('click', () => {
        window.mostrarSeccion('journal');
        console.log("Sección Journal activa. ClassList:", document.getElementById('journal').classList.value);
    });
    document.getElementById('btn-habitos').addEventListener('click', () => {
        window.mostrarSeccion('habitos');
        console.log("Sección Hábitos activa. ClassList:", document.getElementById('habitos').classList.value);
    });
    document.getElementById('btn-tareas').addEventListener('click', () => {
        window.mostrarSeccion('tareas');
        console.log("Sección Tareas activa. ClassList:", document.getElementById('tareas').classList.value);
    });
    document.getElementById('btn-notas').addEventListener('click', () => {
        window.mostrarSeccion('notas');
        console.log("Sección Notas activa. ClassList:", document.getElementById('notas').classList.value);
    });
    document.getElementById('btn-nutricion').addEventListener('click', () => {
        window.mostrarSeccion('nutricion');
        console.log("Sección Nutrición activa. ClassList:", document.getElementById('nutricion').classList.value);
    });
    document.getElementById('btn-config').addEventListener('click', () => {
        window.mostrarSeccion('config');
        console.log("Sección Configuración activa. ClassList:", document.getElementById('config').classList.value);
    });

}); // End of DOMContentLoaded