// =================================================================================
// HÁBITOS DIARIOS
// =================================================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showCustomConfirm, renderEmptyState, renderProgressSummary } from '../ui.js';
import { setHabitsState } from './next-step.js';

export function initHabits(db, userId) {
    const habitsCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'habits');

    const newHabitInput = document.getElementById('newHabitInput');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const habitsList = document.getElementById('habitsList');
    const habitsProgress = document.getElementById('habits-progress');
    if (!newHabitInput || !addHabitBtn || !habitsList) return;

    const q = query(habitsCollectionRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        habitsList.innerHTML = '';

        const todayString = new Date().toISOString().split('T')[0];
        const habitsData = snapshot.docs.map(d => ({ id: d.id, name: d.data().name, dailyCompletions: d.data().dailyCompletions }));
        const completedToday = habitsData.filter(h => h.dailyCompletions?.[todayString]).length;
        renderProgressSummary(habitsProgress, completedToday, snapshot.size);
        setHabitsState(habitsData, todayString);

        if (snapshot.empty) {
            renderEmptyState(habitsList, {
                message: 'Aún no tenés hábitos. Empezá con uno chico y sostenible.',
                actionLabel: '🌱 Agregar tu primer hábito',
                onAction: () => newHabitInput.focus()
            });
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
            li.innerHTML = `<span></span><div class="habit-tracking-dots">${dailyTrackingHtml}</div><button class="button-danger" data-id="${habitId}">❌</button>`;
            li.querySelector('span').textContent = habit.name;
            habitsList.appendChild(li);
        });
    }, error => console.error("Hábitos: Error al escuchar:", error));
    registerListener(unsubscribe);

    addHabitBtn.onclick = async () => {
        const habitName = newHabitInput.value.trim();
        if (habitName) {
            try {
                await addDoc(habitsCollectionRef, { name: habitName, timestamp: new Date().toISOString(), dailyCompletions: {} });
                newHabitInput.value = '';
            } catch (error) { console.error("Hábitos: Error al añadir:", error); }
        }
    };

    habitsList.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('habit-day-dot')) {
            const { habitId, date } = target.dataset;
            const habitRef = doc(habitsCollectionRef, habitId);
            try {
                const docSnap = await getDoc(habitRef);
                if (docSnap.exists()) {
                    const completions = docSnap.data().dailyCompletions || {};
                    const newCompletions = { ...completions, [date]: !completions[date] };
                    await updateDoc(habitRef, { dailyCompletions: newCompletions });
                }
            } catch (error) { console.error("Hábitos: Error al actualizar:", error); }
        } else if (target.classList.contains('button-danger')) {
            const habitId = target.dataset.id;
            if (await showCustomConfirm('¿Eliminar este hábito?')) {
                await deleteDoc(doc(habitsCollectionRef, habitId));
            }
        }
    });
}
