// Coda offline del modulo Segnalazioni su IndexedDB.
//
// Ogni elemento è un PASSO di una segnalazione — apertura, passaggio, chiusura,
// riapertura — con il suo `id`, che viaggia come `idClient`: il flow ci fa la
// guardia sui doppioni. La segnalazione ha un suo identificativo,
// `idSegnalazione`, che l'app crea all'apertura e ripete in ogni passo: così un
// passaggio fatto senza rete, su una segnalazione aperta anche lei senza rete,
// sa già a chi si riferisce prima che il server le dia un numero.
//
// Stati: in_coda → invio → inviata; errore = invio fallito, resta in coda e si
// ritenta. Il motore è quello della shell (`core/coda-invio.js`).
//
// I passi partono nell'ordine in cui sono stati fatti (`creatoIl`): l'apertura
// prima del passaggio che la segue. Se l'apertura non è ancora arrivata, il
// passaggio riceve «segnalazione sconosciuta», resta in errore e si riprova.

import { timestampDispositivo } from '../../core/orario.js';
import { segnaIngressoInCoda } from '../../core/coda-invio.js';

const NOME_DB = 'llitalia-segnalazioni';
const VERSIONE_DB = 1;
const STORE = 'passi';
const CHIAVE_CONTATORI = 'llitalia.segnalazioni.contatori';

let dbPromise = null;

function apri() {
  if (!dbPromise) {
    dbPromise = new Promise((risolvi, rifiuta) => {
      const richiesta = indexedDB.open(NOME_DB, VERSIONE_DB);
      richiesta.onupgradeneeded = () => {
        const db = richiesta.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('creatoIl', 'creatoIl');
          store.createIndex('idSegnalazione', 'idSegnalazione');
        }
      };
      richiesta.onsuccess = () => risolvi(richiesta.result);
      richiesta.onerror = () => rifiuta(richiesta.error);
    });
  }
  return dbPromise;
}

function transazione(modo, operazione) {
  return apri().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(STORE, modo);
    const store = tx.objectStore(STORE);
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

// Un passo nuovo entra direttamente in coda: non c'è una bozza da confermare,
// perché il passo nasce già dal tocco su «Invia», «Passa» o «Chiudi».
export function accoda(dati) {
  const ora = Date.now();
  const record = segnaIngressoInCoda({
    id: crypto.randomUUID(),
    idSegnalazione: dati.idSegnalazione || crypto.randomUUID(),
    azione: dati.azione,
    autore: dati.autore,
    passaA: dati.passaA || '',
    testo: dati.testo || '',
    commessa: dati.commessa || '',
    ambito: dati.ambito || '',
    piano: dati.piano || '',
    unita: dati.unita || '',
    parteComune: dati.parteComune || '',
    foto: Array.isArray(dati.foto) ? dati.foto : [],
    dataIntervento: timestampDispositivo(),
    stato: 'in_coda',
    creatoIl: ora,
    tentativi: 0,
    ultimoErrore: '',
    inviatoIl: null,
    idRiga: null,
    esitoServer: '',
  }, ora);
  return transazione('readwrite', store => store.add(record)).then(() => {
    incrementa('fatti', 1);
    return record;
  });
}

export function elenca() {
  return transazione('readonly', store => store.getAll())
    .then(record => record.sort((a, b) => a.creatoIl - b.creatoIl));
}

export function aggiorna(record) {
  return transazione('readwrite', store => store.put(record));
}

export function elimina(id) {
  return transazione('readwrite', store => store.delete(id));
}

// Dopo la conferma del server le foto non servono più sul telefono: stanno
// negli allegati della segnalazione. Dei passi inviati si tengono gli ultimi N,
// senza foto, perché la scheda li mostri finché l'elenco non li riporta.
export async function potaInviate(conserva = 20) {
  const inviati = (await elenca()).filter(r => r.stato === 'inviata');
  for (const record of inviati) {
    if (record.foto && record.foto.length > 0) {
      record.numeroFotoInviate = record.foto.length;
      record.foto = [];
      await aggiorna(record);
    }
  }
  const daTogliere = inviati
    .filter(r => !r.esitoServer || r.esitoServer === 'ok' || r.esitoServer === 'gia_presente')
    .slice(0, Math.max(0, inviati.length - conserva));
  for (const record of daTogliere) await elimina(record.id);
}

// --- Contatori del giorno, per la pagina Informazioni -----------------------

function oggi() {
  return timestampDispositivo().slice(0, 10);
}

function leggiContatori() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE_CONTATORI)) || {};
    return dati.giorno === oggi() ? dati : { giorno: oggi(), fatti: 0, inviati: 0 };
  } catch {
    return { giorno: oggi(), fatti: 0, inviati: 0 };
  }
}

function incrementa(campo, quanti) {
  const dati = leggiContatori();
  dati[campo] = (dati[campo] || 0) + quanti;
  try {
    localStorage.setItem(CHIAVE_CONTATORI, JSON.stringify(dati));
  } catch {
    // Un contatore non salvato non fa perdere niente.
  }
}

export function incrementaInviate(quanti = 1) {
  incrementa('inviati', quanti);
}

export function contatoriOggi() {
  const dati = leggiContatori();
  return { scattate: dati.fatti || 0, inviate: dati.inviati || 0 };
}
