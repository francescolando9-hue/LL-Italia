// Invio della coda del modulo Bolle.
// Un elemento esce dalla coda SOLO a conferma del server; l'id client univoco
// (uuid) rende l'invio idempotente: un doppio invio non duplica la bolla.
import * as coda from './coda.js';
import { impostazioniBolle } from './impostazioni.js';

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

async function inviaSingola(record) {
  const impostazioni = impostazioniBolle();
  if (impostazioni.mock) return inviaMock(record);
  if (!impostazioni.endpoint) {
    throw new Error('Endpoint non configurato: apri le impostazioni del modulo');
  }
  // [PROVVISORIO] Contratto endpoint da riconciliare quando Francesco definisce
  // il backend reale (tecnologia, URL, meccanismo chiave): POST JSON con foto
  // in base64 e chiave nell'header Authorization. Campi da specifica:
  // cantiere, autore, timestamp dispositivo, foto, id client per la deduplica.
  const base64 = await blobInBase64(record.foto);
  let risposta;
  try {
    risposta = await fetch(impostazioni.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(impostazioni.chiave ? { Authorization: `Bearer ${impostazioni.chiave}` } : {}),
      },
      body: JSON.stringify({
        id: record.id,
        cantiere: record.cantiere,
        autore: record.autore,
        timestampDispositivo: record.timestampDispositivo,
        foto: {
          nome: record.nome || 'bolla.jpg',
          tipo: 'image/jpeg',
          base64,
        },
      }),
    });
  } catch {
    throw new Error('Rete non raggiungibile o endpoint non valido');
  }
  if (!risposta.ok) {
    throw new Error(`Errore del server: ${risposta.status}`);
  }
  const dati = await risposta.json().catch(() => ({}));
  return { id: dati.id || '' };
}

// Mock end-to-end per sviluppo e demo senza backend: simula latenza, risponde
// con un id di salvataggio e deduplica sull'id client come farà il flow reale.
async function inviaMock(record) {
  await new Promise(risolvi => setTimeout(risolvi, 700));
  let dati;
  try {
    dati = JSON.parse(localStorage.getItem(CHIAVE_MOCK)) || {};
  } catch {
    dati = {};
  }
  dati.inviati = dati.inviati || {};
  if (dati.inviati[record.id]) {
    return { id: dati.inviati[record.id] };
  }
  dati.contatore = (dati.contatore || 0) + 1;
  const id = `mock-${String(dati.contatore).padStart(4, '0')}`;
  dati.inviati[record.id] = id;
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
