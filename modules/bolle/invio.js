// Invio della coda del modulo Bolle verso l'endpoint del magazzino.
// Un elemento esce dalla coda SOLO a conferma del server; idClient univoco
// per bolla, che il backend userà per la deduplica, e idDispositivo stabile
// per installazione, che dà un titolare certo alla sequenza dei progressivi.
import * as coda from './coda.js';
import { impostazioniBolle, normalizzaEndpoint } from './impostazioni.js';
import { versioneApp } from '../../core/versione.js';
import { spiegazioneStato } from '../../core/errori.js';
import { idDispositivo } from '../../core/dispositivo.js';
import { creaMotore, eGiaPresente } from '../../core/coda-invio.js';

const CHIAVE_MOCK = 'llitalia.bolle.mock';

// Il motore della coda vive nella shell: qui ci sono solo le cose che sono
// davvero delle bolle — lo storico, l'id del server, e le sistemazioni dei
// record accodati da versioni precedenti dell'app.
const motore = creaMotore({
  coda,
  conservaUltime: () => impostazioniBolle().conservaUltime,
  inviaRecord: record => inviaSingola(record),
  async preparaRecord(record) {
    // Foto accodate da una versione precedente al contatore: si assegna il
    // numero adesso, così il campo è sempre un intero.
    if (!Number.isInteger(record.progressivo)) {
      record.progressivo = await coda.riservaProgressivi(1);
    }
    // Foto accodate prima della gestione delle bolle su più pagine: valgono
    // come bolle di una pagina sola.
    if (!record.idBolla) {
      record.idBolla = record.id;
      record.pagina = 1;
      record.pagine = 1;
    }
  },
  async segnaInviato(record, risposta) {
    record.idServer = risposta.id || '';
    // «Era già in raccolta»: vedi il modulo Foto. Serve a «Rimanda» senza
    // modifiche, che riusa lo stesso idClient per farsi dire questo.
    record.giaPresente = Boolean(risposta.giaPresente);
    await coda.registraInvio(record);
  },
});

export const { alCambiamento, avvia, riprova } = motore;

// Nome file di comodo: il backend lo IGNORA (lo compone il flow), ma resta
// utile nei log e nelle diagnosi. Nomenclatura di gruppo, senza separatori.
export function componiNomeFile(record) {
  const compatto = String(record.timestampDispositivo).replace(/[-:]/g, '').slice(0, 15).replace('T', '');
  const operatore = String(record.autore).replace(/\s+/g, '');
  // Le pagine di una stessa bolla si distinguono nel nome: il backend ignora
  // questo campo, ma nei log e nelle diagnosi due pagine identiche nel nome
  // sarebbero indistinguibili.
  const pagine = Number(record.pagine) || 1;
  const pagina = pagine > 1 ? `Pag${record.pagina}di${pagine}` : '';
  return `Bolla${record.cantiere}${compatto}${operatore}${pagina}.jpg`;
}

// Costruisce il corpo del contratto concordato col backend (già attivo).
export function corpoInvio(record, impostazioni, contenutoBase64, idDispositivo, versione = '') {
  return {
    token: impostazioni.token,
    commessa: record.cantiere,
    // Fase di lavoro a cui la bolla si attribuisce, dall'elenco chiuso della
    // shell (core/fasi.js). Testo; vuoto solo per le bolle accodate prima
    // della 0.31.0, che il campo non lo avevano.
    fase: record.fase || '',
    // I tre livelli dell'archivio (dalla 0.36.0): il selettore della fase è
    // quello del modulo Foto, quindi una bolla porta gli stessi livelli.
    // `null` dove non si applicano, mai stringa vuota.
    piano: record.piano || null,
    unita: record.unita || null,
    prospetto: record.prospetto || null,
    operatore: record.autore,
    idClient: record.id,
    idDispositivo,
    progressivo: record.progressivo,
    idBolla: record.idBolla,
    pagina: record.pagina,
    pagine: record.pagine,
    dataInvio: record.timestampDispositivo,
    versioneApp: versione,
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
  const dispositivo = await idDispositivo();
  // La versione viene dalla cache attiva del service worker, quindi è quella
  // che sta davvero girando sul telefono, non quella che dovrebbe girare.
  const versione = await versioneApp();
  let risposta;
  try {
    risposta = await fetch(normalizzaEndpoint(impostazioni.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoInvio(record, impostazioni, contenutoBase64, dispositivo, versione)),
    });
  } catch {
    // fetch fallisce senza status sia con rete assente sia quando il browser
    // blocca la richiesta (CORS): distinguere i due casi aiuta la diagnosi.
    throw new Error(navigator.onLine
      ? 'Invio bloccato: nessuna risposta dall’endpoint (rete assente o CORS)'
      : 'Rete non disponibile');
  }
  if (!risposta.ok) {
    throw new Error(`Errore del server: ${risposta.status}${spiegazioneStato(risposta.status)}`);
  }
  // 202 Accepted senza corpo: la conferma è lo stato HTTP. Il corpo si legge
  // comunque, perché la guardia sui duplicati risponde con `gia_presente`
  // quando la bolla c'era già — ed è ciò che «Rimanda» deve poter dire.
  return { id: '', giaPresente: await eGiaPresente(risposta) };
}

// Mock per sviluppo e demo senza backend: stessa forma del contratto reale,
// latenza simulata e registro locale degli invii per il collaudo sui numeri.
async function inviaMock(record) {
  await new Promise(risolvi => setTimeout(risolvi, 700));
  const impostazioni = impostazioniBolle();
  const corpo = corpoInvio(record, impostazioni, 'mock', await idDispositivo(), await versioneApp());
  let dati;
  try {
    dati = JSON.parse(localStorage.getItem(CHIAVE_MOCK)) || {};
  } catch {
    dati = {};
  }
  dati.inviati = dati.inviati || {};
  if (dati.inviati[corpo.idClient]) {
    // Il mock si comporta come il flow: lo stesso idClient non crea un
    // doppione e lo dichiara, altrimenti «Rimanda» in mock racconterebbe una
    // cosa diversa da quella che succede in produzione.
    return { id: dati.inviati[corpo.idClient], giaPresente: true };
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
