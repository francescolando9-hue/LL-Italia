// Service worker della shell: precache dell'app, cache-first, fallback offline.
// Da cambiare a ogni rilascio INSIEME a VERSIONE_CODICE in core/versione.js:
// quella dice cosa sta girando, questa cosa è installato, e l'app avvisa
// quando non coincidono.
const VERSIONE = '0.26.0';
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
  './core/versione.js',
  './core/cantieri.js',
  './core/endpoint.js',
  './core/fotocamera.js',
  './core/dispositivo.js',
  './core/errori.js',
  './core/configurazione-link.js',
  './core/vendor/qrcode.mjs',
  './modules/bolle/index.js',
  './modules/bolle/bolle.css',
  './modules/bolle/coda.js',
  './modules/bolle/immagini.js',
  './modules/bolle/impostazioni.js',
  './modules/bolle/invio.js',
  './modules/bolle/vista-impostazioni.js',
  './modules/bolle/configurazione.js',
  './modules/bolle/storico.js',
  './modules/foto/index.js',
  './modules/foto/foto.css',
  './modules/foto/coda.js',
  './modules/foto/immagini.js',
  './modules/foto/video.js',
  './modules/foto/caricamento.js',
  './modules/foto/impostazioni.js',
  './modules/foto/categorie.js',
  './modules/foto/invio.js',
  './modules/foto/vista-impostazioni.js',
  './modules/foto/configurazione.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(riempi)
      .then(() => self.skipWaiting())
  );
});

// Il precache non usa `cache.addAll` perché quello passa dalla cache HTTP del
// browser: una versione nuova rischia di riempire la propria cache con i file
// della precedente, e il risultato è un'app che dichiara una versione ed
// esegue quella prima — senza alcun segnale, e stabile fino al rilascio dopo.
// Qui ogni risorsa si chiede con `cache: 'reload'` (salta la cache HTTP) e con
// la versione in coda all'indirizzo (salta anche la cache di GitHub Pages),
// ma si archivia sotto l'indirizzo pulito, che è quello che la pagina chiede.
function riempi(cache) {
  return Promise.all(RISORSE.map(async indirizzo => {
    const separatore = indirizzo.includes('?') ? '&' : '?';
    const risposta = await fetch(`${indirizzo}${separatore}v=${VERSIONE}`, { cache: 'reload' });
    if (!risposta.ok) {
      // Tutto o niente: una cache a metà è peggio di nessuna cache, perché
      // l'app sembra installata e si rompe offline su una risorsa a caso.
      throw new Error(`Precache fallito su ${indirizzo}: ${risposta.status}`);
    }
    await cache.put(indirizzo, risposta);
  }));
}

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
  // Si guarda SOLO nella cache di questa versione, non in tutte: durante un
  // aggiornamento le cache coesistono per qualche istante, e `caches.match`
  // senza nome le percorre tutte — poteva quindi servire alla pagina un file
  // della versione precedente, mettendo in esecuzione un misto delle due.
  evento.respondWith(
    caches.open(CACHE).then(cache => cache.match(request, { ignoreSearch: true }).then(inCache => {
      if (inCache) return inCache;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return cache.match('./index.html');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    }))
  );
});
