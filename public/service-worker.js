// =================================================================================
// SERVICE WORKER: cache básico del "shell" de la app (HTML/CSS/JS/íconos) para
// que cargue instantáneo y ande con mala señal. A propósito SIN lista de
// archivos a precachear (sería frágil de mantener con tantos módulos JS) —
// en cambio, cachea de forma incremental cada GET del mismo origen que pasa
// por acá, con estrategia "stale-while-revalidate": responde con lo cacheado
// al toque si existe, y actualiza el cache en segundo plano para la próxima.
//
// Deliberadamente NO cachea nada fuera del propio origen (Firestore, Trello,
// Google Calendar/Identity Services) — esos siempre van a la red, para no
// servir datos ni tokens viejos.
// =================================================================================
const CACHE_NAME = 'neurokit-shell-v5';

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

// A propósito NO se llama a skipWaiting() automáticamente en "install": un
// service worker actualizado se queda en estado "waiting" hasta que la app
// (ver main.js) le pide activarse, para poder avisarle antes al usuario con
// un cartel de "hay una actualización" en vez de cambiar el contenido de
// golpe debajo suyo. Un primer registro (sin ningún worker controlando la
// página todavía) se activa solo, sin necesitar este mensaje.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const networkFetch = fetch(request)
                .then((response) => {
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});
