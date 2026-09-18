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

import { timestampDispositivo } from '../../core/orario.js';

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
    fase: '',
    // I tre livelli dell'archivio (dalla 0.36.0). `null`, non stringa vuota:
    // dove il livello non si applica il campo deve arrivare in raccolta come
    // assente, e `''` in una colonna somiglia a un dato che non c'è mai stato.
    piano: null,
    unita: null,
    prospetto: null,
    autore: '',
    nota: '',
    foto: fotoBlob,
    anteprima,
    byte: fotoBlob.size,
    nome: nomeOriginale || '',
    // Due ore diverse, che vanno tenute diverse.
    //
    // `dataScatto` è QUANDO LA FOTO È STATA FATTA: la legge chi chiama —
    // dall'EXIF del file originale per le foto di galleria, dall'orologio del
    // momento per gli scatti fatti dentro l'app — e per l'archivio di commessa
    // è il dato che conta. `timestampDispositivo` è quando la foto è entrata in
    // coda, cioè l'ora dell'INVIO: serve alle diagnosi, non alla raccolta.
    //
    // Fino alla 0.28.0 c'era solo la seconda e viaggiava come `dataScatto`:
    // due foto delle 08:31 sono atterrate in raccolta con l'ora in cui
    // l'operatore ha premuto Invia, senza che nulla lo segnalasse.
    //
    // Quando l'ora dello scatto non si riesce a sapere si ripiega su quella di
    // accodamento, e lo si DICHIARA: `scattoStimato` vale 'SI', così chi legge
    // la raccolta sa che quel numero è un'approssimazione per eccesso e non un
    // dato misurato. Testo 'SI'/'NO' e non un booleano: le colonne di tipo Sì/No
    // in SharePoint sono quelle che il connettore riscrive più volentieri.
    dataScatto: extra.dataScatto || timestampDispositivo(),
    // Dichiarato da chi accoda, non dedotto dalla presenza della data: una
    // copia ridotta senza EXIF può partire con la data del FILE — più vicina
    // allo scatto dell'ora dell'invio — e resta comunque una stima, mentre
    // uno scatto fatto dall'app ha un'ora misurata. Dedurlo dalla data
    // confonderebbe i due casi, che sono quelli che si devono distinguere.
    scattoStimato: extra.scattoStimato || (extra.dataScatto ? 'NO' : 'SI'),
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
export async function confermaBozze(commessa, autore, nota, fase = '', livelli = {}) {
  const bozze = (await elenca()).filter(r => r.stato === 'bozza');
  if (bozze.length === 0) return 0;
  // I numeri si prendono tutti insieme e si distribuiscono in ordine di
  // scatto: `elenca()` ordina per creatoIl, quindi la sequenza in raccolta
  // rispecchia l'ordine in cui le foto sono state fatte.
  let progressivo = await riservaProgressivi(bozze.length);
  for (const record of bozze) {
    record.stato = 'in_coda';
    record.commessa = commessa;
    record.fase = fase;
    record.piano = livelli.piano || null;
    record.unita = livelli.unita || null;
    record.prospetto = livelli.prospetto || null;
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

// ---------------------------------------------------------------------------
// «Rimanda», in due casi che vanno tenuti distinti (deciso il 18/09/2026).
//
// SENZA modifiche — «temo che non sia arrivata»: STESSO idClient, stesso
// progressivo. Il flow ha una guardia sui duplicati e risponde
// `gia_presente`: se era già arrivata non se ne crea una seconda, e l'app lo
// dice. È il caso che prima non c'era, e che costringeva a rimandare alla
// cieca creando doppioni che poi l'ufficio doveva annullare a mano.
//
// CON modifiche — foto venuta male, dato sbagliato: idClient NUOVO e
// progressivo NUOVO, perché in raccolta deve comparire una riga diversa. Quella
// già mandata resta dov'è: annullarla è dell'ufficio, e il telefono non ha modo
// di sapere se è già stata lavorata.
// ---------------------------------------------------------------------------

export async function rimandaStessa(id) {
  const record = (await elenca()).find(r => r.id === id);
  if (!record || record.stato !== 'inviata') return null;
  record.stato = 'in_coda';
  record.tentativi = 0;
  record.ultimoErrore = '';
  record.inviatoIl = null;
  record.giaPresente = false;
  // Non va contato fra le «inviate oggi»: in raccolta non arriva niente di
  // nuovo, e quel contatore serve a essere confrontato coi file atterrati.
  record.nonContare = true;
  // La sessione di caricamento a blocchi di prima è chiusa da tempo: si
  // riparte da zero, invece di chiedere al server byte di una sessione che
  // non esiste più.
  record.urlCaricamento = '';
  record.byteInviati = 0;
  record.byteCaricati = false;
  await aggiorna(record);
  return record;
}

export async function rimandaCorretta(id, dati) {
  const originale = (await elenca()).find(r => r.id === id);
  if (!originale || !originale.foto) return null;
  const nuovo = await aggiungiBozza(
    originale.foto, originale.anteprima, originale.nome, originale.tipo, {
      genere: originale.genere,
      estensione: originale.estensione,
      durata: originale.durata,
      // L'ora dello scatto è della FOTO, non dell'invio: rimandarla non la
      // cambia, e non cambia nemmeno se era misurata o stimata.
      dataScatto: originale.dataScatto,
      scattoStimato: originale.scattoStimato,
    });
  nuovo.stato = 'in_coda';
  nuovo.commessa = dati.commessa;
  nuovo.fase = dati.fase || '';
  nuovo.piano = dati.piano || null;
  nuovo.unita = dati.unita || null;
  nuovo.prospetto = dati.prospetto || null;
  nuovo.autore = dati.autore || originale.autore;
  nuovo.nota = dati.nota || '';
  nuovo.progressivo = await riservaProgressivi(1);
  await aggiorna(nuovo);
  return nuovo;
}
