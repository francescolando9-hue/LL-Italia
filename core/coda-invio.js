// Il motore della coda di invio, uno per tutti i moduli.
//
// Sposta gli elementi da «in coda» a «inviata», uno per volta, e li lascia
// dov'erano se qualcosa va storto: un elemento esce dalla coda SOLO a conferma
// del server. È il cuore della promessa «lo scatto non si perde», e per questo
// non deve esistere in due copie.
//
// Fino a ieri esisteva in due: quella delle bolle e quella delle foto, nate
// uguali e già divergenti nei dettagli — una scriveva `else` su una riga,
// l'altra su tre, ma soprattutto le spiegazioni degli errori si erano
// separate senza che nessuno se ne accorgesse. Una correzione fatta su una
// copia e non sull'altra, in un pezzo di codice che decide se una bolla di
// consegna si perde, è un difetto che non si vede finché non costa.
//
// Quello che cambia da modulo a modulo lo porta il descrittore: come si
// spedisce un elemento, cosa si fa dopo un invio riuscito, quali elementi
// vanno sistemati prima di partire. Il motore non sa, e non deve sapere, che
// le bolle hanno uno storico e le foto no.

// La risposta del flow quando l'elemento c'è già: la guardia sui duplicati
// risponde 200 con `gia_presente` nel corpo. Serve a «Rimanda» senza
// modifiche, che riusa lo stesso idClient proprio per farsi dire questo.
//
// Si riconosce dal CONTENUTO e non dal nome del campo, perché **il nome del
// campo non è documentato**: il briefing del ricevente dice «200
// `gia_presente`» e si ferma lì. Inventare `{ esito: … }` sarebbe dare per
// certo un dato che nessuno ha verificato, e sbagliarlo qui significa dire
// all'operatore «è un invio nuovo» quando era un doppione. Da stringere
// quando il ricevente conferma la forma esatta del corpo.
//
// Non riconoscerlo non fa danni: la foto è arrivata comunque e il flow non ha
// creato doppioni. Si perde solo la frase all'operatore.
export async function eGiaPresente(risposta) {
  try {
    const testo = await risposta.clone().text();
    return /gia_presente/i.test(testo);
  } catch {
    return false;
  }
}

// Il tetto oltre il quale una richiesta si considera appesa, non lenta.
//
// Non è un obiettivo di prestazione: è la differenza fra «ci mette tanto» e
// «non finirà mai». Senza, una `fetch` che non risponde più resta pendente
// finché la pagina vive, il record resta su «Invio in corso», e il motore —
// che lavora un elemento per volta — non va avanti. Il difetto misurato il
// 29/09/2026: un elemento fermo su «Invio in corso» per sette giorni.
//
// Otto minuti è largo di proposito. Un video di 27 MB su una linea da
// 2 Mbit/s ci mette un minuto e mezzo di solo caricamento, e in cantiere la
// linea è peggio; il flow ha comunque una finestra di 120 secondi, quindi una
// richiesta che passa gli otto minuti non aveva nessuna possibilità di
// riuscire. Meglio un tetto che non taglia mai un invio buono e taglia
// sicuramente quelli morti.
//
// Si può accorciare da `localStorage` (`llitalia.scadenzaInvioMs`): serve al
// supporto su un telefono che si comporta male, e serve ai collaudi — un
// tetto di otto minuti non si prova aspettando otto minuti.
export const SCADENZA_INVIO_MS = 8 * 60 * 1000;

export function scadenzaInvioMs() {
  try {
    const scritta = Number(localStorage.getItem('llitalia.scadenzaInvioMs'));
    if (Number.isFinite(scritta) && scritta >= 1000) return scritta;
  } catch {
    // localStorage non disponibile: vale il valore predefinito.
  }
  return SCADENZA_INVIO_MS;
}

// `fetch` con un tetto di tempo. L'errore che ne esce ha `name` `AbortError`,
// e chi chiama lo distingue da «rete assente» perché all'operatore sono due
// cose diverse: una si risolve spostandosi, l'altra no.
export function fetchConScadenza(indirizzo, opzioni = {}, scadenza = scadenzaInvioMs()) {
  if (typeof AbortController !== 'function') return fetch(indirizzo, opzioni);
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), scadenza);
  return fetch(indirizzo, { ...opzioni, signal: controllo.signal })
    .finally(() => clearTimeout(timer));
}

// Il messaggio per un invio scaduto: dice quanto si è aspettato, perché
// «non ha risposto» senza un tempo non aiuta chi deve decidere se riprovare.
export function messaggioScaduto(scadenza = scadenzaInvioMs()) {
  const minuti = Math.round(scadenza / 60000);
  return minuti >= 1
    ? `Invio interrotto: nessuna risposta dopo ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}. Resta in coda e si riprova.`
    : `Invio interrotto: nessuna risposta dopo ${Math.round(scadenza / 1000)} secondi. Resta in coda e si riprova.`;
}

const RITARDO_MINIMO_MS = 5000;
const RITARDO_MASSIMO_MS = 5 * 60 * 1000;

export function creaMotore(descrittore) {
  const {
    coda,             // il modulo coda: elenca, aggiorna, incrementaInviate, potaInviate
    conservaUltime,   // () => quante inviate tenere sul telefono
    inviaRecord,      // async (record) => risposta ({ id } o niente)
    preparaRecord,    // async (record) => void — facoltativo: sistemazioni prima dell'invio
    segnaInviato,     // async (record, risposta) => void — facoltativo: storico, id del server
  } = descrittore;

  let inCorso = false;
  let recuperoFatto = false;
  let richiestaRiprocesso = false;
  let timerRetry = null;
  let ritardoMs = RITARDO_MINIMO_MS;
  let ascoltatore = () => {};

  // La vista si registra per ridisegnarsi a ogni cambio di stato della coda.
  function alCambiamento(funzione) {
    ascoltatore = funzione;
  }

  function notifica() {
    ascoltatore();
  }

  // Avvio (o riavvio) dell'invio: a ogni apertura, al ritorno della rete,
  // dopo Invia e sul retry manuale. Azzera il backoff.
  function avvia() {
    if (timerRetry) {
      clearTimeout(timerRetry);
      timerRetry = null;
    }
    ritardoMs = RITARDO_MINIMO_MS;
    processa();
  }

  // Retry manuale di un singolo elemento in errore.
  async function riprova(id) {
    const record = (await coda.elenca()).find(r => r.id === id);
    if (record && record.stato === 'errore') {
      record.stato = 'in_coda';
      record.ultimoErrore = '';
      await coda.aggiorna(record);
      notifica();
    }
    avvia();
  }

  // Un elemento su «invio» all'avvio di una sessione è, per definizione,
  // INTERROTTO: quello stato è vero solo finché vive la pagina che ha avviato
  // la richiesta, e quella pagina non c'è più. Finora restava lì: il filtro
  // degli invii prende «in_coda» e «errore», non «invio», quindi non veniva
  // mai ripreso — e nella vista non aveva né «Riprova» né «Rimanda», perché
  // quelli si accendono su «errore» e su «inviata». Un elemento così è
  // invisibile all'app e mancante a destinazione: il 29/09/2026 uno è rimasto
  // fermo sette giorni, segnalato ogni giorno come buco di continuità.
  //
  // Si rimette in coda e riparte da solo. **Rimandare è sicuro**: il flow
  // riconosce un `idClient` già visto e risponde `gia_presente` senza creare
  // un secondo file (provato sul campo il 29/09/2026). Fra un pulsante da
  // premere e una ripartenza automatica si sceglie la seconda proprio per
  // questo: la promessa della coda è che lo scatto non si perda, e aspettare
  // che qualcuno se ne accorga un elemento fermo è il modo in cui si è perso.
  //
  // Il caricamento a blocchi NON si azzera: `urlCaricamento` e `byteInviati`
  // restano, e la ripresa chiede al server quanti byte ha davvero. Ricominciare
  // da zero un video quasi finito sarebbe il contrario di quello che serve.
  //
  // Una sola volta per sessione, prima del primo giro: dopo, un elemento su
  // «invio» è quello che il motore sta lavorando adesso.
  async function recuperaInterrotti() {
    const interrotti = (await coda.elenca()).filter(r => r.stato === 'invio');
    for (const record of interrotti) {
      record.stato = 'in_coda';
      record.ripreso = true;
      record.ultimoErrore = '';
      await coda.aggiorna(record);
    }
    if (interrotti.length > 0) notifica();
    return interrotti.length;
  }

  async function processa() {
    if (inCorso) {
      // Una richiesta arrivata mentre si stava già lavorando non si perde:
      // si rifà il giro alla fine, invece di aprirne uno parallelo.
      richiestaRiprocesso = true;
      return;
    }
    inCorso = true;
    try {
      if (!recuperoFatto) {
        recuperoFatto = true;
        await recuperaInterrotti();
      }
      do {
        richiestaRiprocesso = false;
        const daInviare = (await coda.elenca())
          .filter(r => r.stato === 'in_coda' || r.stato === 'errore');
        let falliti = false;
        for (const record of daInviare) {
          // Senza rete gli elementi restano «In coda», non vanno in errore:
          // non c'è nessun guasto da segnalare, si ritenta al ritorno della
          // connettività (evento online) o col timer di backoff.
          if (!navigator.onLine) {
            falliti = daInviare.length > 0;
            break;
          }
          if (preparaRecord) await preparaRecord(record);
          record.stato = 'invio';
          record.ultimoErrore = '';
          await coda.aggiorna(record);
          notifica();
          try {
            const risposta = (await inviaRecord(record)) || {};
            record.stato = 'inviata';
            record.inviatoIl = Date.now();
            // Prima di potare: quello che deve sopravvivere alla foto — lo
            // storico delle bolle — si scrive adesso, perché la foto verrà
            // eliminata dal dispositivo.
            if (segnaInviato) await segnaInviato(record, risposta);
            // Un «Rimanda la stessa» non aggiunge niente in raccolta: il flow
            // riconosce l'idClient e risponde `gia_presente`. Contarlo fra le
            // «inviate oggi» gonfierebbe l'unico numero che serve a dimostrare
            // che nulla si è perso — quello da confrontare con i file atterrati
            // — e un collaudo che non torna per un motivo innocuo è un
            // collaudo che poi nessuno guarda.
            const daContare = !record.nonContare;
            record.nonContare = false;
            await coda.aggiorna(record);
            if (daContare) coda.incrementaInviate(1);
            await coda.potaInviate(conservaUltime());
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

  // Backoff esponenziale: 5 s, 10 s, 20 s… fino a 5 minuti. Serve a non
  // consumare batteria e dati in cantiere quando il magazzino non risponde.
  function pianificaRetry() {
    if (timerRetry) return;
    timerRetry = setTimeout(() => {
      timerRetry = null;
      processa();
    }, ritardoMs);
    ritardoMs = Math.min(ritardoMs * 2, RITARDO_MASSIMO_MS);
  }

  return { alCambiamento, avvia, riprova, notifica, recuperaInterrotti };
}
