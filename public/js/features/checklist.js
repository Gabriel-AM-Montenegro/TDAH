// =================================================================================
// CHECKLIST RÁPIDO / MITs
// =================================================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, showCustomConfirm } from '../ui.js';

export function initChecklist(db, userId) {
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'checklistItems');

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
                    <span class="item-text ${item.completed ? 'task-completed' : ''}" data-item-id="${itemId}" contenteditable="false"></span>
                </label>
                <div class="mit-controls">
                    <input type="checkbox" class="mit-checkbox" id="mit-${itemId}" ${item.isMIT ? 'checked' : ''}> MIT
                </div>
                <button class="edit-item-btn">✏️</button>
                <button class="button-danger delete-item-btn" data-id="${itemId}">❌</button>`;
            li.querySelector('.item-text').textContent = item.text;
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
        const listItem = target.closest('li');
        if (!listItem) return;
        const itemId = listItem.dataset.id;
        const itemRef = doc(checklistCollectionRef, itemId);
        if (target.classList.contains('delete-item-btn')) {
            if (await showCustomConfirm('¿Eliminar esta tarea?')) await deleteDoc(itemRef);
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
            if (target.checked) document.getElementById('sound-task-done').play().catch(err => console.error(err));
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
}
