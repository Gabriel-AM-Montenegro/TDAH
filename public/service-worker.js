// =================================================================================
// SERVICE WORKER: cache básico del "shell" de la app (HTML/CSS/JS/íconos) para
// que cargue instantáneo y ande con mala señal. A propósito SIN lista de
// archivos a precachear (sería frágil de mantener con tantos módulos JS) —
// en cambio, cachea de forma incremental cada GET del mismo origen que pasa
// por acá.
//
// Estrategia "red primero, cache como respaldo" (con timeout corto para no
// perder el "ande con mala señal"): antes era stale-while-revalidate (cache
// al toque, red en segundo plano), pero eso significaba que abrir una
// pestaña nueva en Safari mostraba contenido viejo hasta la SIGUIENTE vez
// que se abriera — pasó de verdad con un deploy real (el usuario cerró y
// reabrió la pestaña y vio el nav de antes de mover Calendario a
// "Organizar"). Con conexión normal, siempre se ve la versión real.
//
// Deliberadamente NO cachea nada fuera del propio origen (Firestore, Trello,
// Google Calendar/Identity Services) — esos siempre van a la red, para no
// servir datos ni tokens viejos.
// =================================================================================
const CACHE_NAME = 'neurokit-shell-v15';
const NETWORK_TIMEOUT_MS = 3000;

// `{ cache: 'no-store' }` es clave acá: Firebase Hosting sirve los archivos
// estáticos con Cache-Control: max-age=3600, así que un fetch() común puede
// quedar satisfecho con la copia local del navegador sin llegar a preguntarle
// al servidor — "red primero" no serviría de nada si la "red" en realidad es
// el cache HTTP del navegador. Forzar 'no-store' hace que cada request pase
// de verdad por la red (real, encontrado probando el fix de un typo en
// firebaseConfig: el archivo ya estaba corregido en el servidor pero el
// navegador lo seguía sirviendo viejo de su propio cache).
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
