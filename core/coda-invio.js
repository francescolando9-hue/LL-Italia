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

  async function processa() {
    if (inCorso) {
      // Una richiesta arrivata mentre si stava già lavorando non si perde:
      // si rifà il giro alla fine, invece di aprirne uno parallelo.
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
            await coda.aggiorna(record);
            coda.incrementaInviate(1);
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

  return { alCambiamento, avvia, riprova, notifica };
}
