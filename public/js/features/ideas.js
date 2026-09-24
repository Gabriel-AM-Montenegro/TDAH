// =================================================================================
// GARAGE DE IDEAS: captura rápida de ideas sueltas, separada del Checklist (que es
// para tareas a hacer). La fricción de captura tiene que ser casi cero — por eso
// guardar una idea es solo texto + click, sin categoría ni prioridad obligatoria.
// =================================================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { registerListener } from '../listeners.js';
import { showTempMessage, showCustomConfirm, renderEmptyState } from '../ui.js';

export function initIdeas(db, userId) {
    const ideasCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'ideas');
    const checklistCollectionRef = collection(db, 'artifacts', publicDataDocId, 'users', userId, 'checklistItems');

    const ideaInput = document.getElementById('idea-input');
    const addIdeaBtn = document.getElementById('add-idea-btn');
    const ideasList = document.getElementById('ideas-list');
    const doneToggleBtn = document.getElementById('ideas-done-toggle');
    const doneList = document.getElementById('ideas-done-list');
    if (!ideaInput || !addIdeaBtn || !ideasList) return;

    let showDone = false;
    let lastDoneCount = 0;

    const renderIdeaItem = (idea, isDone) => {
        const li = document.createElement('li');
        li.className = isDone ? 'idea-item idea-item-done' : 'idea-item';
        li.dataset.id = idea.id;

        const span = document.createElement('span');
        span.className = 'idea-text';
        span.textContent = idea.text;
        li.appendChild(span);

        if (isDone) {
            const tag = document.createElement('span');
            tag.className = 'idea-done-tag';
            tag.textContent = '✓ En Checklist';
            li.appendChild(tag);
        } else {
            const actions = document.createElement('div');
            actions.className = 'idea-actions';

            const promoteBtn = document.createElement('button');
            promoteBtn.type = 'button';
            promoteBtn.className = 'idea-promote-btn';
            promoteBtn.textContent = '→ Pasar al Checklist';
            promoteBtn.onclick = () => promoteIdea(idea);
            actions.appendChild(promoteBtn);

            const discardBtn = document.createElement('button');
            discardBtn.type = 'button';
            discardBtn.className = 'button-danger idea-discard-btn';
            discardBtn.setAttribute('aria-label', 'Descartar');
            discardBtn.textContent = '🗑';
            discardBtn.onclick = () => discardIdea(idea.id);
            actions.appendChild(discardBtn);

            li.appendChild(actions);
        }
        return li;
    };

    const promoteIdea = async (idea) => {
        try {
            const q_pos = query(checklistCollectionRef, orderBy('position', 'desc'), limit(1));
            const lastItemSnapshot = await getDocs(q_pos);
            const newPosition = lastItemSnapshot.empty ? 0 : lastItemSnapshot.docs[0].data().position + 1;
            await addDoc(checklistCollectionRef, {
                text: idea.text,
                completed: false,
                isMIT: false,
                timestamp: new Date().toISOString(),
                position: newPosition,
                ideaId: idea.id
            });
            await updateDoc(doc(ideasCollectionRef, idea.id), { status: 'atacada' });
            showTempMessage('Idea agregada al Checklist.', 'success');
        } catch (error) {
            console.error('Ideas: Error al pasar al Checklist:', error);
            showTempMessage('No se pudo pasar la idea al Checklist. Probá de nuevo.', 'error');
        }
    };

    const discardIdea = async (ideaId) => {
        if (await showCustomConfirm('¿Descartar esta idea?')) {
            try {
                await deleteDoc(doc(ideasCollectionRef, ideaId));
            } catch (error) {
                console.error('Ideas: Error al descartar:', error);
            }
        }
    };

    const renderDoneToggle = () => {
        if (!doneToggleBtn) return;
        doneToggleBtn.hidden = lastDoneCount === 0;
        doneToggleBtn.textContent = `${showDone ? '▾' : '▸'} Ya atacadas (${lastDoneCount})`;
    };

    if (doneToggleBtn) {
        doneToggleBtn.onclick = () => {
            showDone = !showDone;
            if (doneList) doneList.hidden = !showDone;
            renderDoneToggle();
        };
    }

    const q = query(ideasCollectionRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        ideasList.innerHTML = '';
        if (doneList) doneList.innerHTML = '';

        const newIdeas = [];
        const doneIdeas = [];
        snapshot.forEach(docSnap => {
            const idea = { id: docSnap.id, ...docSnap.data() };
            (idea.status === 'atacada' ? doneIdeas : newIdeas).push(idea);
        });

        if (!newIdeas.length) {
            renderEmptyState(ideasList, {
                message: 'Todavía no anotaste ninguna idea. La próxima vez que se te ocurra algo, escribila acá antes de que se te escape.'
            });
        } else {
            newIdeas.forEach(idea => ideasList.appendChild(renderIdeaItem(idea, false)));
        }

        if (doneList) {
            doneIdeas.forEach(idea => doneList.appendChild(renderIdeaItem(idea, true)));
            doneList.hidden = !showDone;
        }
        lastDoneCount = doneIdeas.length;
        renderDoneToggle();
    }, error => console.error('Ideas: Error al escuchar:', error));
    registerListener(unsubscribe);

    addIdeaBtn.onclick = async () => {
        const text = ideaInput.value.trim();
        if (!text) return;
        try {
            await addDoc(ideasCollectionRef, { text, timestamp: new Date().toISOString(), status: 'nueva' });
            ideaInput.value = '';
        } catch (error) {
            console.error('Ideas: Error al guardar:', error);
            showTempMessage('No se pudo guardar la idea. Probá de nuevo.', 'error');
        }
    };
}
