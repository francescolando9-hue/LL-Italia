// Identificativo stabile dell'installazione, uno per telefono, condiviso da
// tutti i moduli.
//
// Perché sta nella shell e non in un modulo: è l'identità del dispositivo, non
// di una funzione. Serve alle bolle per dare un titolare certo alla sequenza
// dei progressivi, e serve alle foto di cantiere per lo stesso motivo. Se ogni
// modulo se ne tenesse una copia, due verità finirebbero per divergere e il
// controllo di continuità — che è l'unica prova che nulla si è perso fra
// telefono e raccolta — smetterebbe di valere.
//
// Perché in IndexedDB e non in localStorage: è la scelta già presa quando
// l'identificativo viveva accanto al contatore progressivo delle bolle.
// localStorage è più esposto alle pulizie del browser, e un identificativo che
// cambia da solo spezza la sequenza in raccolta senza dare alcun segnale.
//
// Migrazione: sui telefoni che usano l'app da prima di questa versione
// l'identificativo esiste già dentro il database delle bolle. Va RIPRESO, non
// rigenerato: un id nuovo farebbe apparire in raccolta due dispositivi dove ce
// n'è uno, e la sequenza delle bolle già inviate risulterebbe interrotta.

const NOME_DB = 'llitalia-dispositivo';
const STORE = 'identita';
const CHIAVE = 'idDispositivo';

// Dove l'identificativo viveva prima: database del modulo Bolle, accanto al
// contatore. Si legge solo per ereditarlo; nessun modulo viene importato, così
// la shell non dipende da un modulo.
const DB_PRECEDENTE = 'llitalia-bolle';
const STORE_PRECEDENTE = 'contatore';

let dbPromise = null;
let idPromise = null;

function apri() {
  if (!dbPromise) {
    dbPromise = new Promise((risolvi, rifiuta) => {
      const richiesta = indexedDB.open(NOME_DB, 1);
      richiesta.onupgradeneeded = () => {
        const db = richiesta.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'chiave' });
        }
      };
      richiesta.onsuccess = () => risolvi(richiesta.result);
      richiesta.onerror = () => rifiuta(richiesta.error);
    });
  }
  return dbPromise;
}

// Identificativo lasciato dalle versioni precedenti, se c'è. Non fa rumore in
// nessun caso: un database che non esiste, uno store che non c'è o un errore
// qualunque valgono "nessuna eredità", e si genera un id nuovo.
function idPrecedente() {
  return new Promise(risolvi => {
    let richiesta;
    try {
      richiesta = indexedDB.open(DB_PRECEDENTE);
    } catch {
      risolvi('');
      return;
    }
    richiesta.onerror = () => risolvi('');
    richiesta.onblocked = () => risolvi('');
    richiesta.onsuccess = () => {
      const db = richiesta.result;
      if (!db.objectStoreNames.contains(STORE_PRECEDENTE)) {
        db.close();
        risolvi('');
        return;
      }
      try {
        const lettura = db.transaction(STORE_PRECEDENTE, 'readonly')
          .objectStore(STORE_PRECEDENTE).get(CHIAVE);
        lettura.onsuccess = () => {
          const valore = (lettura.result && lettura.result.valore) || '';
          db.close();
          risolvi(valore);
        };
        lettura.onerror = () => { db.close(); risolvi(''); };
      } catch {
        db.close();
        risolvi('');
      }
    };
  });
}

function leggiOScrivi(ereditato) {
  return apri().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    let id = '';
    const lettura = store.get(CHIAVE);
    lettura.onsuccess = () => {
      id = (lettura.result && lettura.result.valore) || '';
      // Lettura e scrittura nella stessa transazione: due viste che aprono
      // insieme l'app non devono poter generare due identità diverse.
      if (!id) {
        id = ereditato || crypto.randomUUID();
        store.put({ chiave: CHIAVE, valore: id });
      }
    };
    tx.oncomplete = () => risolvi(id);
    tx.onerror = () => rifiuta(tx.error);
    tx.onabort = () => rifiuta(tx.error);
  }));
}

// Una sola lettura per sessione: la eredità si valuta una volta sola, e le
// chiamate successive tornano subito. Un errore non viene memorizzato, così un
// problema momentaneo non rende l'id indisponibile per tutta la sessione.
export function idDispositivo() {
  if (!idPromise) {
    idPromise = idPrecedente()
      .then(ereditato => leggiOScrivi(ereditato))
      .catch(errore => { idPromise = null; throw errore; });
  }
  return idPromise;
}
