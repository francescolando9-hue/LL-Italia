// Strumenti comuni dei collaudi.
//
// Qui dentro stanno anche le trappole già pagate: chi scrive un collaudo nuovo
// non deve ritrovarle da solo.
//
// 1. `page.waitForFunction` guarda se il valore restituito è VERO, e una
//    Promise è sempre vera: con un predicato `async` non aspetta niente e
//    misura uno stato a metà. Per le condizioni asincrone si usa `attendi()`,
//    che interroga la pagina da Node con `evaluate`, che invece le Promise le
//    risolve.
// 2. Simulare la rete assente col browser (`context.setOffline`) NON ferma le
//    richieste fatte dal service worker: un collaudo offline fatto così dà per
//    funzionante roba che offline non funziona. Per l'offline vero si SPEGNE
//    il server statico (`statico.chiudi()`).
// 3. Interrogare la cache mentre il service worker la sta riempiendo dà
//    fotografie incoerenti. Si aspetta che il precache sia completo, non che
//    la cache esista.
// 4bis. Il foglio di stile di un modulo si aggiunge a pagina già disegnata
//    (`assicuraStile()`): chi MISURA qualcosa — altezze, corpi, posizioni —
//    deve aspettare che sia applicato, altrimenti misura la sola shell e
//    legge numeri che a video non esistono mai. Si attende che
//    `document.styleSheets` contenga un foglio di `modules/`.
// 4. I contatori del giorno vivono in localStorage e le code in IndexedDB:
//    fra un sotto-collaudo e l'altro vanno azzerati, altrimenti un'attesa
//    risulta vera prima del tempo. `puliscine()` fa entrambe le cose, e
//    ricarica la pagina perché la cancellazione del database, se una
//    connessione è aperta, resta in sospeso e scatta dopo.
// 5. `node --check` su un file dell'app NON prova che il browser lo accetti:
//    lo controlla come script CommonJS e lascia passare errori che in un
//    modulo ES sono fatali. Il controllo giusto è
//    `node --input-type=module --check < file`. Trappola pagata il 18/09/2026
//    con un backtick dentro un commento HTML dentro un template literal: il
//    backtick chiude il template, il file diventa sintatticamente assurdo,
//    `node --check` dice ok, e il collaudo riporta soltanto «#fase non
//    visibile» — un sintomo che non somiglia in niente alla causa.

const http = require('http');
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const MATERIALE = path.join(__dirname, 'materiale');
const PORTA_APP = 8123;
const PORTA_FLOW = 8124;

const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// --- Server dell'app -------------------------------------------------------
// Serve il repo così com'è. Va spento a comando: è l'unico modo onesto di
// provare l'offline (trappola 2).
function avviaStatico(porta = PORTA_APP) {
  const server = http.createServer((req, res) => {
    const rotta = decodeURIComponent(String(req.url).split('?')[0]);
    let file = path.join(RADICE, rotta === '/' ? 'index.html' : rotta);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(RADICE) || !fs.existsSync(file)) { res.writeHead(404); res.end('non trovato'); return; }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise(risolvi => server.listen(porta, '127.0.0.1', () => risolvi({
    indirizzo: `http://127.0.0.1:${porta}`,
    chiudi: () => new Promise(r => server.close(r)),
  })));
}

// --- Flow finto ------------------------------------------------------------
// Riceve gli invii come farebbe Power Automate, e sa anche rifiutare: gli
// errori vanno provati, non immaginati.
function avviaFlow(porta = PORTA_FLOW) {
  // `deduplica` fa comportare il flow finto come quello vero: la guardia sui
  // duplicati riconosce un `idClient` già visto, risponde `200 gia_presente` e
  // NON crea un secondo file. Serve a «Rimanda la stessa», che esiste proprio
  // per farsi dire questo. Spenta per default: gli altri collaudi contano
  // `ricevuti` come «richieste arrivate» e non devono cambiare comportamento.
  const stato = { ricevuti: [], stato: 200, corpo: '', risposte: null, deduplica: false, giaPresenti: 0 };
  const gestore = (req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Content-Range',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    let corpo = '';
    req.on('data', p => { corpo += p; });
    req.on('end', () => {
      let dati = null;
      try { dati = JSON.parse(corpo); } catch { dati = { nonJson: corpo.length }; }
      const chiave = dati && dati.idClient;
      const giaVisto = stato.deduplica && chiave
        && stato.ricevuti.some(r => r && r.idClient === chiave);
      stato.ricevuti.push(dati);
      if (giaVisto) {
        stato.giaPresenti += 1;
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        res.end('{"esito":"gia_presente"}');
        return;
      }
      // `risposte` permette a un collaudo di decidere invio per invio.
      const scelta = typeof stato.risposte === 'function'
        ? stato.risposte(dati, stato.ricevuti.length) : stato.stato;
      res.writeHead(scelta, { ...cors, 'Content-Type': 'application/json' });
      res.end(stato.corpo || '{}');
    });
  };
  let server = http.createServer(gestore);
  const accendi = () => new Promise(r => server.listen(porta, '127.0.0.1', r));
  return accendi().then(() => ({
    stato,
    indirizzo: `http://127.0.0.1:${porta}`,
    endpoint: nome => `http://127.0.0.1:${porta}/${nome}?api-version=1`,
    azzera: () => { stato.ricevuti.length = 0; },
    // Senza campo non è irraggiungibile solo l'app: è irraggiungibile anche il
    // magazzino. Spegnere solo il server dell'app farebbe partire gli invii e
    // il collaudo offline direbbe una cosa per un'altra.
    sospendi: () => new Promise(r => server.close(r)),
    riprendi: () => { server = http.createServer(gestore); return accendi(); },
    chiudi: () => new Promise(r => server.close(r)),
  }));
}

// --- Browser ---------------------------------------------------------------
// La fotocamera finta serve al collaudo della fotocamera interna: senza, ogni
// `getUserMedia` fallisce e quel pezzo di app resterebbe non provato. Non
// cambia niente per gli altri collaudi, che la fotocamera non la aprono.
const ARGOMENTI = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];

async function apriBrowser() {
  const { chromium } = require('playwright');
  try {
    return await chromium.launch({ args: ARGOMENTI });
  } catch {
    return chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGOMENTI });
  }
}

// Telefono: viewport stretto, touch, e raccolta di TUTTI gli errori — un
// collaudo che passa lasciando errori in console non è passato.
// `opzioni` si passa a Playwright così com'è: serve per esempio a fissare il
// fuso del telefono (`timezoneId`), senza il quale un collaudo sulle ore
// darebbe risultati diversi a seconda di dove gira.
async function nuovoTelefono(browser, opzioni = {}) {
  const contesto = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...opzioni,
  });
  const pagina = await contesto.newPage();
  const errori = [];
  pagina.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  pagina.on('pageerror', e => errori.push('pageerror: ' + e.message));
  pagina.on('dialog', d => d.accept());
  return { contesto, pagina, errori };
}

// --- Attese ----------------------------------------------------------------
// L'attesa vera per le condizioni asincrone (trappola 1).
async function attendi(pagina, funzione, descrizione, limite = 60000, argomento) {
  const fine = Date.now() + limite;
  let ultimo;
  while (Date.now() < fine) {
    ultimo = await pagina.evaluate(funzione, argomento);
    if (ultimo) return ultimo;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Attesa scaduta (${descrizione})`);
}

// Service worker attivo E precache completo (trappola 3).
async function attendiInstallazione(pagina) {
  const attese = await pagina.evaluate(async () => {
    const testo = await (await fetch('./sw.js')).text();
    return testo.match(/const RISORSE = \[([\s\S]*?)\];/)[1]
      .split('\n').map(r => (r.match(/'([^']+)'/) || [])[1]).filter(Boolean).length;
  });
  await attendi(pagina, async quante => {
    const nome = (await caches.keys()).find(n => n.startsWith('llitalia-'));
    if (!nome) return false;
    const registrazione = await navigator.serviceWorker.getRegistration();
    if (!registrazione || !registrazione.active || !navigator.serviceWorker.controller) return false;
    return (await (await caches.open(nome)).keys()).length === quante;
  }, 'service worker attivo con precache completo', 90000, attese);
  return attese;
}

// --- Configurazione del telefono ------------------------------------------
async function configura(pagina, indirizzoApp, impostazioni = {}) {
  await pagina.goto(indirizzoApp + '/index.html');
  await pagina.evaluate(dati => {
    localStorage.setItem('llitalia.app', JSON.stringify(dati.app));
    if (dati.bolle) localStorage.setItem('llitalia.bolle', JSON.stringify(dati.bolle));
    if (dati.foto) localStorage.setItem('llitalia.foto', JSON.stringify(dati.foto));
  }, {
    app: { autore: 'Paolo Sanzarello', ...(impostazioni.app || {}) },
    // Come un telefono che la fase l'ha già scelta una volta, così negli altri
    // collaudi il campo viaggia pieno; il caso senza fase lo prova
    // 12-fase-e-barra.js.
    //
    // **Una fase SENZA livelli**, dalla 0.36.0: `Murature` pretende il piano,
    // e usarla qui bloccherebbe l'invio in tutti i collaudi che non hanno
    // niente a che fare coi livelli — che li misurerebbero invece della cosa
    // che provano. I livelli hanno il loro collaudo (15-livelli.js), dove la
    // fase si sceglie a mano.
    bolle: impostazioni.bolle ? { ultimaFase: 'Bonifica', ...impostazioni.bolle } : undefined,
    foto: impostazioni.foto ? { ultimaFase: 'Bonifica', ...impostazioni.foto } : undefined,
  });
}

// Riparte pulito: contatori del giorno e code svuotati (trappola 4).
async function puliscine(pagina, database = ['llitalia-bolle', 'llitalia-foto']) {
  await pagina.evaluate(nomi => {
    localStorage.clear();
    for (const nome of nomi) {
      const q = indexedDB.deleteDatabase(nome);
      q.onblocked = () => {};
    }
  }, database);
  await pagina.reload();
}

// --- Registro degli esiti --------------------------------------------------
// Il collaudo dice i numeri e poi dice se tornano: «verde» da solo non vale.
function creaRegistro(nome) {
  const righe = [];
  let falliti = 0;
  return {
    nome,
    titolo(testo) { righe.push(''); righe.push(`— ${testo}`); console.log(`\n— ${testo}`); },
    dice(etichetta, valore) {
      const riga = `   ${etichetta}: ${typeof valore === 'string' ? valore : JSON.stringify(valore)}`;
      righe.push(riga); console.log(riga);
    },
    controlla(descrizione, condizione, dettaglio = '') {
      if (!condizione) falliti += 1;
      const riga = `   ${condizione ? '✓' : '✗ FALLITO'} ${descrizione}${dettaglio ? ` — ${dettaglio}` : ''}`;
      righe.push(riga); console.log(riga);
      return Boolean(condizione);
    },
    // Un collaudo che passa lasciando errori in console non è passato.
    controllaConsole(errori, ammessi = []) {
      const veri = errori.filter(e => !ammessi.some(a => e.includes(a)));
      return this.controlla('nessun errore in console', veri.length === 0, veri.join(' | '));
    },
    get falliti() { return falliti; },
  };
}

function materiale(nome) {
  const file = path.join(MATERIALE, nome);
  if (!fs.existsSync(file)) {
    throw new Error(`Manca il materiale di prova "${nome}": esegui prima "node collaudi/materiale.js"`);
  }
  return file;
}

module.exports = {
  RADICE, MATERIALE, PORTA_APP, PORTA_FLOW,
  avviaStatico, avviaFlow, apriBrowser, nuovoTelefono,
  attendi, attendiInstallazione, configura, puliscine, creaRegistro, materiale,
};
