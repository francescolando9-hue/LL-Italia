// Service worker della shell: precache dell'app, cache-first, fallback offline.
const VERSIONE = '0.10.0';
const CACHE = `llitalia-${VERSIONE}`;
const RISORSE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './core/ui.css',
  './core/app.js',
  './core/router.js',
  './core/home.js',
  './core/impostazioni.js',
  './core/informazioni.js',
  './modules/bolle/index.js',
  './modules/bolle/bolle.css',
  './modules/bolle/coda.js',
  './modules/bolle/immagini.js',
  './modules/bolle/impostazioni.js',
  './modules/bolle/cantieri.js',
  './modules/bolle/invio.js',
  './modules/bolle/vista-impostazioni.js',
  './modules/bolle/storico.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(RISORSE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(request, { ignoreSearch: true }).then(inCache => {
      if (inCache) return inCache;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
