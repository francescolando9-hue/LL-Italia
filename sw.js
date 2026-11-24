// Service worker della shell: precache dell'app, cache-first, fallback offline.
// Da cambiare a ogni rilascio INSIEME a VERSIONE_CODICE in core/versione.js:
// quella dice cosa sta girando, questa cosa è installato, e l'app avvisa
// quando non coincidono.
const VERSIONE = '0.45.0';
const CACHE = `llitalia-${VERSIONE}`;
// Il decodificatore HEIC (circa 2 MB, `core/vendor/libheif/`) sta in una cache a
// parte, col numero della SUA versione e non quello dell'app: non si riscarica a
// ogni rilascio, e non c'entra con il precache «tutto o niente» di qui sopra.
// Il nome NON comincia con `llitalia-`, così chi cerca la cache dell'app non
// trova questa. **Si riempie solo alla prima richiesta** (la prima foto HEIC che
// il browser non disegna da sé): l'installazione non la scarica, perché sono 2 MB
// che la maggior parte degli operatori non userebbe mai, e un download lento non
// deve tenere fermo l'aggiornamento dell'app.
const CACHE_HEIC = 'libreria-heic-1.23.5';
const PERCORSO_HEIC = '/core/vendor/libheif/';
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
  './core/operatori.js',
  './core/endpoint.js',
  './core/fotocamera.js',
  './core/dispositivo.js',
  './core/errori.js',
  './core/orario.js',
  './core/exif.js',
  './core/byte.js',
  './core/heic.js',
  './core/fasi.js',
  './core/anagrafica.js',
  './core/coda-invio.js',
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
  './modules/segnalazioni/index.js',
  './modules/segnalazioni/segnalazioni.css',
  './modules/segnalazioni/coda.js',
  './modules/segnalazioni/invio.js',
  './modules/segnalazioni/impostazioni.js',
  './modules/segnalazioni/configurazione.js',
  './modules/segnalazioni/dettatura.js',
  './modules/segnalazioni/immagini.js',
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
      .then(chiavi => Promise.all(chiavi
        .filter(c => (c.startsWith('llitalia-') && c !== CACHE) || (c.startsWith('libreria-heic-') && c !== CACHE_HEIC))
        .map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.includes(PERCORSO_HEIC)) {
    evento.respondWith(caches.open(CACHE_HEIC).then(async cache => {
      const inCache = await cache.match(request, { ignoreSearch: true });
      if (inCache) return inCache;
      try {
        const risposta = await fetch(request);
        if (risposta.ok) await cache.put(request.url.split('?')[0], risposta.clone());
        return risposta;
      } catch {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    }));
    return;
  }
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
