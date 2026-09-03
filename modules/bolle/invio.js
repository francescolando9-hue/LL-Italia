// Invio della coda del modulo Bolle verso l'endpoint del magazzino.
// Un elemento esce dalla coda SOLO a conferma del server; idClient univoco
// per bolla, che il backend userà per la deduplica, e idDispositivo stabile
// per installazione, che dà un titolare certo alla sequenza dei progressivi.
import * as coda from './coda.js';
import { impostazioniBolle, normalizzaEndpoint } from './impostazioni.js';

const RITARDO_MINIMO_MS = 5000;
const RITARDO_MASSIMO_MS = 5 * 60 * 1000;
const CHIAVE_MOCK = 'llitalia.bolle.mock';

let inCorso = false;
let richiestaRiprocesso = false;
let timerRetry = null;
let ritardoMs = RITARDO_MINIMO_MS;
let notifica = () => {};

// La vista si registra per ridisegnarsi a ogni cambio di stato della coda.
export function alCambiamento(funzione) {
  notifica = funzione;
}

// Avvio (o riavvio) dell'invio: a ogni apertura, al ritorno della rete,
// dopo Invia e sul retry manuale. Azzera il backoff.
export function avvia() {
  if (timerRetry) {
    clearTimeout(timerRetry);
    timerRetry = null;
  }
  ritardoMs = RITARDO_MINIMO_MS;
  processa();
}

// Retry manuale di un singolo elemento in errore.
export async function riprova(id) {
  const record = (await coda.elenca()).find(r => r.id === id);
  if (record && record.stato === 'errore') {
    record.stato = 'in_coda';
    record.ultimoErrore = '';
    await coda.aggiorna(record);
    notifica();
  }
  avvia();
}

async function processa() {
  if (inCorso) {
    richiestaRiprocesso = true;
    return;
  }
  inCorso = true;
  try {
    do {
      richiestaRiprocesso = false;
      const daInviare = (await coda.elenca())
        .filter(r => r.stato === 'in_coda' || r.stato === 'errore');
      let falliti = false;
      for (const record of daInviare) {
        // Senza rete gli elementi restano "In coda": si ritenta al ritorno
        // della connettività (evento online) o col timer di backoff.
        if (!navigator.onLine) {
          falliti = daInviare.length > 0;
          break;
        }
        // Foto accodate da una versione precedente al contatore: si assegna
        // il numero adesso, così il campo è sempre un intero.
        if (!Number.isInteger(record.progressivo)) {
          record.progressivo = await coda.riservaProgressivi(1);
        }
        record.stato = 'invio';
        record.ultimoErrore = '';
        await coda.aggiorna(record);
        notifica();
        try {
          const risposta = await inviaSingola(record);
          record.stato = 'inviata';
          record.inviatoIl = Date.now();
          record.idServer = risposta.id || '';
          await coda.aggiorna(record);
          // Lo storico si scrive prima della potatura: la riga sopravvive
          // alla foto, che verrà eliminata dal dispositivo.
          await coda.registraInvio(record);
          coda.incrementaInviate(1);
          await coda.potaInviate(impostazioniBolle().conservaUltime);
        } catch (errore) {
          record.stato = 'errore';
          record.tentativi += 1;
          record.ultimoErrore = errore.message;
          await coda.aggiorna(record);
          falliti = true;
        }
        notifica();
      }
      if (falliti) {
        pianificaRetry();
      } else {
        ritardoMs = RITARDO_MINIMO_MS;
      }
    } while (richiestaRiprocesso);
  } finally {
    inCorso = false;
  }
}

// Backoff esponenziale: 5 s, 10 s, 20 s… fino a 5 minuti.
function pianificaRetry() {
  if (timerRetry) return;
  timerRetry = setTimeout(() => {
    timerRetry = null;
    processa();
  }, ritardoMs);
  ritardoMs = Math.min(ritardoMs * 2, RITARDO_MASSIMO_MS);
}

// Nome file di comodo: il backend lo IGNORA (lo compone il flow), ma resta
// utile nei log e nelle diagnosi. Nomenclatura di gruppo, senza separatori.
export function componiNomeFile(record) {
  const compatto = String(record.timestampDispositivo).replace(/[-:]/g, '').slice(0, 15).replace('T', '');
  const operatore = String(record.autore).replace(/\s+/g, '');
  return `Bolla${record.cantiere}${compatto}${operatore}.jpg`;
}

// Costruisce il corpo del contratto concordato col backend (già attivo).
export function corpoInvio(record, impostazioni, contenutoBase64, idDispositivo) {
  return {
    token: impostazioni.token,
    commessa: record.cantiere,
    operatore: record.autore,
    idClient: record.id,
    idDispositivo,
    progressivo: record.progressivo,
    dataInvio: record.timestampDispositivo,
    nomeFile: componiNomeFile(record),
    contenutoBase64,
  };
}

async function inviaSingola(record) {
  const impostazioni = impostazioniBolle();
  if (impostazioni.mock) return inviaMock(record);
  if (!impostazioni.endpoint) {
    throw new Error('Endpoint non configurato: apri le impostazioni del modulo');
  }
  // Contratto del backend collaudato: POST JSON, un file per richiesta,
  // risposta 202 Accepted senza corpo. Da non modificare senza aggiornare il flow.
  const contenutoBase64 = await blobInBase64(record.foto);
  const dispositivo = await coda.idDispositivo();
  let risposta;
  try {
    risposta = await fetch(normalizzaEndpoint(impostazioni.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoInvio(record, impostazioni, contenutoBase64, dispositivo)),
    });
  } catch {
    // fetch fallisce senza status sia con rete assente sia quando il browser
    // blocca la richiesta (CORS): distinguere i due casi aiuta la diagnosi.
    throw new Error(navigator.onLine
      ? 'Invio bloccato: nessuna risposta dall’endpoint (rete assente o CORS)'
      : 'Rete non disponibile');
  }
  if (!risposta.ok) {
    const dettaglio = risposta.status === 400
      ? ' — verifica api-version nell’URL'
      : risposta.status === 401 || risposta.status === 403 ? ' — token o firma non validi' : '';
    throw new Error(`Errore del server: ${risposta.status}${dettaglio}`);
  }
  // 202 Accepted senza corpo: la conferma è lo stato HTTP.
  return { id: '' };
}

// Mock per sviluppo e demo senza backend: stessa forma del contratto reale,
// latenza simulata e registro locale degli invii per il collaudo sui numeri.
async function inviaMock(record) {
  await new Promise(risolvi => setTimeout(risolvi, 700));
  const impostazioni = impostazioniBolle();
  const corpo = corpoInvio(record, impostazioni, 'mock', await coda.idDispositivo());
  let dati;
  try {
    dati = JSON.parse(localStorage.getItem(CHIAVE_MOCK)) || {};
  } catch {
    dati = {};
  }
  dati.inviati = dati.inviati || {};
  if (dati.inviati[corpo.idClient]) {
    return { id: dati.inviati[corpo.idClient] };
  }
  dati.contatore = (dati.contatore || 0) + 1;
  const id = `mock-${String(dati.contatore).padStart(4, '0')}`;
  dati.inviati[corpo.idClient] = id;
  const chiavi = Object.keys(dati.inviati);
  if (chiavi.length > 500) {
    for (const vecchia of chiavi.slice(0, chiavi.length - 100)) {
      delete dati.inviati[vecchia];
    }
  }
  localStorage.setItem(CHIAVE_MOCK, JSON.stringify(dati));
  return { id };
}

function blobInBase64(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(String(lettore.result).split(',')[1] || '');
    lettore.onerror = () => rifiuta(new Error('Lettura della foto non riuscita'));
    lettore.readAsDataURL(blob);
  });
}
