// Invio della coda del modulo Foto verso il proprio flow.
// Una foto esce dalla coda SOLO a conferma del server; idClient univoco per
// foto, che il flow può usare per la deduplica.
import * as coda from './coda.js';
import { impostazioniFoto, normalizzaEndpoint } from './impostazioni.js';
import { versioneApp } from '../../core/versione.js';

const RITARDO_MINIMO_MS = 5000;
const RITARDO_MASSIMO_MS = 5 * 60 * 1000;

let inCorso = false;
let richiestaRiprocesso = false;
let timerRetry = null;
let ritardoMs = RITARDO_MINIMO_MS;
let notifica = () => {};

export function alCambiamento(funzione) {
  notifica = funzione;
}

export function avvia() {
  if (timerRetry) {
    clearTimeout(timerRetry);
    timerRetry = null;
  }
  ritardoMs = RITARDO_MINIMO_MS;
  processa();
}

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
        if (!navigator.onLine) {
          falliti = daInviare.length > 0;
          break;
        }
        record.stato = 'invio';
        record.ultimoErrore = '';
        await coda.aggiorna(record);
        notifica();
        try {
          await inviaSingola(record);
          record.stato = 'inviata';
          record.inviatoIl = Date.now();
          await coda.aggiorna(record);
          coda.incrementaInviate(1);
          await coda.potaInviate(impostazioniFoto().conservaUltime);
        } catch (errore) {
          record.stato = 'errore';
          record.tentativi += 1;
          record.ultimoErrore = errore.message;
          await coda.aggiorna(record);
          falliti = true;
        }
        notifica();
      }
      if (falliti) pianificaRetry();
      else ritardoMs = RITARDO_MINIMO_MS;
    } while (richiestaRiprocesso);
  } finally {
    inCorso = false;
  }
}

function pianificaRetry() {
  if (timerRetry) return;
  timerRetry = setTimeout(() => {
    timerRetry = null;
    processa();
  }, ritardoMs);
  ritardoMs = Math.min(ritardoMs * 2, RITARDO_MASSIMO_MS);
}

// Nome file di comodo: il flow lo IGNORA (lo compone lui), ma resta utile nei
// log e nelle diagnosi. Nomenclatura di gruppo, senza separatori.
export function componiNomeFile(record) {
  const compatto = String(record.timestampDispositivo).replace(/[-:]/g, '').slice(0, 15).replace('T', '');
  const operatore = String(record.autore).replace(/\s+/g, '');
  return `Foto${record.commessa}${record.tipo}${compatto}${operatore}.jpg`;
}

export function corpoInvio(record, impostazioni, contenutoBase64, versione = '') {
  return {
    token: impostazioni.token,
    tipo: record.tipo,
    commessa: record.commessa,
    operatore: record.autore,
    nota: record.nota || '',
    idClient: record.id,
    dataScatto: record.timestampDispositivo,
    versioneApp: versione,
    nomeFile: componiNomeFile(record),
    contenutoBase64,
  };
}

// Spiegazione degli stati: il numero da solo non dice a chi guarda cosa fare.
function spiegazioneStato(stato) {
  if (stato === 400) return ' — verifica api-version nell’URL, o la foto è troppo grande per il flow';
  if (stato === 401 || stato === 403) return ' — token o firma non validi';
  if (stato === 413) return ' — foto troppo grande per il flow';
  if (stato === 502) return ' — il flow è terminato senza rispondere: guarda la cronologia del flow';
  if (stato === 504) return ' — il flow non ha risposto in tempo: guarda la cronologia del flow';
  if (stato >= 500) return ' — il flow non è arrivato in fondo: guarda la cronologia del flow';
  return '';
}

async function inviaSingola(record) {
  const impostazioni = impostazioniFoto();
  if (!impostazioni.endpoint) {
    throw new Error('Endpoint non configurato: apri le impostazioni del modulo Foto');
  }
  const contenutoBase64 = await blobInBase64(record.foto);
  const versione = await versioneApp();
  let risposta;
  try {
    risposta = await fetch(normalizzaEndpoint(impostazioni.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoInvio(record, impostazioni, contenutoBase64, versione)),
    });
  } catch {
    throw new Error(navigator.onLine
      ? 'Invio bloccato: nessuna risposta dall’endpoint (rete assente o CORS)'
      : 'Rete non disponibile');
  }
  if (!risposta.ok) {
    throw new Error(`Errore del server: ${risposta.status}${spiegazioneStato(risposta.status)}`);
  }
  return { id: '' };
}

function blobInBase64(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(String(lettore.result).split(',')[1] || '');
    lettore.onerror = () => rifiuta(new Error('Lettura della foto non riuscita'));
    lettore.readAsDataURL(blob);
  });
}
