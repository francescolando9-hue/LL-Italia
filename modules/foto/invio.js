// Invio della coda del modulo Foto verso il proprio flow.
// Una foto esce dalla coda SOLO a conferma del server; idClient univoco per
// foto, che il flow può usare per la deduplica.
import * as coda from './coda.js';
import { impostazioniFoto, normalizzaEndpoint } from './impostazioni.js';
import { versioneApp } from '../../core/versione.js';
import { spiegazioneStato } from '../../core/errori.js';
import { idDispositivo } from '../../core/dispositivo.js';
import { preparaCaricamento, byteGiaCaricati, inviaBlocchi, completaCaricamento, bloccoValido } from './caricamento.js';

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
  const prefisso = record.genere === 'video' ? 'Video' : 'Foto';
  return `${prefisso}${record.commessa}${record.tipo}${compatto}${operatore}.${record.estensione || 'jpg'}`;
}

// I soli metadati, senza il contenuto: servono alle due fasi, dove i byte
// viaggiano per conto loro.
export function metadati(record, impostazioni, dispositivo = '', versione = '') {
  const corpo = corpoInvio(record, impostazioni, '', dispositivo, versione);
  delete corpo.contenutoBase64;
  corpo.byte = record.byte || (record.foto && record.foto.size) || 0;
  return corpo;
}

export function corpoInvio(record, impostazioni, contenutoBase64, dispositivo = '', versione = '') {
  return {
    token: impostazioni.token,
    tipo: record.tipo,
    commessa: record.commessa,
    operatore: record.autore,
    nota: record.nota || '',
    genere: record.genere || 'foto',
    estensione: record.estensione || 'jpg',
    mimeType: record.mime || 'image/jpeg',
    // Numero, non stringa: le colonne numeriche in raccolta rifiutano una
    // stringa vuota con «required to be of type Number», e la foto atterra
    // senza colonne. Dove il dato non c'è si manda null, mai ''.
    durataSecondi: Number(record.durata) || 0,
    idClient: record.id,
    // Titolare della sequenza: raggrupparla per «operatore», che è testo
    // libero, la spezzerebbe a ogni grafia diversa del nome.
    idDispositivo: dispositivo,
    progressivo: Number.isFinite(record.progressivo) ? record.progressivo : null,
    dataScatto: record.timestampDispositivo,
    versioneApp: versione,
    nomeFile: componiNomeFile(record),
    contenutoBase64,
  };
}

async function inviaSingola(record) {
  const impostazioni = impostazioniFoto();
  if (!impostazioni.endpoint) {
    throw new Error('Endpoint non configurato: apri le impostazioni del modulo Foto');
  }
  const endpoint = normalizzaEndpoint(impostazioni.endpoint);
  // Sopra la soglia dell'invio in una richiesta si passa alle due fasi, se
  // sono state attivate: sotto non ha senso, aggiungerebbe due giri di rete.
  const soglia = impostazioni.limiteMB * 1048576;
  if (impostazioni.dueFasi && (record.byte || 0) > soglia) {
    return inviaInDueFasi(record, impostazioni, endpoint);
  }
  const contenutoBase64 = await blobInBase64(record.foto);
  const dispositivo = await idDispositivo();
  const versione = await versioneApp();
  let risposta;
  try {
    risposta = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoInvio(record, impostazioni, contenutoBase64, dispositivo, versione)),
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

// Caricamento in due fasi. Ogni passo riuscito viene scritto sul record:
// un'interruzione riprende da dove era, invece di rimandare tutto il video.
async function inviaInDueFasi(record, impostazioni, endpoint) {
  const versione = await versioneApp();
  const corpo = metadati(record, impostazioni, await idDispositivo(), versione);

  if (!record.byteCaricati) {
    let url = record.urlCaricamento;
    let blocco = bloccoValido(impostazioni.bloccoMB * 1048576);
    let daByte = 0;
    // Sessione già aperta da un tentativo precedente: si chiede al server
    // quanto ha davvero, invece di fidarsi del nostro conteggio — l'ultimo
    // blocco può essere partito e non arrivato. Se il server non la
    // riconosce più (scaduta, cancellata) si riparte dalla fase 1.
    if (url) {
      const giaCaricati = await byteGiaCaricati(url);
      if (giaCaricati === null) {
        url = '';
        record.urlCaricamento = '';
        record.byteInviati = 0;
        await coda.aggiorna(record);
      } else {
        daByte = Math.min(giaCaricati, record.byte || 0);
      }
    }
    if (!url) {
      const preparazione = await preparaCaricamento(endpoint, corpo);
      // Il flow non sa fare le due fasi: si torna all'invio in una richiesta,
      // che per un file di questa taglia probabilmente verrà rifiutato — ma
      // con un errore chiaro, non con un silenzio.
      if (preparazione.modo !== 'sessione') {
        throw new Error('Il flow non offre il caricamento a blocchi: spegni le due fasi o riducili di peso');
      }
      url = preparazione.urlCaricamento;
      blocco = preparazione.dimensioneBlocco;
      record.urlCaricamento = url;
      record.byteInviati = 0;
      daByte = 0;
      await coda.aggiorna(record);
    }
    // L'indirizzo della sessione NON si butta se un blocco fallisce: è quello
    // che permette al tentativo successivo di riprendere da dove era, invece
    // di rimandare decine di megabyte già arrivati. A buttarlo ci pensa il
    // controllo qui sopra, quando è il server a non riconoscerlo più.
    await inviaBlocchi(url, record.foto, blocco, daByte, async inviati => {
      record.byteInviati = inviati;
      await coda.aggiorna(record);
      notifica();
    });
    record.byteCaricati = true;
    await coda.aggiorna(record);
  }

  // Fase 3: i byte ci sono, mancano le colonne. Se questo passo fallisce, al
  // retry si rifà SOLO questo: byteCaricati resta vero.
  await completaCaricamento(endpoint, corpo);
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
