// Coda offline del modulo Segnalazioni su IndexedDB.
//
// Ogni elemento è un PASSO di una segnalazione — apertura, passaggio, chiusura,
// riapertura — con il suo `id`, che viaggia come `idClient`: il server ci fa la
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
//
// Dalla 0.44.0 le foto non viaggiano dentro il passo: il passo parte senza
// foto, e ogni foto è un elemento suo, con l'azione `foto` (decisione di
// Francesco del 20/11/2026: «numero libero», una foto per richiesta). Ogni foto
// porta autore e `dataIntervento` del passo a cui appartiene e il suo
// `idClient` in `idPasso`. Passo e foto entrano in coda **in una transazione
// sola**: o ci sono tutti o non c'è niente — con la memoria piena non resta un
// passo senza le sue foto, né foto senza il loro passo. `creatoIl` sale di un
// millisecondo per elemento, così il motore li manda nell'ordine giusto: prima
// il passo, poi le foto nell'ordine in cui sono state scelte.
export const AZIONE_FOTO = 'foto';

function nuovoRecord(campi, ora) {
  return segnaIngressoInCoda({
    stato: 'in_coda',
    creatoIl: ora,
    tentativi: 0,
    ultimoErrore: '',
    inviatoIl: null,
    idRiga: null,
    esitoServer: '',
    ...campi,
  }, ora);
}

export function accoda(dati) {
  const ora = Date.now();
  const passo = nuovoRecord({
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
    foto: [],
    dataIntervento: timestampDispositivo(),
  }, ora);
  const foto = (Array.isArray(dati.foto) ? dati.foto : []).map((blob, i) => nuovoRecord({
    id: crypto.randomUUID(),
    idSegnalazione: passo.idSegnalazione,
    azione: AZIONE_FOTO,
    idPasso: passo.id,
    azionePasso: passo.azione,
    autore: passo.autore,
    commessa: passo.commessa,
    dataIntervento: passo.dataIntervento,
    foto: [blob],
  }, ora + i + 1));
  return transazione('readwrite', store => {
    store.add(passo);
    for (const f of foto) store.add(f);
  }).then(() => {
    incrementa('fatti', 1);
    if (foto.length > 0) incrementa('foto', foto.length);
    passo.fotoAccodate = foto.length;
    return passo;
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
  const arrivato = r => !r.esitoServer || r.esitoServer === 'ok' || r.esitoServer === 'gia_presente';
  // Le foto arrivate non servono più al telefono (la storia le legge dal
  // server) e non devono spingere fuori i passi: si tolgono subito. Dei passi
  // si tengono gli ultimi N, come prima della 0.44.0.
  const passi = inviati.filter(r => r.azione !== AZIONE_FOTO);
  const daTogliere = [
    ...inviati.filter(r => r.azione === AZIONE_FOTO && arrivato(r)),
    ...passi.filter(arrivato).slice(0, Math.max(0, passi.length - conserva)),
  ];
  for (const record of daTogliere) await elimina(record.id);
}

// --- Contatori del giorno, per la pagina Informazioni -----------------------

function oggi() {
  return timestampDispositivo().slice(0, 10);
}

function leggiContatori() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE_CONTATORI)) || {};
    return dati.giorno === oggi() ? dati : { giorno: oggi(), fatti: 0, inviati: 0, foto: 0, fotoInviate: 0 };
  } catch {
    return { giorno: oggi(), fatti: 0, inviati: 0, foto: 0, fotoInviate: 0 };
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

// Il motore della shell chiama questa funzione per ogni elemento arrivato, e
// non sa se è un passo o una foto. Le foto le conta a parte `segnaInviato`
// (invio.js), che le marca `nonContare` per il motore: una foto non è un passo
// (specifica 0.44.0, §1), e i passi restano contati come prima.
export function incrementaInviate(quanti = 1) {
  incrementa('inviati', quanti);
}

export function incrementaFotoInviate(quante = 1) {
  incrementa('fotoInviate', quante);
}

export function contatoriOggi() {
  const dati = leggiContatori();
  return {
    scattate: dati.fatti || 0, inviate: dati.inviati || 0,
    foto: dati.foto || 0, fotoInviate: dati.fotoInviate || 0,
  };
}
