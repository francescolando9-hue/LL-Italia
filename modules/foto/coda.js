// Coda offline del modulo Foto su IndexedDB, database separato da quello delle
// bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
// Stati: bozza (scattata, non ancora confermata con Invia) → in_coda → invio →
// inviata; errore = invio fallito, resta in coda e si ritenta.
//
// Più semplice della coda delle bolle, di proposito: qui non servono lo storico
// permanente, le miniature conservate, il progressivo. Una foto di cantiere che
// non arriva si riscatta; una bolla di consegna no, e per quella esiste il
// controllo di continuità.

const NOME_DB = 'llitalia-foto';
const VERSIONE_DB = 1;
const STORE = 'foto';
const CHIAVE_CONTATORI = 'llitalia.foto.contatori';

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
    let risultato;
    try {
      risultato = operazione(tx.objectStore(STORE));
    } catch (errore) {
      rifiuta(errore);
      return;
    }
    tx.oncomplete = () => risolvi(risultato && 'result' in risultato ? risultato.result : risultato);
    tx.onerror = () => rifiuta(tx.error);
    tx.onabort = () => rifiuta(tx.error);
  }));
}

// Timestamp del dispositivo in ISO con fuso locale: è l'ora dello scatto, non
// quella di arrivo sul server, che per una foto accodata offline è un'altra.
export function timestampDispositivo(data = new Date()) {
  const scarto = -data.getTimezoneOffset();
  const segno = scarto >= 0 ? '+' : '-';
  const p = n => String(Math.abs(n)).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}` +
    `T${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}` +
    `${segno}${p(Math.floor(Math.abs(scarto) / 60))}:${p(Math.abs(scarto) % 60)}`;
}

// La foto entra in IndexedDB già allo scatto: non si perde nemmeno se l'app
// viene chiusa prima di premere Invia.
export function aggiungiBozza(fotoBlob, anteprima, nomeOriginale, tipo) {
  const record = {
    id: crypto.randomUUID(),
    stato: 'bozza',
    tipo,
    commessa: '',
    autore: '',
    nota: '',
    foto: fotoBlob,
    anteprima,
    byte: fotoBlob.size,
    nome: nomeOriginale || '',
    timestampDispositivo: timestampDispositivo(),
    creatoIl: Date.now(),
    tentativi: 0,
    ultimoErrore: '',
    inviatoIl: null,
  };
  return transazione('readwrite', store => store.add(record)).then(() => record);
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

// Invia: le bozze passano in coda con categoria, commessa, autore e nota
// correnti. La categoria è già sul record dallo scatto, perché decide come
// l'immagine è stata preparata.
export async function confermaBozze(commessa, autore, nota) {
  const bozze = (await elenca()).filter(r => r.stato === 'bozza');
  for (const record of bozze) {
    record.stato = 'in_coda';
    record.commessa = commessa;
    record.autore = autore;
    record.nota = nota;
    await aggiorna(record);
  }
  return bozze.length;
}

// Le foto inviate restano sul telefono solo come promemoria: si conservano le
// ultime N, le più vecchie si eliminano. La conferma del server è già arrivata,
// e qui i file pesano (una foto d'archivio non compressa sono megabyte).
export async function potaInviate(conservaUltime) {
  const inviate = (await elenca()).filter(r => r.stato === 'inviata');
  const daTogliere = inviate.slice(0, Math.max(0, inviate.length - conservaUltime));
  for (const record of daTogliere) await elimina(record.id);
  return daTogliere.length;
}

function giornoOggi() {
  return timestampDispositivo().slice(0, 10);
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
