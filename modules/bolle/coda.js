// Coda offline del modulo Bolle su IndexedDB.
// Ogni foto è un record autonomo con un id client univoco (idempotenza lato server).
// Stati: bozza (scattata, non ancora confermata con Invia) → in_coda → invio → inviata;
// errore = invio fallito, resta in coda e si ritenta.

const NOME_DB = 'llitalia-bolle';
const VERSIONE_DB = 3;
const STORE = 'foto';
// Storico permanente degli invii confermati: solo dati, senza foto. Le foto
// pesano e vengono potate; il registro invece resta e permette di rispondere a
// "cosa ho mandato questa settimana" anche a distanza di mesi.
const STORE_STORICO = 'storico';
// Miniature separate dalle righe: l'elenco resta leggero perché non carica le
// immagini, che si leggono una alla volta quando la bolla viene aperta.
const STORE_MINIATURE = 'miniature';
const MINIATURE_DA_CONSERVARE = 300;
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
        let storico;
        if (!db.objectStoreNames.contains(STORE_STORICO)) {
          storico = db.createObjectStore(STORE_STORICO, { keyPath: 'idClient' });
          storico.createIndex('inviatoIl', 'inviatoIl');
        } else {
          storico = richiesta.transaction.objectStore(STORE_STORICO);
        }
        if (!storico.indexNames.contains('impronta')) {
          storico.createIndex('impronta', 'impronta');
        }
        if (!db.objectStoreNames.contains(STORE_MINIATURE)) {
          db.createObjectStore(STORE_MINIATURE, { keyPath: 'idClient' })
            .createIndex('inviatoIl', 'inviatoIl');
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
export function aggiungiBozza(fotoBlob, nomeOriginale, miniatura = null, impronta = '', qualita = 'ok', motivoQualita = '') {
  const record = {
    id: crypto.randomUUID(),
    stato: 'bozza',
    cantiere: '',
    autore: '',
    foto: fotoBlob,
    miniatura,
    impronta,
    qualita,
    motivoQualita,
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

// Chiamata quando il server conferma: riga e miniatura restano anche dopo che
// la foto a piena risoluzione è stata potata dal dispositivo.
export async function registraInvio(record) {
  await transazione(STORE_STORICO, 'readwrite', store => store.put({
    idClient: record.id,
    commessa: record.cantiere,
    operatore: record.autore,
    dataInvio: record.timestampDispositivo,
    inviatoIl: record.inviatoIl || Date.now(),
    impronta: record.impronta || '',
  }));
  if (record.miniatura) {
    await transazione(STORE_MINIATURE, 'readwrite', store => store.put({
      idClient: record.id,
      blob: record.miniatura,
      inviatoIl: record.inviatoIl || Date.now(),
    }));
    await potaMiniature();
  }
}

// Ordine cronologico decrescente: l'ultimo invio in cima. Non carica immagini.
export function elencaStorico() {
  return transazione(STORE_STORICO, 'readonly', store => store.getAll())
    .then(righe => righe.sort((a, b) => b.inviatoIl - a.inviatoIl));
}

export function leggiMiniatura(idClient) {
  return transazione(STORE_MINIATURE, 'readonly', store => store.get(idClient))
    .then(riga => (riga ? riga.blob : null));
}

// Tetto alle miniature conservate: le righe più vecchie restano nell'elenco,
// ma senza immagine. Evita che lo storico cresca senza limite sul telefono.
export async function potaMiniature() {
  const righe = await transazione(STORE_MINIATURE, 'readonly', store => store.getAll());
  if (righe.length <= MINIATURE_DA_CONSERVARE) return 0;
  const daEliminare = righe
    .sort((a, b) => a.inviatoIl - b.inviatoIl)
    .slice(0, righe.length - MINIATURE_DA_CONSERVARE);
  for (const riga of daEliminare) {
    await transazione(STORE_MINIATURE, 'readwrite', store => store.delete(riga.idClient));
  }
  return daEliminare.length;
}

// Riconosce la stessa identica immagine già presente: stesso file scelto due
// volte dalla galleria ha la stessa impronta. Cerca sia tra le foto ancora in
// coda sia tra quelle già inviate.
export async function cercaPerImpronta(impronta) {
  if (!impronta) return null;
  const suDispositivo = (await elenca()).find(r => r.impronta === impronta);
  if (suDispositivo) {
    const dove = { bozza: 'bozza', inviata: 'inviata' }[suDispositivo.stato] || 'coda';
    return {
      dove,
      commessa: suDispositivo.cantiere,
      dataInvio: suDispositivo.timestampDispositivo,
    };
  }
  const righe = await transazione(STORE_STORICO, 'readonly', store => store.getAll());
  const inviata = righe
    .filter(r => r.impronta === impronta)
    .sort((a, b) => b.inviatoIl - a.inviatoIl)[0];
  if (!inviata) return null;
  return { dove: 'inviata', commessa: inviata.commessa, dataInvio: inviata.dataInvio };
}

// Recupero delle foto già confermate prima dell'introduzione dello storico:
// si esegue una volta sola, poi le righe esistono già.
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
