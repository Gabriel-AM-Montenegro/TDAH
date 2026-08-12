// =================================================================================
// TOUR DE BIENVENIDA
// =================================================================================
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { showTempMessage } from '../ui.js';

export async function initWelcomeTour(db, userId) {
    const tourOverlay = document.getElementById('welcome-tour-overlay');
    const tourTitle = document.getElementById('tour-title');
    const tourDescription = document.getElementById('tour-description');
    const tourHighlightImage = document.getElementById('tour-highlight-image');
    const tourStepCounter = document.getElementById('tour-step-counter');
    const tourBackBtn = document.getElementById('tour-back-btn');
    const tourNextBtn = document.getElementById('tour-next-btn');
    const tourSkipBtn = document.getElementById('tour-skip-btn');
    const tourStartBtn = document.getElementById('tour-start-btn');
    const tourDotsContainer = document.getElementById('tour-dots');

    if (!tourOverlay || !tourTitle || !tourDescription || !tourHighlightImage || !tourBackBtn || !tourNextBtn || !tourSkipBtn || !tourDotsContainer) {
        return;
    }

    const userSettingsRef = doc(db, 'artifacts', publicDataDocId, 'users', userId, 'settings', 'appSettings');

    let currentTourStep = 0;
    const tourSteps = [
        {
            title: "¡Bienvenido a NeuroKit!",
            description: "Esta aplicación está diseñada para ayudarte a gestionar tu día a día, mejorar tu concentración y organizar tus tareas de forma efectiva. ¡Vamos a explorar sus funciones principales!",
            image: ""
        },
        {
            title: "📅 HOY",
            description: "Este es tu punto de partida diario. Acá ves tus 3 tareas más importantes, tu foco con Pomodoro y tu agenda del día, todo en una sola vista.",
            image: ""
        },
        {
            title: "⏱️ Pomodoro",
            description: "Trabajá en bloques de foco y descanso para mantener la concentración. Podés ajustar los tiempos, y activar o desactivar la guía de respiración automática del descanso desde la configuración de Pomodoro.",
            image: ""
        },
        {
            title: "🫁 Respiración",
            description: "Practicá un ejercicio de respiración guiada cuando quieras, no solo en los descansos del Pomodoro. Elegí el patrón que más te sirva (4-7-8, Cuadrada o Triangular) — es el mismo patrón que usa Pomodoro, cambiarlo en un lugar lo cambia en el otro.",
            image: ""
        },
        {
            title: "✅ Checklist Rápido",
            description: "Organizá tareas simples y marcá lo que vas completando para avanzar sin sobrepensar.",
            image: ""
        },
        {
            title: "📝 Journal Personal",
            description: "Un espacio seguro para escribir pensamientos, emociones y logros. Reflexionar también es productividad.",
            image: ""
        },
        {
            title: "🌱 Hábitos Diarios",
            description: "Construí rutinas pequeñas y sostenibles, y visualizá tu progreso día a día.",
            image: ""
        },
        {
            title: "🚀 Cierre del tour",
            description: "Explorá la app y adaptala a vos. No hay una forma correcta de usarla, solo la que te funciona.",
            image: ""
        }
    ];

    const renderTourStep = () => {
        const step = tourSteps[currentTourStep];
        tourTitle.textContent = step.title;
        tourDescription.textContent = step.description;
        tourHighlightImage.src = step.image || '';
        tourHighlightImage.style.display = step.image ? 'block' : 'none';

        // Ocultar también el contenedor para evitar espacios vacíos
        if (tourHighlightImage.parentElement) {
            tourHighlightImage.parentElement.style.display = step.image ? 'flex' : 'none';
        }

        // Actualizar contador
        if (tourStepCounter) {
            tourStepCounter.textContent = `Paso ${currentTourStep + 1} de ${tourSteps.length}`;
        }

        // Botón atrás
        tourBackBtn.style.display = currentTourStep === 0 ? 'none' : 'block';

        // Botones de acción final
        const isLastStep = currentTourStep === tourSteps.length - 1;

        if (isLastStep) {
            tourNextBtn.style.display = 'none';
            tourSkipBtn.style.display = 'none';
            if (tourStartBtn) tourStartBtn.style.display = 'block';
        } else {
            tourNextBtn.style.display = 'block';
            tourNextBtn.textContent = 'Siguiente ➡️';
            tourSkipBtn.style.display = 'block';
            if (tourStartBtn) tourStartBtn.style.display = 'none';
        }

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
            dot.onkeydown = (e) => { if (e.key === 'Enter') { currentTourStep = index; renderTourStep(); } };
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
        showTempMessage("¡Tour de bienvenida completado!", 'info');
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
    if (tourStartBtn) tourStartBtn.onclick = completeTour;
}
