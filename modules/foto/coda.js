// Coda offline del modulo Foto su IndexedDB, database separato da quello delle
// bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
// Stati: bozza (scattata, non ancora confermata con Invia) → in_coda → invio →
// inviata; errore = invio fallito, resta in coda e si ritenta.
//
// Più semplice della coda delle bolle, di proposito: qui non servono lo storico
// permanente né le miniature conservate.
//
// Il progressivo invece SÌ, dal 11/09/2026: senza una sequenza per dispositivo
// non esiste un controllo di continuità, cioè non si può dimostrare che nessuna
// foto si è persa fra telefono e raccolta — si può solo sperarlo. Era una scelta
// presa al contrario («una foto di cantiere che non arriva si riscatta»), che il
// collaudo del ricevente ha rovesciato: riscattare una foto richiede di sapere
// che manca, e a dirlo è solo un buco nella sequenza.
//
// La sequenza è PROPRIA di questo modulo e parte da 1: le due raccolte sono
// separate e ognuna si controlla per conto suo. Non va confrontata con quella
// delle bolle. L'identità del dispositivo, invece, è la stessa — vive nella
// shell, perché è l'identità del telefono e non di un modulo.

const NOME_DB = 'llitalia-foto';
// v2: aggiunto lo store del contatore. Le foto già in coda non si toccano.
const VERSIONE_DB = 2;
const STORE = 'foto';
const STORE_CONTATORE = 'contatore';
const CHIAVE_PROGRESSIVO = 'progressivo';
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
        if (!db.objectStoreNames.contains(STORE_CONTATORE)) {
          db.createObjectStore(STORE_CONTATORE, { keyPath: 'chiave' });
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
export function aggiungiBozza(fotoBlob, anteprima, nomeOriginale, tipo, extra = {}) {
  const record = {
    id: crypto.randomUUID(),
    stato: 'bozza',
    tipo,
    // Foto o video: il flow deve saperlo per dare al file l'estensione
    // giusta — un video salvato come .jpg non si apre.
    genere: extra.genere || 'foto',
    estensione: extra.estensione || 'jpg',
    mime: fotoBlob.type || 'image/jpeg',
    durata: extra.durata || 0,
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
    // Assegnato quando la foto entra in coda con Invia, non allo scatto: una
    // bozza scartata lascerebbe un buco nella sequenza, e un buco significa
    // «una foto non è arrivata» per chi controlla la raccolta.
    progressivo: null,
    // Caricamento in due fasi: si ricorda dove si era arrivati, così un video
    // interrotto a metà riprende da lì e non ricomincia da zero.
    urlCaricamento: '',
    byteInviati: 0,
    byteCaricati: false,
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

// Riserva `quanti` numeri consecutivi e restituisce il primo. Lettura e
// scrittura nella stessa transazione: due invii lanciati a un attimo di
// distanza non devono poter prendere lo stesso numero.
export function riservaProgressivi(quanti = 1) {
  return apri().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(STORE_CONTATORE, 'readwrite');
    const store = tx.objectStore(STORE_CONTATORE);
    let primo = 1;
    const lettura = store.get(CHIAVE_PROGRESSIVO);
    lettura.onsuccess = () => {
      const ultimo = Number(lettura.result && lettura.result.valore) || 0;
      primo = ultimo + 1;
      store.put({ chiave: CHIAVE_PROGRESSIVO, valore: ultimo + quanti });
    };
    tx.oncomplete = () => risolvi(primo);
    tx.onerror = () => rifiuta(tx.error);
    tx.onabort = () => rifiuta(tx.error);
  }));
}

// A quanto è arrivata la numerazione su questo telefono: serve al riscontro
// con l'ufficio, che vede l'ultimo numero atterrato in raccolta.
export function progressivoRaggiunto() {
  return apri().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(STORE_CONTATORE, 'readonly');
    const lettura = tx.objectStore(STORE_CONTATORE).get(CHIAVE_PROGRESSIVO);
    lettura.onsuccess = () => risolvi(Number(lettura.result && lettura.result.valore) || 0);
    tx.onerror = () => rifiuta(tx.error);
    tx.onabort = () => rifiuta(tx.error);
  }));
}

// Invia: le bozze passano in coda con categoria, commessa, autore e nota
// correnti. La categoria è già sul record dallo scatto, perché decide come
// l'immagine è stata preparata.
export async function confermaBozze(commessa, autore, nota) {
  const bozze = (await elenca()).filter(r => r.stato === 'bozza');
  if (bozze.length === 0) return 0;
  // I numeri si prendono tutti insieme e si distribuiscono in ordine di
  // scatto: `elenca()` ordina per creatoIl, quindi la sequenza in raccolta
  // rispecchia l'ordine in cui le foto sono state fatte.
  let progressivo = await riservaProgressivi(bozze.length);
  for (const record of bozze) {
    record.stato = 'in_coda';
    record.commessa = commessa;
    record.autore = autore;
    record.nota = nota;
    record.progressivo = progressivo;
    progressivo += 1;
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
