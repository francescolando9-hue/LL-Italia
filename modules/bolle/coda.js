// Coda offline del modulo Bolle su IndexedDB.
// Ogni foto è un record autonomo con un id client univoco (idempotenza lato server).
// Stati: bozza (scattata, non ancora confermata con Invia) → in_coda → invio → inviata;
// errore = invio fallito, resta in coda e si ritenta.

const NOME_DB = 'llitalia-bolle';
const VERSIONE_DB = 2;
const STORE = 'foto';
// Storico permanente degli invii confermati: solo dati, senza foto. Le foto
// pesano e vengono potate; il registro invece resta e permette di rispondere a
// "cosa ho mandato questa settimana" anche a distanza di mesi.
const STORE_STORICO = 'storico';
const CHIAVE_CONTATORI = 'llitalia.bolle.contatori';

let dbPromise = null;

function apri() {
  if (!dbPromise) {
    dbPromise = new Promise((risolvi, rifiuta) => {
      const richiesta = indexedDB.open(NOME_DB, VERSIONE_DB);
      richiesta.onupgradeneeded = () => {
        const db = richiesta.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('stato', 'stato');
          store.createIndex('creatoIl', 'creatoIl');
        }
        if (!db.objectStoreNames.contains(STORE_STORICO)) {
          const storico = db.createObjectStore(STORE_STORICO, { keyPath: 'idClient' });
          storico.createIndex('inviatoIl', 'inviatoIl');
        }
      };
      richiesta.onsuccess = () => risolvi(richiesta.result);
      richiesta.onerror = () => rifiuta(richiesta.error);
    });
  }
  return dbPromise;
}

function transazione(nomeStore, modo, operazione) {
  return apri().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(nomeStore, modo);
    const store = tx.objectStore(nomeStore);
    let risultato;
    try {
      risultato = operazione(store);
    } catch (errore) {
      rifiuta(errore);
      return;
    }
    tx.oncomplete = () => risolvi(risultato && 'result' in risultato ? risultato.result : risultato);
    tx.onerror = () => rifiuta(tx.error);
    tx.onabort = () => rifiuta(tx.error);
  }));
}

// Timestamp del dispositivo in formato ISO con fuso locale (es. 2026-09-01T12:41:07+02:00).
export function timestampDispositivo(data = new Date()) {
  const scarto = -data.getTimezoneOffset();
  const segno = scarto >= 0 ? '+' : '-';
  const p = n => String(Math.abs(n)).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}` +
    `T${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}` +
    `${segno}${p(Math.floor(Math.abs(scarto) / 60))}:${p(Math.abs(scarto) % 60)}`;
}

// La foto entra in IndexedDB già allo scatto (stato bozza): non si perde
// nemmeno se l'app viene chiusa prima di premere Invia.
export function aggiungiBozza(fotoBlob, nomeOriginale) {
  const record = {
    id: crypto.randomUUID(),
    stato: 'bozza',
    cantiere: '',
    autore: '',
    foto: fotoBlob,
    nome: nomeOriginale || '',
    timestampDispositivo: timestampDispositivo(),
    creatoIl: Date.now(),
    tentativi: 0,
    ultimoErrore: '',
    inviatoIl: null,
    idServer: null,
  };
  return transazione(STORE, 'readwrite', store => store.add(record)).then(() => record);
}

export function elenca() {
  return transazione(STORE, 'readonly', store => store.getAll())
    .then(record => record.sort((a, b) => a.creatoIl - b.creatoIl));
}

export function aggiorna(record) {
  return transazione(STORE, 'readwrite', store => store.put(record));
}

export function elimina(id) {
  return transazione(STORE, 'readwrite', store => store.delete(id));
}

// Invia: tutte le bozze passano in coda con cantiere e autore correnti.
export async function confermaBozze(cantiere, autore) {
  const bozze = (await elenca()).filter(r => r.stato === 'bozza');
  for (const record of bozze) {
    record.stato = 'in_coda';
    record.cantiere = cantiere;
    record.autore = autore;
    await aggiorna(record);
  }
  return bozze.length;
}

// Le foto inviate restano consultabili: si conservano le ultime N, le più
// vecchie si eliminano (la conferma del server è già arrivata).
export async function potaInviate(conservaUltime) {
  const inviate = (await elenca()).filter(r => r.stato === 'inviata');
  const daEliminare = inviate.slice(0, Math.max(0, inviate.length - conservaUltime));
  for (const record of daEliminare) {
    await elimina(record.id);
  }
  return daEliminare.length;
}

// Contatori del giorno per il collaudo sui numeri (scattate = confermate con Invia).
function giornoOggi() {
  return new Date().toLocaleDateString('sv-SE');
}

export function contatoriOggi() {
  let dati;
  try {
    dati = JSON.parse(localStorage.getItem(CHIAVE_CONTATORI)) || {};
  } catch {
    dati = {};
  }
  if (dati.giorno !== giornoOggi()) {
    dati = { giorno: giornoOggi(), scattate: 0, inviate: 0 };
  }
  return dati;
}

function salvaContatori(dati) {
  localStorage.setItem(CHIAVE_CONTATORI, JSON.stringify(dati));
}

export function incrementaScattate(quante) {
  const dati = contatoriOggi();
  dati.scattate += quante;
  salvaContatori(dati);
}

export function incrementaInviate(quante) {
  const dati = contatoriOggi();
  dati.inviate += quante;
  salvaContatori(dati);
}

// --- Storico degli invii confermati -----------------------------------------

// Chiamata quando il server conferma: la riga resta anche dopo che la foto è
// stata potata dal dispositivo.
export function registraInvio(record) {
  return transazione(STORE_STORICO, 'readwrite', store => store.put({
    idClient: record.id,
    commessa: record.cantiere,
    operatore: record.autore,
    dataInvio: record.timestampDispositivo,
    inviatoIl: record.inviatoIl || Date.now(),
  }));
}

// Ordine cronologico decrescente: l'ultimo invio in cima.
export function elencaStorico() {
  return transazione(STORE_STORICO, 'readonly', store => store.getAll())
    .then(righe => righe.sort((a, b) => b.inviatoIl - a.inviatoIl));
}

// Recupero delle foto già confermate prima dell'introduzione dello storico:
// si eseguono una volta sola, poi le righe esistono già.
export async function allineaStorico() {
  const inviate = (await elenca()).filter(r => r.stato === 'inviata');
  if (inviate.length === 0) return 0;
  const noti = new Set((await elencaStorico()).map(r => r.idClient));
  let aggiunte = 0;
  for (const record of inviate) {
    if (noti.has(record.id)) continue;
    await registraInvio(record);
    aggiunte += 1;
  }
  return aggiunte;
}
