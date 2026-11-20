// Invio dei passi alla funzione `segnalazioni` e lettura dell'elenco dalla
// funzione `segnalazioni-elenco` (Azure Functions, codice in `funzioni/`).
//
// Il contratto lo fissano le regole del server (`funzioni/src/regole.js`), che il
// collaudo 29 fa girare contro l'app; nato col testo dei flow del 20/11/2026, ed
// è questo: POST JSON, un passo per richiesta. Dalla 0.44.0 il passo parte
// senza foto e ogni foto è una richiesta sua, azione `foto`, con una foto JPEG
// in base64, `idPasso` e operatore e data del passo; niente limite di foto. I
// passi rimasti in coda da una 0.43.x partono ancora con le loro foto dentro,
// come allora. Le risposte:
//   200 ok / gia_presente           → il passo (o la foto) è registrato
//   409 segnalazione_sconosciuta    → l'apertura non è ancora arrivata: si riprova
//   409 gia_chiusa, gia_aperta;     → il passo NON si registrerà mai così com'è:
//       403 operatore_non_ammesso     non si ritenta, si dice all'operatore
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
  // Dalla 0.44.0 il server non lo manda più; resta per un rifiuto di una 0.43.x
  // ancora fra i «Non registrati» di un telefono aggiornato.
  troppe_foto: 'Non registrato: la segnalazione aveva già 3 foto.',
  operatore_non_ammesso: 'Non registrato: il tuo nome non può aprire o riaprire segnalazioni.',
  // Lo decide il telefono, non il server: la foto di un passo che non si
  // registrerà mai non parte (una foto di un'apertura rifiutata cercherebbe
  // per sempre una segnalazione che non c'è).
  passo_non_registrato: 'Foto non mandata: il passo a cui apparteneva non è stato registrato.',
};

export const eFoto = record => record.azione === coda.AZIONE_FOTO;

const motore = creaMotore({
  coda,
  conservaUltime: () => impostazioniSegnalazioni().conservaUltime,
  inviaRecord: record => inviaSingola(record),
  async segnaInviato(record, risposta) {
    record.idRiga = risposta.id || null;
    record.esitoServer = risposta.rifiutato || (risposta.giaPresente ? 'gia_presente' : 'ok');
    // Un rifiuto definitivo non è un invio arrivato: non si conta.
    if (risposta.rifiutato) record.nonContare = true;
    // Una foto non è un passo: si conta a parte, e il motore non la conta fra i passi.
    if (eFoto(record)) {
      if (!risposta.rifiutato) coda.incrementaFotoInviate(1);
      record.nonContare = true;
    }
    // Il passo è sul server: l'elenco va riletto, altrimenti la home continua a
    // mostrare la segnalazione come se toccasse ancora a chi l'ha appena passata.
    // Finita la lettura si avvisa la vista, che si ridisegna con l'elenco nuovo:
    // il ridisegno che segue l'invio arriva prima che la lettura finisca.
    // Una foto non cambia chi deve intervenire: dodici foto non sono dodici
    // letture dell'elenco. Il numero delle foto lo riporta la lettura dopo.
    if (!eFoto(record)) leggiElenco().then(() => motore.notifica()).catch(() => {});
  },
});

export const { alCambiamento, avvia, riprova } = motore;

// Le foto viaggiano con un nome che il server usa per l'allegato: le prime otto
// lettere dell'idClient e il numero della foto. Diverse fra loro nello stesso
// invio, e fisse fra un tentativo e l'altro: il server riconosce quelle già
// caricate da un invio ripreso e non le carica due volte.
//
// Dalla 0.44.0 una foto singola si chiama col suo `idClient` intero: unico, fisso
// fra i tentativi, e l'archiviatore la ricollega alla sua riga negli interventi
// leggendo il nome. Le foto dentro un passo di una 0.43.x restano `idClient8-n`.
export function nomeFoto(record, indice) {
  if (eFoto(record)) return String(record.id);
  return `${String(record.id).slice(0, 8)}-${indice + 1}`;
}

export async function corpoInvio(record, impostazioni, dispositivo, versione) {
  const foto = [];
  for (let i = 0; i < (record.foto || []).length; i += 1) {
    foto.push({ nome: nomeFoto(record, i), contenutoBase64: await blobInBase64(record.foto[i]) });
  }
  if (eFoto(record)) {
    return {
      token: impostazioni.token,
      azione: record.azione,
      idClient: record.id,
      idSegnalazione: record.idSegnalazione,
      idPasso: record.idPasso,
      operatore: record.autore,
      dataIntervento: record.dataIntervento,
      idDispositivo: dispositivo,
      versioneApp: versione,
      foto,
    };
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

// Una foto parte DOPO il suo passo. Il motore manda gli elementi in ordine, ma
// un passo in errore resta indietro e il giro va avanti: senza questo controllo
// la foto arriverebbe prima del passo, e se il passo venisse poi rifiutato
// («già chiusa») la foto resterebbe attaccata a una segnalazione a cui non
// appartiene. Un passo che non c'è più nella coda è arrivato ed è stato potato.
export function attesaDelPasso(record, elementi) {
  if (!eFoto(record)) return '';
  const passo = elementi.find(r => r.id === record.idPasso);
  if (!passo) return '';
  if (passo.stato === 'inviata') return RIFIUTI_DEFINITIVI[passo.esitoServer] ? 'rifiutato' : '';
  return 'in_attesa';
}

async function inviaSingola(record) {
  const impostazioni = impostazioniSegnalazioni();
  if (!impostazioni.endpoint) {
    throw new Error('Indirizzo non configurato: apri le impostazioni del modulo Segnalazioni');
  }
  const attesa = attesaDelPasso(record, await coda.elenca());
  if (attesa === 'rifiutato') return { rifiutato: 'passo_non_registrato' };
  if (attesa === 'in_attesa') throw new Error('Aspetta il suo passo, che non è ancora arrivato: parte subito dopo.');
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
