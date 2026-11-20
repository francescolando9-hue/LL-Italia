// Invio dei passi al flow `SegnalazioniRicevitore` e lettura dell'elenco dal
// flow `SegnalazioniElenco`.
//
// Il contratto sta nel testo dei flow preparato per Francesco (20/11/2026) ed
// è questo: POST JSON, un passo per richiesta, foto JPEG in base64 dentro la
// stessa richiesta (al massimo 3 per segnalazione). Le risposte:
//   200 ok / gia_presente           → il passo è registrato
//   409 segnalazione_sconosciuta    → l'apertura non è ancora arrivata: si riprova
//   409 gia_chiusa, gia_aperta,     → il passo NON si registrerà mai così com'è:
//       troppe_foto; 403 operatore_   non si ritenta, si dice all'operatore
//       non_ammesso
//   altro                           → errore, resta in coda e si ritenta
import * as coda from './coda.js';
import {
  impostazioniSegnalazioni, normalizzaEndpoint, salvaElenco, elencoSalvato, salvaStoria, storiaSalvata,
} from './impostazioni.js';
import { impostazioniApp } from '../../core/impostazioni.js';
import { versioneApp } from '../../core/versione.js';
import { spiegazioneStato } from '../../core/errori.js';
import { idDispositivo } from '../../core/dispositivo.js';
import { creaMotore, eGiaPresente, fetchConScadenza, messaggioScaduto } from '../../core/coda-invio.js';

// I rifiuti che non cambiano ritentando: un passo così, rimandato all'infinito,
// consumerebbe batteria e terrebbe acceso «in errore» per sempre.
export const RIFIUTI_DEFINITIVI = {
  gia_chiusa: 'Non registrato: la segnalazione era già stata chiusa.',
  gia_aperta: 'Non registrato: la segnalazione era già aperta.',
  troppe_foto: 'Non registrato: la segnalazione ha già 3 foto.',
  operatore_non_ammesso: 'Non registrato: il tuo nome non può aprire o riaprire segnalazioni.',
};

const motore = creaMotore({
  coda,
  conservaUltime: () => impostazioniSegnalazioni().conservaUltime,
  inviaRecord: record => inviaSingola(record),
  async segnaInviato(record, risposta) {
    record.idRiga = risposta.id || null;
    record.esitoServer = risposta.rifiutato || (risposta.giaPresente ? 'gia_presente' : 'ok');
    // Un rifiuto definitivo non è un invio arrivato: non si conta.
    if (risposta.rifiutato) record.nonContare = true;
    // Il passo è sul server: l'elenco va riletto, altrimenti la home continua a
    // mostrare la segnalazione come se toccasse ancora a chi l'ha appena passata.
    // Finita la lettura si avvisa la vista, che si ridisegna con l'elenco nuovo:
    // il ridisegno che segue l'invio arriva prima che la lettura finisca.
    leggiElenco().then(() => motore.notifica()).catch(() => {});
  },
});

export const { alCambiamento, avvia, riprova } = motore;

// Le foto viaggiano con un nome che il flow usa per l'allegato: le prime otto
// lettere dell'idClient e il numero della foto. Diverse fra loro nello stesso
// invio, e fisse fra un tentativo e l'altro: il flow riconosce quelle già
// caricate da un invio ripreso e non le carica due volte.
export function nomeFoto(record, indice) {
  return `${String(record.id).slice(0, 8)}-${indice + 1}`;
}

export async function corpoInvio(record, impostazioni, dispositivo, versione) {
  const foto = [];
  for (let i = 0; i < (record.foto || []).length; i += 1) {
    foto.push({ nome: nomeFoto(record, i), contenutoBase64: await blobInBase64(record.foto[i]) });
  }
  return {
    token: impostazioni.token,
    azione: record.azione,
    idClient: record.id,
    idSegnalazione: record.idSegnalazione,
    operatore: record.autore,
    passaA: record.passaA || '',
    testo: record.testo || '',
    commessa: record.commessa || '',
    ambito: record.ambito || '',
    piano: record.piano || '',
    unita: record.unita || '',
    parteComune: record.parteComune || '',
    dataIntervento: record.dataIntervento,
    idDispositivo: dispositivo,
    versioneApp: versione,
    foto,
  };
}

async function leggiEsito(risposta) {
  try {
    const dati = await risposta.clone().json();
    return (dati && dati.esito) || '';
  } catch {
    return '';
  }
}

async function inviaSingola(record) {
  const impostazioni = impostazioniSegnalazioni();
  if (!impostazioni.endpoint) {
    throw new Error('Indirizzo non configurato: apri le impostazioni del modulo Segnalazioni');
  }
  const corpo = await corpoInvio(record, impostazioni, await idDispositivo(), await versioneApp());
  let risposta;
  try {
    risposta = await fetchConScadenza(normalizzaEndpoint(impostazioni.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch (errore) {
    if (errore && errore.name === 'AbortError') throw new Error(messaggioScaduto());
    throw new Error(navigator.onLine
      ? 'Invio bloccato: nessuna risposta dall’indirizzo (rete assente o CORS)'
      : 'Rete non disponibile');
  }
  const esito = await leggiEsito(risposta);
  if (RIFIUTI_DEFINITIVI[esito]) return { rifiutato: esito };
  if (risposta.status === 409 && esito === 'segnalazione_sconosciuta') {
    throw new Error('La segnalazione non è ancora arrivata in ufficio: si riprova da sola.');
  }
  if (!risposta.ok) {
    throw new Error(`Errore del server: ${risposta.status}${spiegazioneStato(risposta.status)}`);
  }
  let id = null;
  try {
    id = Number((await risposta.clone().json()).id) || null;
  } catch {
    id = null;
  }
  return { id, giaPresente: await eGiaPresente(risposta) };
}

// --- Lettura -------------------------------------------------------------------
// Una lettura sola per volta: la home e la tessera la chiedono tutte e due
// all'apertura, e due richieste uguali in parallelo non servono a niente.
let letturaInCorso = null;

export function leggiElenco() {
  if (letturaInCorso) return letturaInCorso;
  letturaInCorso = (async () => {
    const impostazioni = impostazioniSegnalazioni();
    if (!impostazioni.endpointElenco) throw new Error('Indirizzo dell’elenco non configurato');
    if (!navigator.onLine) throw new Error('Rete non disponibile');
    const risposta = await fetchConScadenza(normalizzaEndpoint(impostazioni.endpointElenco), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: impostazioni.token, operatore: impostazioniApp.autore }),
    }, 60000);
    if (!risposta.ok) throw new Error(`Errore del server: ${risposta.status}${spiegazioneStato(risposta.status)}`);
    const dati = await risposta.json();
    if (!dati || !Array.isArray(dati.segnalazioni)) throw new Error('Risposta dell’elenco non leggibile');
    salvaElenco(dati.segnalazioni);
    return elencoSalvato();
  })().finally(() => { letturaInCorso = null; });
  return letturaInCorso;
}

export async function leggiStoria(idSegnalazione) {
  const impostazioni = impostazioniSegnalazioni();
  if (!impostazioni.endpointElenco || !navigator.onLine) return storiaSalvata(idSegnalazione);
  try {
    const risposta = await fetchConScadenza(normalizzaEndpoint(impostazioni.endpointElenco), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: impostazioni.token, operatore: impostazioniApp.autore, idSegnalazione }),
    }, 60000);
    if (!risposta.ok) return storiaSalvata(idSegnalazione);
    const dati = await risposta.json();
    if (!dati || !Array.isArray(dati.interventi)) return storiaSalvata(idSegnalazione);
    salvaStoria(idSegnalazione, dati.interventi);
    return storiaSalvata(idSegnalazione);
  } catch {
    return storiaSalvata(idSegnalazione);
  }
}

function blobInBase64(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(String(lettore.result).split(',')[1] || '');
    lettore.onerror = () => rifiuta(new Error('Lettura della foto non riuscita'));
    lettore.readAsDataURL(blob);
  });
}
