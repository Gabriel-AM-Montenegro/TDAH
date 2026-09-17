// Cache básico del "shell" (HTML/CSS/JS/íconos), red primero con timeout corto
// y cache como respaldo — mismo patrón que NeuroKit (public/service-worker.js),
// sin backend acá así que no hay nada de Firestore/push que excluir.
const CACHE_NAME = 'emociones-shell-v3';
const NETWORK_TIMEOUT_MS = 3000;

function fetchWithTimeout(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('network timeout')), timeoutMs);
        fetch(url, { cache: 'no-store' }).then(
            (response) => { clearTimeout(timer); resolve(response); },
            (error) => { clearTimeout(timer); reject(error); }
        );
    });
}

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

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
            try {
                const response = await fetchWithTimeout(request.url, NETWORK_TIMEOUT_MS);
                if (response.ok) cache.put(request, response.clone());
                return response;
            } catch (error) {
                const cached = await cache.match(request);
                return cached || fetch(request);
            }
        })
    );
});
