// Coda offline del modulo Bolle su IndexedDB.
// Ogni foto è un record autonomo con un id client univoco (idempotenza lato server).
// Stati: bozza (scattata, non ancora confermata con Invia) → in_coda → invio → inviata;
// errore = invio fallito, resta in coda e si ritenta.

import { timestampDispositivo } from '../../core/orario.js';

const NOME_DB = 'llitalia-bolle';
const VERSIONE_DB = 4;
const STORE = 'foto';
// Storico permanente degli invii confermati: solo dati, senza foto. Le foto
// pesano e vengono potate; il registro invece resta e permette di rispondere a
// "cosa ho mandato questa settimana" anche a distanza di mesi.
const STORE_STORICO = 'storico';
// Miniature separate dalle righe: l'elenco resta leggero perché non carica le
// immagini, che si leggono una alla volta quando la bolla viene aperta.
const STORE_MINIATURE = 'miniature';
const MINIATURE_DA_CONSERVARE = 300;
// Progressivo per dispositivo: serve al runbook per accorgersi di una foto
// scattata e mai arrivata in raccolta (un numero mancante nella sequenza).
// Non si azzera mai; su un dispositivo reinstallato riparte da 1, quindi va
// sempre letto insieme a operatore e idClient.
const STORE_CONTATORE = 'contatore';
const CHIAVE_PROGRESSIVO = 'progressivo';
// Nello store del contatore c'è anche la chiave 'idDispositivo', scritta dalle
// versioni precedenti: la shell la eredita da qui (core/dispositivo.js). Non
// va riusata per altro e non va riscritta.
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
    // Fase di lavoro (o lotto, per le urbanizzazioni): si sceglie con Invia,
    // come il cantiere.
    fase: '',
    // I tre livelli dell'archivio (dalla 0.36.0): il selettore è lo stesso del
    // modulo Foto, quindi anche una bolla li porta. `null` dove non si
    // applicano, mai stringa vuota.
    piano: null,
    unita: null,
    prospetto: null,
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

// Riserva uno o più progressivi in un'unica transazione: leggere e scrivere
// separatamente esporrebbe a due invii simultanei che prendono lo stesso numero.
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

// L'identità del dispositivo NON sta più qui: vive nella shell, in
// `core/dispositivo.js`, perché è l'identità del telefono e non di un modulo —
// la usano sia le bolle sia le foto di cantiere, e due copie divergerebbero.
// Il valore scritto dalle versioni precedenti resta in questo store: è la
// fonte da cui la shell lo eredita, e va lasciato dov'è. Riscriverlo o
// cancellarlo farebbe apparire in raccolta un dispositivo nuovo, spezzando la
// sequenza delle bolle già inviate.

// Quanti progressivi sono stati assegnati finora su questo dispositivo.
export function progressivoRaggiunto() {
  return transazione(STORE_CONTATORE, 'readonly', store => store.get(CHIAVE_PROGRESSIVO))
    .then(riga => Number(riga && riga.valore) || 0);
}

// Invia: tutte le bozze passano in coda con cantiere e autore correnti.
// Il progressivo si assegna QUI, all'accodamento, non allo scatto: una foto
// scartata dalle anteprime non deve bruciare un numero, perché il buco nella
// sequenza è proprio il segnale che il runbook legge come "bolla persa".
// Assegnato una volta, non cambia più: i retry riusano lo stesso numero.
//
// unaSolaBolla = le foto sono le PAGINE di una sola bolla: prendono un
// idBolla comune e la numerazione pagina/pagine, nell'ordine di scatto.
// Resta comunque un invio per pagina — il contratto è un file per richiesta —
// e ogni pagina consuma il suo progressivo, così il controllo di continuità
// non cambia: una pagina mai arrivata è un buco come qualsiasi altro.
export async function confermaBozze(cantiere, autore, unaSolaBolla = false, fase = '', livelli = {}) {
  const bozze = (await elenca()).filter(r => r.stato === 'bozza');
  if (bozze.length === 0) return 0;
  const primo = await riservaProgressivi(bozze.length);
  const idComune = unaSolaBolla ? crypto.randomUUID() : '';
  let numero = primo;
  let pagina = 1;
  for (const record of bozze) {
    record.stato = 'in_coda';
    record.cantiere = cantiere;
    record.fase = fase;
    record.piano = livelli.piano || null;
    record.unita = livelli.unita || null;
    record.prospetto = livelli.prospetto || null;
    record.autore = autore;
    record.progressivo = numero;
    // Anche una bolla di una pagina sola ha il suo idBolla: a valle la regola
    // è una — si raggruppa per idBolla — senza casi particolari da ricordare.
    record.idBolla = idComune || crypto.randomUUID();
    record.pagina = unaSolaBolla ? pagina : 1;
    record.pagine = unaSolaBolla ? bozze.length : 1;
    numero += 1;
    pagina += 1;
    await aggiorna(record);
  }
  return bozze.length;
}

// Conferma una sola bozza: usata dalla correzione del cantiere, dove non si
// possono coinvolgere le altre foto in attesa, che vanno su un altro cantiere.
// Rimando di una singola foto (correzione del cantiere dallo storico).
// `bolla` porta l'appartenenza dell'originale: una pagina corretta deve
// restare la stessa pagina della stessa bolla, altrimenti la correzione
// spezzerebbe in due una bolla di più pagine.
export async function confermaSingola(id, cantiere, autore, bolla = null) {
  const record = (await elenca()).find(r => r.id === id && r.stato === 'bozza');
  if (!record) return false;
  record.stato = 'in_coda';
  record.cantiere = cantiere;
  // La fase resta quella dell'invio originale: si corregge il cantiere, non
  // l'attribuzione.
  record.fase = (bolla && bolla.fase) || '';
  record.piano = (bolla && bolla.piano) || null;
  record.unita = (bolla && bolla.unita) || null;
  record.prospetto = (bolla && bolla.prospetto) || null;
  record.autore = autore;
  record.progressivo = await riservaProgressivi(1);
  record.idBolla = (bolla && bolla.idBolla) || crypto.randomUUID();
  record.pagina = (bolla && bolla.pagina) || 1;
  record.pagine = (bolla && bolla.pagine) || 1;
  await aggiorna(record);
  return true;
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

// Riparte il conteggio del giorno da zero. Serve quando l'ufficio cancella da
// SharePoint delle bolle mandate per sbaglio e queste vanno rimandate: senza
// azzerare, il contatore somma invii veri e invii annullati e il collaudo
// "scattate contro atterrate" non torna più.
// NON tocca il progressivo, che è la sequenza su cui si scoprono le bolle
// perse: azzerarlo aprirebbe un buco falso in raccolta.
export function azzeraContatoriOggi() {
  const prima = contatoriOggi();
  salvaContatori({ giorno: giornoOggi(), scattate: 0, inviate: 0 });
  return prima;
}

// Toglie dalla coda a video le foto già confermate dal server, che restano solo
// come promemoria. Le bolle non ancora confermate (bozza, in coda, in errore)
// non si toccano MAI: una foto non arrivata non deve poter sparire da qui.
// Lo storico resta intatto: è il registro del dispositivo, non un contatore.
export async function rimuoviInviate() {
  const inviate = (await elenca()).filter(r => r.stato === 'inviata');
  for (const record of inviate) {
    await elimina(record.id);
  }
  return inviate.length;
}

// --- Storico degli invii confermati -----------------------------------------

// Chiamata quando il server conferma: riga e miniatura restano anche dopo che
// la foto a piena risoluzione è stata potata dal dispositivo.
export async function registraInvio(record) {
  await transazione(STORE_STORICO, 'readwrite', store => store.put({
    idClient: record.id,
    commessa: record.cantiere,
    fase: record.fase || '',
    piano: record.piano || null,
    unita: record.unita || null,
    prospetto: record.prospetto || null,
    operatore: record.autore,
    dataInvio: record.timestampDispositivo,
    inviatoIl: record.inviatoIl || Date.now(),
    impronta: record.impronta || '',
    progressivo: record.progressivo || null,
    idBolla: record.idBolla || '',
    pagina: record.pagina || 1,
    pagine: record.pagine || 1,
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
  await aggiorna(record);
  return record;
}

export async function rimandaCorretta(id, dati) {
  const originale = (await elenca()).find(r => r.id === id);
  if (!originale || !originale.foto) return null;
  const nuovo = await aggiungiBozza(
    originale.foto, originale.nome, originale.miniatura,
    originale.impronta, originale.qualita, originale.motivoQualita);
  nuovo.stato = 'in_coda';
  nuovo.cantiere = dati.cantiere;
  nuovo.fase = dati.fase || '';
  nuovo.piano = dati.piano || null;
  nuovo.unita = dati.unita || null;
  nuovo.prospetto = dati.prospetto || null;
  nuovo.autore = dati.autore || originale.autore;
  nuovo.progressivo = await riservaProgressivi(1);
  // La pagina corretta resta la stessa pagina della stessa bolla: altrimenti
  // rimandarne una spezzerebbe in due una bolla di più pagine.
  nuovo.idBolla = originale.idBolla || crypto.randomUUID();
  nuovo.pagina = originale.pagina || 1;
  nuovo.pagine = originale.pagine || 1;
  await aggiorna(nuovo);
  return nuovo;
}
