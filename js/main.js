// =================================================================================
// FIREBASE V11 MODULAR IMPORTS
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut, 
    signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    limit, 
    getDocs, 
    writeBatch, 
    getDoc, 
    setDoc, 
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================================
// CONFIGURATION & INITIALIZATION
// =================================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDbIABcg4AqeqiUzYhTahgjc2oziM5NLjI",
  authDomain: "tdah-app-efca9.firebaseapp.com",
  projectId: "tdah-app-efca9",
  storageBucket: "tdah-app-efca9.appspot.com",
  messagingSenderId: "765424831369",
  appId: "1:7654248-web:838eca86f68f21daa5858",
  measurementId: "G-QY7X98XZZY"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let notificationPermissionGranted = false;
let isLoggingOut = false;
let unsubscribeListeners = [];

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase inicializado exitosamente.");
} catch (error) {
    console.error("ERROR CRÍTICO DE INICIALIZACIÓN DE FIREBASE:", error);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #d8000c;">
            <h1>Error Crítico</h1><p>No se pudo conectar con la base de datos.</p>
            <p><strong>Detalle del error:</strong> ${error.message}</p></div>`;
    });
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

window.showTempMessage = (message, type = 'info', duration = 3000) => {
    const container = document.getElementById('temp-message-container');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `temp-message ${type}`;
    msgDiv.textContent = message;
    container.appendChild(msgDiv);
    setTimeout(() => msgDiv.classList.add('show'), 10);
    setTimeout(() => {
        msgDiv.classList.remove('show');
        msgDiv.addEventListener('transitionend', () => msgDiv.remove());
    }, duration);
};

window.showCustomConfirm = (message) => {
    const modal = document.getElementById('custom-modal-overlay');
    const msgElement = document.getElementById('custom-modal-message');
    const yesBtn = document.getElementById('custom-modal-yes-btn');
    const noBtn = document.getElementById('custom-modal-no-btn');
    if (!modal || !msgElement || !yesBtn || !noBtn) return Promise.resolve(confirm(message));
    msgElement.textContent = message;
    modal.classList.add('show');
    return new Promise(resolve => {
        const resolveAndClose = (value) => {
            modal.classList.remove('show');
            yesBtn.onclick = null;
            noBtn.onclick = null;
            resolve(value);
        };
        yesBtn.onclick = () => resolveAndClose(true);
        noBtn.onclick = () => resolveAndClose(false);
    });
};

window.triggerConfetti = () => {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(confetti);
        confetti.addEventListener('animationend', () => confetti.remove());
    }
};

window.mostrarSeccion = (seccionId) => {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    const seccionActiva = document.getElementById(seccionId);
    const botonActivo = document.getElementById(`btn-${seccionId}`);
    if (seccionActiva) seccionActiva.classList.add('active');
    if (botonActivo) botonActivo.classList.add('active');
};

// =================================================================================
// MAIN APPLICATION LOGIC
// =================================================================================
function cleanupFirestoreListeners() {
    console.log(`Limpiando ${unsubscribeListeners.length} listeners de Firestore...`);
    unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners = [];
}

async function loadAllUserData(currentUserId) {
    console.log("loadAllUserData: Cargando datos para el usuario:", currentUserId);
    if (!db || !auth || !currentUserId) {
        return;
    }

    cleanupFirestoreListeners();

    const user = auth.currentUser;
    const userDisplayNameElement = document.getElementById('user-display-name');
    if (userDisplayNameElement) {
        userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
    }
    window.showTempMessage(`Sesión iniciada.`, 'info');

    // CORRECCIÓN: Se usan path segments en lugar de strings con '/'
    const journalCollectionRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'journalEntries');
    const checklistCollectionRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'checklistItems');
    const pomodoroSettingsDocRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'pomodoroSettings', 'current');
    const trelloConfigDocRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'trelloConfig', 'settings');
    const habitsCollectionRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'habits');
    const userSettingsRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'settings', 'appSettings');
    const blogArticlesCollectionRef = collection(db, 'artifacts', appId, 'blogArticles');
    const nutricionCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'nutritionContent');

    // --- Welcome Tour Logic ---
    (async () => {
        const tourOverlay = document.getElementById('welcome-tour-overlay');
        const tourTitle = document.getElementById('tour-title');
        const tourDescription = document.getElementById('tour-description');
        const tourHighlightImage = document.getElementById('tour-highlight-image');
        const tourBackBtn = document.getElementById('tour-back-btn');
        const tourNextBtn = document.getElementById('tour-next-btn');
        const tourSkipBtn = document.getElementById('tour-skip-btn');
        const tourDotsContainer = document.getElementById('tour-dots');

        if (!tourOverlay || !tourTitle || !tourDescription || !tourHighlightImage || !tourBackBtn || !tourNextBtn || !tourSkipBtn || !tourDotsContainer) {
            return;
        }

        let currentTourStep = 0;
        const tourSteps = [
            { title: "¡Bienvenido a TDAH Helper App!", description: "Esta aplicación está diseñada para ayudarte a gestionar tu día a día, mejorar tu concentración y organizar tus tareas de forma efectiva. ¡Vamos a explorar sus funciones principales!", image: "" },
            { title: "⏱️ Temporizador Pomodoro", description: "Usa el temporizador Pomodoro para trabajar en bloques de tiempo concentrado (25 min) seguidos de descansos cortos (5 min). ¡Ideal para mantener el foco y evitar el agotamiento!", image: "https://placehold.co/400x200/4F46E5/FFFFFF?text=Pomodoro+Timer" },
            { title: "✅ Checklist Rápido", description: "Añade y gestiona tus tareas diarias de forma sencilla. Marca las completadas y prioriza tus 'Tareas Más Importantes' (MITs) para un día productivo.", image: "https://placehold.co/400x200/7C3AED/FFFFFF?text=Checklist" },
            { title: "📝 Journal Personal", description: "Un espacio seguro para escribir tus pensamientos, emociones, logros y desafíos. Reflexionar te ayudará a entenderte mejor y a gestionar tu bienestar.", image: "https://placehold.co/400x200/667eea/FFFFFF?text=Journal" },
            { title: "🌱 Hábitos Diarios", description: "Establece y sigue tus hábitos diarios, como beber agua o meditar. ¡Construye rutinas saludables y visualiza tu progreso día a día!", image: "https://placehold.co/400x200/764ba2/FFFFFF?text=Habits" },
            { title: "¡Listo para Empezar!", description: "Explora las secciones, personaliza tu experiencia y descubre cómo TDAH Helper App puede transformar tu productividad y bienestar. ¡Estamos aquí para apoyarte!", image: "" }
        ];

        const renderTourStep = () => {
            const step = tourSteps[currentTourStep];
            tourTitle.textContent = step.title;
            tourDescription.textContent = step.description;
            tourHighlightImage.src = step.image || '';
            tourHighlightImage.style.display = step.image ? 'block' : 'none';
            tourBackBtn.style.display = currentTourStep === 0 ? 'none' : 'block';
            tourNextBtn.textContent = currentTourStep === tourSteps.length - 1 ? 'Finalizar' : 'Siguiente ➡️';
            tourSkipBtn.style.display = currentTourStep === tourSteps.length - 1 ? 'none' : 'block';
            updateTourDots();
        };

        const createTourDots = () => {
            tourDotsContainer.innerHTML = '';
            tourSteps.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = 'tour-dot';
                dot.setAttribute('tabindex', '0');
                dot.setAttribute('role', 'button');
                dot.onclick = () => { currentTourStep = index; renderTourStep(); };
                dot.onkeydown = (e) => { if(e.key === 'Enter') { currentTourStep = index; renderTourStep(); }};
                tourDotsContainer.appendChild(dot);
            });
        };

        const updateTourDots = () => {
            document.querySelectorAll('.tour-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentTourStep);
            });
        };
        
        const completeTour = async () => {
            try {
                await setDoc(userSettingsRef, { tourCompleted: true }, { merge: true });
            } catch (error) { console.error("Tour: Error al guardar estado:", error); }
            tourOverlay.classList.remove('active');
            window.showTempMessage("¡Tour de bienvenida completado!", 'info');
        };

        try {
            const docSnap = await getDoc(userSettingsRef);
            if (!docSnap.exists() || !docSnap.data().tourCompleted) {
                tourOverlay.classList.add('active');
                createTourDots();
                renderTourStep();
            }
        } catch (error) { console.error("Tour: Error al verificar estado:", error); }

        tourNextBtn.onclick = () => (currentTourStep < tourSteps.length - 1) ? (currentTourStep++, renderTourStep()) : completeTour();
        tourBackBtn.onclick = () => (currentTourStep > 0) ? (currentTourStep--, renderTourStep()) : null;
        tourSkipBtn.onclick = completeTour;
    })();

    // --- Journal Logic ---
    (() => {
        const journalEntryTextarea = document.getElementById('journalEntry');
        const saveJournalEntryButton = document.getElementById('save-journal-entry-btn');
        const journalEntriesList = document.getElementById('journalEntriesList');
        if (!journalEntryTextarea || !saveJournalEntryButton || !journalEntriesList) return;

        const q = query(journalCollectionRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            journalEntriesList.innerHTML = '';
            if (snapshot.empty) {
                journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún.</li>';
                return;
            }
            snapshot.forEach((docSnap) => {
                const entry = docSnap.data();
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span class="journal-date">${new Date(entry.timestamp).toLocaleString('es-ES')}</span><div>${entry.text.replace(/\n/g, '<br>')}</div>`;
                journalEntriesList.appendChild(listItem);
            });
        }, (error) => console.error("Journal: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        saveJournalEntryButton.onclick = async () => {
            const entryText = journalEntryTextarea.value.trim();
            if (entryText) {
                try {
                    await addDoc(journalCollectionRef, { text: entryText, timestamp: new Date().toISOString() });
                    journalEntryTextarea.value = '';
                    window.showTempMessage('Entrada guardada.', 'success');
                } catch (error) { window.showTempMessage(`Error al guardar: ${error.message}`, 'error'); }
            }
        };
    })();

    // --- Pomodoro Timer Logic ---
    (() => {
        let timer;
        let isRunning = false;
        let timeLeft = 25 * 60;
        let totalTimeForPomodoro = 25 * 60;
        let isBreakTime = false;
        const timerDisplay = document.getElementById('timer');
        const startTimerBtn = document.getElementById('start-timer-btn');
        const pausePomodoroBtn = document.getElementById('pause-pomodoro-btn');
        const resetTimerBtn = document.getElementById('reset-timer-btn');
        const progressCircle = document.querySelector('.pomodoro-progress-ring-progress');
        if (!timerDisplay || !progressCircle || !startTimerBtn || !pausePomodoroBtn || !resetTimerBtn) return;

        const radius = progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        const setProgress = (percent) => {
            const offset = circumference - (percent / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
        };

        const updateTimerDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = Math.floor(timeLeft % 60);
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setProgress((timeLeft / totalTimeForPomodoro) * 100);
            progressCircle.style.stroke = isBreakTime ? 'var(--secondary-color)' : 'var(--primary-color)';
        };
        
        const savePomodoroState = async (newTime, newRunning, newBreak) => {
            try {
                await setDoc(pomodoroSettingsDocRef, {
                    timeLeft: newTime,
                    isRunning: newRunning,
                    isBreakTime: newBreak,
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) { console.error("Pomodoro: Error al guardar estado:", error); }
        };
        
        const handleTimerEnd = async () => {
            clearInterval(timer);
            isRunning = false;
            await savePomodoroState(0, false, isBreakTime);
            
            if (!isBreakTime) {
                window.triggerConfetti();
                document.getElementById('sound-complete').play().catch(e => console.error(e));
                if (notificationPermissionGranted) new Notification('¡Pomodoro Terminado!', { body: '¡Excelente trabajo! Es hora de un descanso.' });
                
                setTimeout(async () => {
                    if (await window.showCustomConfirm('¡Excelente trabajo! ¿Comenzar descanso de 5 minutos?')) {
                        isBreakTime = true;
                        timeLeft = 5 * 60;
                        totalTimeForPomodoro = 5 * 60;
                        document.getElementById('sound-break').play().catch(e => console.error(e));
                        startTimer();
                    } else {
                        resetTimer();
                    }
                }, 1000);
            } else {
                window.showTempMessage('¡Descanso terminado! Es hora de volver a concentrarse.', 'info');
                if (notificationPermissionGranted) new Notification('¡Descanso Terminado!', { body: '¡Es hora de volver al trabajo!' });
                resetTimer();
            }
        };

        const startTimer = () => {
            if (isRunning) return;
            isRunning = true;
            savePomodoroState(timeLeft, true, isBreakTime);
            timer = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    handleTimerEnd();
                }
            }, 1000);
        };

        const pauseTimer = () => {
            clearInterval(timer);
            isRunning = false;
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador pausado.', 'info');
        };

        const resetTimer = () => {
            clearInterval(timer);
            isRunning = false;
            isBreakTime = false;
            timeLeft = 25 * 60;
            totalTimeForPomodoro = 25 * 60;
            updateTimerDisplay();
            savePomodoroState(timeLeft, false, isBreakTime);
            window.showTempMessage('Temporizador reiniciado.', 'info');
        };

        const unsubscribe = onSnapshot(pomodoroSettingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                isBreakTime = settings.isBreakTime || false;
                totalTimeForPomodoro = isBreakTime ? (5 * 60) : (25 * 60);

                if (settings.isRunning && settings.lastUpdated) {
                    const elapsed = Math.floor((Date.now() - new Date(settings.lastUpdated).getTime()) / 1000);
                    timeLeft = Math.max(0, settings.timeLeft - elapsed);
                    if (timeLeft > 0 && !timer) {
                        startTimer();
                    } else if (timeLeft <= 0) {
                        timeLeft = 0;
                        handleTimerEnd();
                    }
                } else {
                    timeLeft = settings.timeLeft;
                    isRunning = false;
                }
                updateTimerDisplay();
            } else {
                savePomodoroState(timeLeft, isRunning, isBreakTime);
            }
        }, error => console.error("Pomodoro: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);
        
        startTimerBtn.onclick = startTimer;
        pausePomodoroBtn.onclick = pauseTimer;
        resetTimerBtn.onclick = resetTimer;
    })();

    // --- Checklist Logic ---
    (() => {
        const checkItemInput = document.getElementById('checkItem');
        const addCheckItemBtn = document.getElementById('add-check-item-btn');
        const checkListUl = document.getElementById('checkList');
        if (!checkItemInput || !addCheckItemBtn || !checkListUl) return;
        
        let originalText = '';
        let draggedItem = null;

        const q = query(checklistCollectionRef, orderBy('position', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const focusedElementId = document.activeElement?.closest('li')?.dataset.id;
            const focusedElementIsEditing = document.activeElement?.classList.contains('editing');

            checkListUl.innerHTML = '';
            if (snapshot.empty) {
                checkListUl.innerHTML = '<li class="empty-section-message">No hay ítems en el checklist.</li>';
                return;
            }
            snapshot.forEach(docSnap => {
                const item = docSnap.data();
                const itemId = docSnap.id;
                const li = document.createElement('li');
                li.dataset.id = itemId;
                li.className = item.isMIT ? 'mit-task' : '';
                li.setAttribute('draggable', 'true');
                li.innerHTML = `
                    <input type="checkbox" class="completion-checkbox" id="check-${itemId}" ${item.completed ? 'checked' : ''}>
                    <label for="check-${itemId}">
                        <span class="item-text ${item.completed ? 'task-completed' : ''}" data-item-id="${itemId}" contenteditable="false">${item.text}</span>
                    </label>
                    <div class="mit-controls">
                        <input type="checkbox" class="mit-checkbox" id="mit-${itemId}" ${item.isMIT ? 'checked' : ''}> MIT
                    </div>
                    <button class="button-danger delete-item-btn" data-id="${itemId}">❌</button>`;
                checkListUl.appendChild(li);
            });
            
            if (focusedElementId && focusedElementIsEditing) {
                const newFocusedElement = checkListUl.querySelector(`[data-id="${focusedElementId}"] .item-text`);
                if (newFocusedElement) {
                    newFocusedElement.focus();
                    newFocusedElement.classList.add('editing');
                    newFocusedElement.contentEditable = 'true';
                }
            }

        }, error => console.error("Checklist: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        addCheckItemBtn.onclick = async () => {
            const itemText = checkItemInput.value.trim();
            if (itemText) {
                try {
                    const q_pos = query(checklistCollectionRef, orderBy('position', 'desc'), limit(1));
                    const lastItemSnapshot = await getDocs(q_pos);
                    const newPosition = lastItemSnapshot.empty ? 0 : lastItemSnapshot.docs[0].data().position + 1;
                    await addDoc(checklistCollectionRef, { text: itemText, completed: false, isMIT: false, timestamp: new Date().toISOString(), position: newPosition });
                    checkItemInput.value = '';
                } catch (error) { console.error("Checklist: Error al añadir:", error); }
            }
        };

        checkListUl.addEventListener('click', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const itemId = listItem.dataset.id;
            const itemRef = doc(checklistCollectionRef, itemId);
            if (target.classList.contains('delete-item-btn')) {
                if (await window.showCustomConfirm('¿Eliminar esta tarea?')) await deleteDoc(itemRef);
            }
        });
        
        checkListUl.addEventListener('change', async (e) => {
            const target = e.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const itemId = listItem.dataset.id;
            const itemRef = doc(checklistCollectionRef, itemId);
            if (target.classList.contains('completion-checkbox')) {
                await updateDoc(itemRef, { completed: target.checked });
                if(target.checked) document.getElementById('sound-task-done').play().catch(err=>console.error(err));
            } else if (target.classList.contains('mit-checkbox')) {
                const mitQuery = query(checklistCollectionRef, where('isMIT', '==', true));
                const mitSnapshot = await getDocs(mitQuery);
                if (target.checked && mitSnapshot.size >= 3) {
                    window.showTempMessage('Solo puedes tener 3 MITs a la vez.', 'warning');
                    target.checked = false;
                    return;
                }
                await updateDoc(itemRef, { isMIT: target.checked });
            }
        });
        
        checkListUl.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.classList.contains('item-text')) {
                originalText = target.textContent;
                target.contentEditable = 'true';
                target.focus();
                target.classList.add('editing');
            }
        });

        checkListUl.addEventListener('blur', async (e) => {
            const target = e.target;
            if (target.classList.contains('item-text') && target.contentEditable === 'true') {
                target.contentEditable = 'false';
                target.classList.remove('editing');
                const newText = target.textContent.trim();
                const itemId = target.dataset.itemId;
                if (newText && newText !== originalText) {
                    try {
                        await updateDoc(doc(checklistCollectionRef, itemId), { text: newText });
                    } catch (error) {
                        console.error("Checklist: Error al actualizar texto:", error);
                        target.textContent = originalText;
                    }
                } else {
                    target.textContent = originalText;
                }
            }
        }, true);

        checkListUl.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('item-text') && e.target.contentEditable === 'true') {
                if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                else if (e.key === 'Escape') { e.target.textContent = originalText; e.target.blur(); }
            }
        });
        
        const updateItemPositions = async () => {
            const batch = writeBatch(db);
            Array.from(checkListUl.children).forEach((item, index) => {
                const itemId = item.dataset.id;
                if(itemId) batch.update(doc(checklistCollectionRef, itemId), { position: index });
            });
            await batch.commit();
        };

        checkListUl.addEventListener('dragstart', (e) => {
            if(e.target.tagName === 'LI') {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }
        });
        checkListUl.addEventListener('dragend', () => {
            if(draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                updateItemPositions();
            }
        });
        checkListUl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(checkListUl, e.clientY);
            const currentDragged = document.querySelector('.dragging');
            if (afterElement == null) {
                checkListUl.appendChild(currentDragged);
            } else {
                checkListUl.insertBefore(currentDragged, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

    })();

    // --- Habits Logic ---
    (() => {
        const newHabitInput = document.getElementById('newHabitInput');
        const addHabitBtn = document.getElementById('add-habit-btn');
        const habitsList = document.getElementById('habitsList');
        if(!newHabitInput || !addHabitBtn || !habitsList) return;

        const q = query(habitsCollectionRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            habitsList.innerHTML = '';
            if(snapshot.empty) {
                habitsList.innerHTML = '<li class="empty-section-message">Aún no tienes hábitos.</li>';
                return;
            }
            snapshot.forEach(docSnap => {
                const habit = docSnap.data();
                const habitId = docSnap.id;
                const today = new Date();
                const dailyTrackingHtml = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (6 - i));
                    const dateString = date.toISOString().split('T')[0];
                    const isCompleted = habit.dailyCompletions && habit.dailyCompletions[dateString];
                    return `<span class="habit-day-dot ${isCompleted ? 'completed' : ''}" data-date="${dateString}" data-habit-id="${habitId}" title="${date.toLocaleDateString()}"></span>`;
                }).join('');

                const li = document.createElement('li');
                li.innerHTML = `<span>${habit.name}</span><div class="habit-tracking-dots">${dailyTrackingHtml}</div><button class="button-danger" data-id="${habitId}">❌</button>`;
                habitsList.appendChild(li);
            });
        }, error => console.error("Hábitos: Error al escuchar:", error));
        unsubscribeListeners.push(unsubscribe);

        addHabitBtn.onclick = async () => {
            const habitName = newHabitInput.value.trim();
            if(habitName) {
                try {
                    await addDoc(habitsCollectionRef, { name: habitName, timestamp: new Date().toISOString(), dailyCompletions: {} });
                    newHabitInput.value = '';
                } catch (error) { console.error("Hábitos: Error al añadir:", error); }
            }
        };

        habitsList.addEventListener('click', async (e) => {
            const target = e.target;
            if(target.classList.contains('habit-day-dot')) {
                const { habitId, date } = target.dataset;
                const habitRef = doc(habitsCollectionRef, habitId);
                try {
                    const docSnap = await getDoc(habitRef);
                    if(docSnap.exists()) {
                        const completions = docSnap.data().dailyCompletions || {};
                        const newCompletions = {...completions, [date]: !completions[date]};
                        await updateDoc(habitRef, { dailyCompletions: newCompletions });
                    }
                } catch (error) { console.error("Hábitos: Error al actualizar:", error); }
            } else if (target.classList.contains('button-danger')) {
                const habitId = target.dataset.id;
                if(await window.showCustomConfirm('¿Eliminar este hábito?')) {
                    await deleteDoc(doc(habitsCollectionRef, habitId));
                }
            }
        });
    })();

    // --- Trello Logic ---
    (() => {
        const trelloApiKeyInput = document.getElementById('api-key');
        const trelloTokenInput = document.getElementById('token');
        const trelloBoardIdInput = document.getElementById('board-id');
        const trelloStatusDiv = document.getElementById('trello-status');
        const trelloSuccessMessage = document.getElementById('trello-success-message');
        const configTrelloBtn = document.getElementById('config-trello-btn');
        const testTrelloBtn = document.getElementById('test-trello-btn');
        const saveTrelloConfigBtn = document.getElementById('save-trello-config-btn');
        const listaTareasUl = document.getElementById('listaTareas');

        if (!trelloApiKeyInput || !saveTrelloConfigBtn || !listaTareasUl) return;
        
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
        unsubscribeListeners.push(unsubscribe);

        saveTrelloConfigBtn.onclick = async () => {
            const apiKey = trelloApiKeyInput.value.trim();
            const token = trelloTokenInput.value.trim();
            const boardId = trelloBoardIdInput.value.trim();
            if (apiKey && token && boardId) {
                await setDoc(trelloConfigDocRef, { apiKey, token, boardId });
                window.showTempMessage('Configuración de Trello guardada.', 'success');
                probarConexionTrello();
            } else {
                window.showTempMessage('Por favor, completa todos los campos.', 'warning');
            }
        };
        
        testTrelloBtn.onclick = probarConexionTrello;
        configTrelloBtn.onclick = () => window.mostrarSeccion('config');
    })();
    
    // --- Blog & Nutrition Logic ---
    const createContentLoader = (collectionRef, contentDivId, refreshBtnId) => {
        const contentDiv = document.getElementById(contentDivId);
        const refreshBtn = document.getElementById(refreshBtnId);
        if(!contentDiv || !refreshBtn) return;
        
        const loadContent = async () => {
            contentDiv.innerHTML = '<p>Cargando...</p>';
            try {
                const q = query(collectionRef, orderBy('timestamp', 'desc'));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    contentDiv.innerHTML = '<p class="empty-section-message">No hay contenido disponible.</p>';
                    return;
                }
                contentDiv.innerHTML = snapshot.docs.map(docSnap => {
                    const item = docSnap.data();
                    return `<div class="blog-article-card">
                                <h4>${item.title}</h4>
                                <p>${item.content}</p>
                                <small>Fuente: ${item.source}</small>
                                ${item.url ? `<a href="${item.url}" target="_blank" class="article-link">Leer Más ↗</a>` : ''}
                            </div>`;
                }).join('');
            } catch (error) {
                console.error(`Error al cargar ${contentDivId}:`, error);
                contentDiv.innerHTML = `<p class="empty-section-message">Error al cargar contenido. Es posible que falte un índice en Firestore. Revisa la consola para más detalles.</p>`;
            }
        };
        refreshBtn.onclick = loadContent;
        loadContent();
    };

    createContentLoader(blogArticlesCollectionRef, 'blog-content', 'refresh-blog-btn');
    createContentLoader(nutricionCollectionRef, 'nutricion-content', 'refresh-nutricion-btn');

    // --- Clear Data Logic ---
    (() => {
        const clearDataBtn = document.getElementById('clear-data-btn');
        if(!clearDataBtn) return;
        clearDataBtn.onclick = async () => {
            if(await window.showCustomConfirm('¿Estás seguro? Se borrarán TODOS tus datos de esta app.')) {
                const batch = writeBatch(db);
                const collectionsToClear = [journalCollectionRef, checklistCollectionRef, habitsCollectionRef];
                const docsToClear = [pomodoroSettingsDocRef, trelloConfigDocRef, userSettingsRef];
                try {
                    for(const collRef of collectionsToClear) {
                        const snapshot = await getDocs(collRef);
                        snapshot.forEach(doc => batch.delete(doc.ref));
                    }
                    docsToClear.forEach(docRef => batch.delete(docRef));
                    await batch.commit();
                    window.showTempMessage('Datos limpiados. La página se recargará.', 'info');
                    setTimeout(() => location.reload(), 2000);
                } catch(error) {
                    window.showTempMessage(`Error al limpiar: ${error.message}`, 'error');
                }
            }
        }
    })();
    
    // --- Status Counters ---
    (() => {
        const checklistCountElement = document.getElementById('checklist-count');
        const habitsCountElement = document.getElementById('tasks-count');
        if (checklistCountElement) {
            const unsubscribe = onSnapshot(query(checklistCollectionRef), s => checklistCountElement.textContent = s.size);
            unsubscribeListeners.push(unsubscribe);
        }
        if (habitsCountElement) {
            const unsubscribe = onSnapshot(query(habitsCollectionRef), s => habitsCountElement.textContent = s.size);
            unsubscribeListeners.push(unsubscribe);
        }
    })();
}

// =================================================================================
// AUTHENTICATION & DOM LISTENERS
// =================================================================================
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        const userDisplayNameElement = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');
        const authButtonsWrapper = document.querySelector('.auth-buttons-wrapper');
        const userIdDisplay = document.getElementById('user-id-display');
        const userInfoArea = document.getElementById('user-info-area');

        if (user) {
            if (userDisplayNameElement) userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
            if (userIdDisplay) userIdDisplay.textContent = `ID: ${user.uid}`;
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (userInfoArea) userInfoArea.classList.remove('auth-options-visible');
            
            if (!isLoggingOut) {
                await loadAllUserData(user.uid);
            }
            isLoggingOut = false;
        } else {
            if (userDisplayNameElement) userDisplayNameElement.textContent = 'Por favor, inicia sesión:';
            if (userIdDisplay) userIdDisplay.textContent = '';
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfoArea) userInfoArea.classList.add('auth-options-visible');
            
            cleanupFirestoreListeners();
            document.getElementById('journalEntriesList').innerHTML = '';
            document.getElementById('checkList').innerHTML = '';
            document.getElementById('habitsList').innerHTML = '';

            if (!isLoggingOut) {
                try {
                    if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                    else await signInAnonymously(auth);
                } catch (error) { console.error("Error de inicio de sesión automático:", error); }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth) {
        window.mostrarSeccion('pomodoro');

        document.getElementById('google-signin-btn').onclick = async () => {
            try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
            catch (error) { 
                console.error("Error de inicio de sesión con Google:", error);
                window.showTempMessage(`Error con Google: ${error.message}`, 'error');
            }
        };
        document.getElementById('anonymous-signin-btn').onclick = async () => {
            try { await signInAnonymously(auth); } 
            catch (error) { 
                console.error("Error de inicio de sesión anónimo:", error);
                window.showTempMessage(`Error de sesión anónima: ${error.message}`, 'error');
            }
        };
        document.getElementById('email-signin-toggle-btn').onclick = () => {
            window.showTempMessage('Inicio de sesión con Email no implementado aún.', 'info');
        };
        document.getElementById('logout-btn').onclick = async () => {
            if (await window.showCustomConfirm("¿Cerrar sesión?")) {
                isLoggingOut = true;
                await signOut(auth);
            }
        };

        document.querySelectorAll('.nav-tabs button').forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.id.replace('btn-', '');
                window.mostrarSeccion(sectionId);
            });
        });

        (async () => {
            if (!("Notification" in window)) return;
            if (Notification.permission === 'granted') {
                notificationPermissionGranted = true;
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                notificationPermissionGranted = permission === 'granted';
            }
        })();
    }
});
