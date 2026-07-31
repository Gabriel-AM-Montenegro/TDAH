// =================================================================================
// BLOG Y NUTRICIÓN: carga de contenido de solo lectura desde Firestore
// =================================================================================
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';
import { renderEmptyState } from '../ui.js';

const TRUNCATE_LENGTH = 120;

function buildArticleCard(item) {
    const isRecipe = item.type === 'recipe';
    const card = document.createElement('div');
    card.className = isRecipe ? 'blog-article-card recipe-card' : 'blog-article-card';

    const h4 = document.createElement('h4');
    h4.textContent = item.title;
    card.appendChild(h4);

    const p = document.createElement('p');
    const fullText = item.content || '';
    const isLong = fullText.length > TRUNCATE_LENGTH;
    const truncatedText = isLong ? `${fullText.slice(0, TRUNCATE_LENGTH).trimEnd()}…` : fullText;

    const textSpan = document.createElement('span');
    textSpan.textContent = truncatedText;
    p.appendChild(textSpan);

    if (isLong) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'read-more-btn';
        toggleBtn.textContent = 'Leer más';
        let expanded = false;
        toggleBtn.onclick = () => {
            expanded = !expanded;
            textSpan.textContent = expanded ? fullText : truncatedText;
            toggleBtn.textContent = expanded ? 'Leer menos' : 'Leer más';
        };
        p.appendChild(document.createTextNode(' '));
        p.appendChild(toggleBtn);
    }
    card.appendChild(p);

    const small = document.createElement('small');
    small.textContent = isRecipe ? `🍳 ${item.source}` : `Fuente: ${item.source}`;
    card.appendChild(small);

    if (item.url) {
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'article-link';
        link.textContent = 'Leer Más ↗';
        card.appendChild(link);
    }

    return card;
}

function createContentLoader(collectionRef, contentDivId, refreshBtnId, emptyMessage) {
    const contentDiv = document.getElementById(contentDivId);
    const refreshBtn = document.getElementById(refreshBtnId);
    if (!contentDiv || !refreshBtn) return;

    const loadContent = async () => {
        contentDiv.innerHTML = '<p>Cargando...</p>';
        try {
            const q = query(collectionRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                renderEmptyState(contentDiv, { message: emptyMessage, tag: 'div' });
                return;
            }
            contentDiv.innerHTML = '';
            snapshot.docs.forEach(docSnap => contentDiv.appendChild(buildArticleCard(docSnap.data())));
        } catch (error) {
            console.error(`Error al cargar ${contentDivId}:`, error);
            contentDiv.innerHTML = `<p class="empty-section-message">Error al cargar contenido. Es posible que falte un índice en Firestore. Revisa la consola para más detalles.</p>`;
        }
    };
    refreshBtn.onclick = loadContent;
    loadContent();
}

export function initBlog(db) {
    const blogArticlesCollectionRef = collection(db, 'artifacts', publicDataDocId, 'blogArticles');
    createContentLoader(
        blogArticlesCollectionRef, 'blog-content', 'refresh-blog-btn',
        'Todavía no hay artículos cargados. Volvé a intentarlo más tarde.'
    );
}

export function initNutricion(db) {
    const nutricionCollectionRef = collection(db, 'artifacts', publicDataDocId, 'public', 'data', 'nutritionContent');
    createContentLoader(
        nutricionCollectionRef, 'nutricion-content', 'refresh-nutricion-btn',
        'Todavía no hay contenido de nutrición cargado. Volvé a intentarlo más tarde.'
    );
}
