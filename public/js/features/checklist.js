// =================================================================================
// CHECKLIST RÁPIDO / MITs
// =================================================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, orderBy, limit, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, showCustomConfirm, renderEmptyState } from '../ui.js';
import { isNotificationPermissionGranted } from '../notifications.js';
import { playSound } from '../sound.js';

const TAG_COLORS = ['red', 'orange', 'green', 'blue', 'purple'];
const REMINDER_CHECK_INTERVAL_MS = 30000;

let reminderIntervalId = null;

export function initChecklist(db, userId) {
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'checklistItems');

    const checkItemInput = document.getElementById('checkItem');
    const addCheckItemBtn = document.getElementById('add-check-item-btn');
    const checkListUl = document.getElementById('checkList');
    if (!checkItemInput || !addCheckItemBtn || !checkListUl) return;

    let originalText = '';
    let draggedItem = null;
    const expandedItemIds = new Set();
    let activeItemsForReminders = [];
    const firedRemindersToday = new Map();

    const renderTagPicker = (itemId, currentColor) => {
        const swatches = TAG_COLORS.map(color => `
            <span class="tag-dot tag-dot-${color} ${currentColor === color ? 'selected' : ''}" data-color="${color}" title="${color}"></span>
        `).join('');
        return `
            <div class="tag-color-picker">
                ${swatches}
                <span class="tag-dot tag-dot-none ${!currentColor ? 'selected' : ''}" data-color="" title="Sin color">✕</span>
            </div>`;
    };

    const renderSubtasks = (subtasks) => {
        if (!subtasks.length) {
            return '<li class="empty-section-message subtask-empty">Sin subtareas todavía.</li>';
        }
        return subtasks.map(sub => `
            <li class="subtask-item" data-subtask-id="${sub.id}">
                <input type="checkbox" class="subtask-checkbox" data-subtask-id="${sub.id}" ${sub.completed ? 'checked' : ''}>
                <span class="subtask-text ${sub.completed ? 'task-completed' : ''}"></span>
                <button class="subtask-delete-btn" data-subtask-id="${sub.id}">✕</button>
            </li>`).join('');
    };

    const q = query(checklistCollectionRef, orderBy('position', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const focusedElementId = document.activeElement?.closest('li')?.dataset.id;
        const focusedElementIsEditing = document.activeElement?.classList.contains('editing');

        checkListUl.innerHTML = '';
        activeItemsForReminders = [];

        if (snapshot.empty) {
            renderEmptyState(checkListUl, {
                message: 'Todavía no tenés tareas. ¡Sumá la primera y arrancá con foco!',
                actionLabel: '➕ Añadir tu primera tarea',
                onAction: () => checkItemInput.focus()
            });
            return;
        }

        snapshot.forEach(docSnap => {
            const item = docSnap.data();
            const itemId = docSnap.id;
            const subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
            const tagColor = TAG_COLORS.includes(item.tagColor) ? item.tagColor : null;

            activeItemsForReminders.push({
                id: itemId,
                text: item.text,
                completed: !!item.completed,
                reminderTime: item.reminderTime || null
            });

            const li = document.createElement('li');
            li.dataset.id = itemId;
            li.className = item.isMIT ? 'mit-task' : '';
            li.setAttribute('draggable', 'true');
            li.innerHTML = `
                <input type="checkbox" class="completion-checkbox" id="check-${itemId}" ${item.completed ? 'checked' : ''}>
                ${tagColor ? `<span class="item-tag-dot tag-dot-${tagColor}"></span>` : ''}
                <label for="check-${itemId}">
                    <span class="item-text ${item.completed ? 'task-completed' : ''}" data-item-id="${itemId}" contenteditable="false"></span>
                </label>
                <div class="mit-controls">
                    <input type="checkbox" class="mit-checkbox" id="mit-${itemId}" ${item.isMIT ? 'checked' : ''}> MIT
                </div>
                <button class="edit-item-btn">✏️</button>
                <button class="details-toggle-btn" title="Detalles">🔽</button>
                <button class="button-danger delete-item-btn" data-id="${itemId}">❌</button>
                <div class="item-details-panel">
                    <div class="details-row">
                        <span class="details-label">Etiqueta:</span>
                        ${renderTagPicker(itemId, tagColor)}
                    </div>
                    <div class="details-row reminder-input-group">
                        <span class="details-label">Recordatorio:</span>
                        <input type="time" class="reminder-time-input" value="${item.reminderTime || ''}">
                    </div>
                    <div class="details-row subtasks-section">
                        <span class="details-label">Subtareas:</span>
                        <ul class="subtask-list">${renderSubtasks(subtasks)}</ul>
                        <div class="input-group subtask-input-group">
                            <input type="text" class="subtask-input" placeholder="Nueva subtarea...">
                            <button class="add-subtask-btn">➕</button>
                        </div>
                    </div>
                </div>`;
            li.querySelector('.item-text').textContent = item.text;
            li.querySelectorAll('.subtask-text').forEach((span, i) => {
                span.textContent = subtasks[i].text;
            });
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

        expandedItemIds.forEach(id => {
            checkListUl.querySelector(`[data-id="${id}"]`)?.classList.add('expanded');
        });
    }, error => console.error("Checklist: Error al escuchar:", error));
    registerListener(unsubscribe);

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
        const listItem = target.closest('li[data-id]');
        if (!listItem) return;
        const itemId = listItem.dataset.id;
        const itemRef = doc(checklistCollectionRef, itemId);

        if (target.classList.contains('delete-item-btn')) {
            if (await showCustomConfirm('¿Eliminar esta tarea?')) await deleteDoc(itemRef);
            return;
        }
        if (target.classList.contains('edit-item-btn')) {
            e.stopPropagation();
            const itemTextSpan = listItem.querySelector('.item-text');
            if (itemTextSpan) {
                originalText = itemTextSpan.textContent;
                itemTextSpan.contentEditable = 'true';
                itemTextSpan.focus();
                itemTextSpan.classList.add('editing');
            }
            return;
        }
        if (target.classList.contains('details-toggle-btn')) {
            if (expandedItemIds.has(itemId)) {
                expandedItemIds.delete(itemId);
                listItem.classList.remove('expanded');
            } else {
                expandedItemIds.add(itemId);
                listItem.classList.add('expanded');
            }
            return;
        }
        if (target.classList.contains('tag-dot')) {
            const color = target.dataset.color || null;
            try {
                await updateDoc(itemRef, { tagColor: color });
            } catch (error) { console.error("Checklist: Error al asignar etiqueta:", error); }
            return;
        }
        if (target.classList.contains('add-subtask-btn')) {
            const input = listItem.querySelector('.subtask-input');
            const subtaskText = input?.value.trim();
            if (!subtaskText) return;
            try {
                const docSnap = await getDoc(itemRef);
                const currentSubtasks = Array.isArray(docSnap.data()?.subtasks) ? docSnap.data().subtasks : [];
                const newSubtasks = [...currentSubtasks, { id: crypto.randomUUID(), text: subtaskText, completed: false }];
                await updateDoc(itemRef, { subtasks: newSubtasks });
                input.value = '';
            } catch (error) { console.error("Checklist: Error al añadir subtarea:", error); }
            return;
        }
        if (target.classList.contains('subtask-delete-btn')) {
            const subtaskId = target.dataset.subtaskId;
            try {
                const docSnap = await getDoc(itemRef);
                const currentSubtasks = Array.isArray(docSnap.data()?.subtasks) ? docSnap.data().subtasks : [];
                const newSubtasks = currentSubtasks.filter(s => s.id !== subtaskId);
                await updateDoc(itemRef, { subtasks: newSubtasks });
            } catch (error) { console.error("Checklist: Error al borrar subtarea:", error); }
        }
    });

    checkListUl.addEventListener('change', async (e) => {
        const target = e.target;
        const listItem = target.closest('li[data-id]');
        if (!listItem) return;
        const itemId = listItem.dataset.id;
        const itemRef = doc(checklistCollectionRef, itemId);

        if (target.classList.contains('completion-checkbox')) {
            await updateDoc(itemRef, { completed: target.checked });
            if (target.checked) playSound('sound-task-done');
        } else if (target.classList.contains('mit-checkbox')) {
            // limitar a 3 MITs
            const snapshot = await getDocs(query(checklistCollectionRef));
            const currentMits = snapshot.docs.filter(d => d.data().isMIT).length;
            if (target.checked && currentMits >= 3) {
                showTempMessage('Solo puedes tener 3 MITs a la vez.', 'warning');
                target.checked = false;
                return;
            }
            await updateDoc(itemRef, { isMIT: target.checked });
        } else if (target.classList.contains('reminder-time-input')) {
            try {
                await updateDoc(itemRef, { reminderTime: target.value || null });
            } catch (error) { console.error("Checklist: Error al guardar recordatorio:", error); }
        } else if (target.classList.contains('subtask-checkbox')) {
            const subtaskId = target.dataset.subtaskId;
            try {
                const docSnap = await getDoc(itemRef);
                const currentSubtasks = Array.isArray(docSnap.data()?.subtasks) ? docSnap.data().subtasks : [];
                const newSubtasks = currentSubtasks.map(s => s.id === subtaskId ? { ...s, completed: target.checked } : s);
                await updateDoc(itemRef, { subtasks: newSubtasks });
            } catch (error) { console.error("Checklist: Error al actualizar subtarea:", error); }
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
                    showTempMessage('Tarea actualizada.', 'success');
                } catch (error) {
                    console.error("Checklist: Error al actualizar texto:", error);
                    showTempMessage('Error al actualizar.', 'error');
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
        } else if (e.target.classList.contains('subtask-input') && e.key === 'Enter') {
            e.preventDefault();
            e.target.closest('.item-details-panel').querySelector('.add-subtask-btn').click();
        }
    });

    const updateItemPositions = async () => {
        const batch = writeBatch(db);
        Array.from(checkListUl.children).forEach((item, index) => {
            const itemId = item.dataset.id;
            if (itemId) batch.update(doc(checklistCollectionRef, itemId), { position: index });
        });
        await batch.commit();
    };

    checkListUl.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'LI') {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    checkListUl.addEventListener('dragend', () => {
        if (draggedItem) {
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

    const checkReminders = () => {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayStr = now.toISOString().split('T')[0];
        activeItemsForReminders.forEach(item => {
            if (!item.reminderTime || item.completed) return;
            if (item.reminderTime !== hhmm) return;
            if (firedRemindersToday.get(item.id) === todayStr) return;
            firedRemindersToday.set(item.id, todayStr);
            showTempMessage(`⏰ Recordatorio: ${item.text}`, 'info');
            if (isNotificationPermissionGranted()) new Notification('⏰ Recordatorio de tarea', { body: item.text });
        });
    };

    if (reminderIntervalId) clearInterval(reminderIntervalId);
    reminderIntervalId = setInterval(checkReminders, REMINDER_CHECK_INTERVAL_MS);
}
