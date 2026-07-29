// =================================================================================
// JOURNAL (+ mini-calendario de entradas)
// =================================================================================
import { collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage } from '../ui.js';

export function initJournal(db, userId) {
    const journalCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'journalEntries');

    const journalEntryTextarea = document.getElementById('journalEntry');
    const saveJournalEntryButton = document.getElementById('save-journal-entry-btn');
    const journalEntriesList = document.getElementById('journalEntriesList');
    if (!journalEntryTextarea || !saveJournalEntryButton || !journalEntriesList) return;

    // --- Mini-calendario: marca los días con entradas ---
    const calMonthLabel = document.getElementById('journal-cal-month-label');
    const calGrid = document.getElementById('journal-cal-grid');
    const calWeekdays = document.getElementById('journal-cal-weekdays');
    const calPrevBtn = document.getElementById('journal-cal-prev');
    const calNextBtn = document.getElementById('journal-cal-next');
    const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    let currentCalendarDate = new Date();
    currentCalendarDate.setDate(1);
    let journalEntryDates = new Set();

    const renderJournalCalendar = () => {
        if (!calGrid || !calMonthLabel) return;
        calGrid.innerHTML = '';

        if (calWeekdays && !calWeekdays.childElementCount) {
            WEEKDAY_LABELS.forEach(label => {
                const span = document.createElement('span');
                span.textContent = label;
                calWeekdays.appendChild(span);
            });
        }

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        calMonthLabel.textContent = currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const startOffset = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayString = new Date().toISOString().split('T')[0];

        for (let i = 0; i < startOffset; i++) {
            calGrid.appendChild(document.createElement('span'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEl = document.createElement('span');
            dayEl.className = 'journal-cal-day';
            dayEl.textContent = day;
            if (journalEntryDates.has(dateString)) dayEl.classList.add('has-entry');
            if (dateString === todayString) dayEl.classList.add('is-today');
            calGrid.appendChild(dayEl);
        }
    };

    if (calPrevBtn) {
        calPrevBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderJournalCalendar();
        };
    }
    if (calNextBtn) {
        calNextBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderJournalCalendar();
        };
    }

    const q = query(journalCollectionRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        journalEntriesList.innerHTML = '';

        journalEntryDates = new Set(
            snapshot.docs.map(docSnap => new Date(docSnap.data().timestamp).toISOString().split('T')[0])
        );
        renderJournalCalendar();

        if (snapshot.empty) {
            journalEntriesList.innerHTML = '<li>No hay entradas en el diario aún.</li>';
            return;
        }
        snapshot.forEach((docSnap) => {
            const entry = docSnap.data();
            const listItem = document.createElement('li');

            const dateSpan = document.createElement('span');
            dateSpan.className = 'journal-date';
            dateSpan.textContent = new Date(entry.timestamp).toLocaleString('es-ES');

            const textDiv = document.createElement('div');
            const lines = entry.text.split('\n');
            lines.forEach((line, idx) => {
                textDiv.appendChild(document.createTextNode(line));
                if (idx < lines.length - 1) textDiv.appendChild(document.createElement('br'));
            });

            listItem.appendChild(dateSpan);
            listItem.appendChild(textDiv);
            journalEntriesList.appendChild(listItem);
        });
    }, (error) => console.error("Journal: Error al escuchar:", error));
    registerListener(unsubscribe);

    saveJournalEntryButton.onclick = async () => {
        const entryText = journalEntryTextarea.value.trim();
        if (entryText) {
            try {
                await addDoc(journalCollectionRef, { text: entryText, timestamp: new Date().toISOString() });
                journalEntryTextarea.value = '';
                showTempMessage('Entrada guardada.', 'success');
            } catch (error) { showTempMessage(`Error al guardar: ${error.message}`, 'error'); }
        }
    };
}
