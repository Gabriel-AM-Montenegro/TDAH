// =================================================================================
// BLOG Y NUTRICIÓN: carga de contenido de solo lectura desde Firestore
// =================================================================================
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { publicDataDocId } from '../firebase.js';

function createContentLoader(collectionRef, contentDivId, refreshBtnId) {
    const contentDiv = document.getElementById(contentDivId);
    const refreshBtn = document.getElementById(refreshBtnId);
    if (!contentDiv || !refreshBtn) return;

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
}

export function initBlog(db) {
    const blogArticlesCollectionRef = collection(db, 'artifacts', publicDataDocId, 'blogArticles');
    createContentLoader(blogArticlesCollectionRef, 'blog-content', 'refresh-blog-btn');
}

export function initNutricion(db) {
    const nutricionCollectionRef = collection(db, 'artifacts', publicDataDocId, 'public', 'data', 'nutritionContent');
    createContentLoader(nutricionCollectionRef, 'nutricion-content', 'refresh-nutricion-btn');
}
