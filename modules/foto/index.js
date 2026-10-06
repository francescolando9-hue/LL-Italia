// Modulo Foto: foto di cantiere verso l'archivio di commessa.
// Capture-only come Bolle: raccoglie e invia, non legge nulla del contenuto.
//
// Dal 29/09/2026 non c'è più niente da scegliere sul TIPO di foto: la
// distinzione Avanzamento / Archivio è stata tolta da Francesco — tutto
// quello che parte da qui va in archivio, e per le urgenze si usa WhatsApp.
// Ogni immagine parte quindi a risoluzione originale, e il campo `tipo` del
// payload vale sempre `ARCHIVIO` (vedi `categorie.js`: si è tolta la scelta,
// non il campo).
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { fotocameraDisponibile, apriFotocamera } from '../../core/fotocamera.js';
import { naviga } from '../../core/router.js';
import { messaggioSalvataggio, memoriaPiena } from '../../core/errori.js';
import { timestampDispositivo } from '../../core/orario.js';
import { dataScattoDaFoto, spiegazioneMotivo } from '../../core/exif.js';
import { fileInMemoria, eLetturaNegata, descriviLettura } from '../../core/byte.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
import {
  sincronizzaLivelli, campiLivelli, etichettaFaseOLotto, eUrbanizzazione, VERSIONE_ANAGRAFICA, azzeraFase,
} from '../../core/anagrafica.js';
import { TIPO_ARCHIVIO, etichettaCategoria } from './categorie.js';
import { preparaImmagine, creaAnteprima } from './immagini.js';
import { eVideo, estensioneDi, anteprimaVideo, durataLeggibile } from './video.js';
import { impostazioniFoto, salvaImpostazioniFoto } from './impostazioni.js';
import * as coda from './coda.js';
import * as invio from './invio.js';
import { vistaImpostazioniFoto } from './vista-impostazioni.js';
import { vistaConfigura, vistaCondividi } from './configurazione.js';

// Le classi sono quelle del design system in core/ui.css, le stesse del
// modulo Bolle. Vanno tenute allineate a quel foglio: `badge-attesa` e
// `badge-ok`, usate qui prima, non esistevano, e lo stato «Inviata» usciva
// senza colore — chi collaudava non aveva conferma visiva che la foto fosse
// arrivata, mentre l'errore si vedeva perché la sua classe c'era.
const ETICHETTE_STATO = {
  in_coda: { testo: 'In coda', classe: 'badge-coda' },
  invio: { testo: 'Invio in corso', classe: 'badge-invio' },
  inviata: { testo: 'Inviata', classe: 'badge-inviata' },
  errore: { testo: 'Errore', classe: 'badge-errore' },
};

let radice = null;
let urlAperti = [];

// I livelli scelti (o derivati) all'ultimo ridisegno: `invia()` li prende da
// qui invece di rileggere i menù, così il valore che parte è esattamente
// quello su cui il ridisegno ha deciso di sbloccare il pulsante.
let livelliCorrenti = { piano: null, unita: null, prospetto: null, mancanti: [] };

// I file scelti dalla galleria che NON hanno l'ora dello scatto: restano qui,
// fuori dalla coda, finché l'operatore non decide. Sono quasi sempre copie
// ridotte — Google Foto dopo «Libera spazio», WhatsApp — e il 17/09/2026 cinque
// di queste sono finite in archivio con l'ora dell'invio al posto dell'ora
// dello scatto: se scatto e invio cadono in due mesi diversi la foto va nella
// cartella del mese sbagliato, e non lo segnala nessuno.
//
// Non sono in coda di proposito: un file scelto dalla galleria è ancora nella
// galleria, quindi qui non si perde niente — mentre accodarlo in silenzio
// significherebbe archiviare un'ora falsa. Le foto SCATTATE dall'app non
// passano mai da qui: quelle l'ora ce l'hanno.
//
// **Dalla 0.37.4 la lista tiene anche i file che non si sono potuti LEGGERE**,
// che sono un'altra cosa e vanno detti in un altro modo: lì la foto è a posto
// e l'ora ce l'ha, è il telefono che non ha lasciato leggere i byte. Ogni
// voce porta quindi il suo `gruppo`, e a video ogni gruppo ha la SUA frase in
// testa — non una frase comune, che per tre casi su quattro sarebbe falsa.
let senzaData = [];

// I casi, raggruppati per quello che l'operatore deve FARE. La frase in testa
// è quella del gruppo; le righe di diagnosi restano una per file.
//
// `mandabile: false` sul gruppo della lettura: «Aggiungi comunque» là sarebbe
// un danno, perché manderebbe la foto con un'ora stimata mentre quella vera
// sta dentro il file, a due tentativi di distanza.
const GRUPPI = {
  lettura: {
    mandabile: false,
    titolo: una => una
      ? 'Il telefono non ha lasciato leggere questa foto all’app.'
      : 'Il telefono non ha lasciato leggere queste foto all’app.',
    seguito: una => una
      ? 'La foto è a posto: riprova a sceglierla, oppure usa <strong>Scatta</strong>.'
      : 'Le foto sono a posto: riprova a sceglierle, oppure usa <strong>Scatta</strong>.',
    spiegazione: () => 'Succede quando il riferimento al file scade fra una lettura e l’altra: '
      + 'l’app ha già riprovato da sola, senza riuscirci. Non è un problema della foto, '
      + 'e l’ora dello scatto dentro il file c’è: per questo non si manda «comunque».',
  },
  copia: {
    mandabile: true,
    titolo: una => una ? 'Questa foto non ha la data di scatto.' : 'Queste foto non hanno la data di scatto.',
    seguito: una => `Cerca ${una ? 'l’originale' : 'gli originali'} nell’album <strong>Fotocamera</strong>: lì la data c’è.`,
    spiegazione: una => `${una ? 'È' : 'Sono'} quasi certamente ${una ? 'una copia ridotta' : 'copie ridotte'} `
      + '(Google Foto, WhatsApp): nel file non c’è nessun dato della fotocamera.',
  },
  formato: {
    mandabile: true,
    titolo: una => una ? 'Questo file non è una foto JPEG.' : 'Questi file non sono foto JPEG.',
    seguito: una => `Cerca ${una ? 'l’originale' : 'gli originali'} nell’album <strong>Fotocamera</strong>, oppure usa <strong>Scatta</strong>.`,
    spiegazione: () => 'Da un HEIC o da un PNG l’app non sa leggere l’ora dello scatto. '
      + 'La foto si può mandare lo stesso — viene convertita in JPEG — ma con l’ora stimata.',
  },
  senzaOra: {
    mandabile: true,
    titolo: una => una
      ? 'Di questa foto ci sono i dati della fotocamera, ma non l’ora dello scatto.'
      : 'Di queste foto ci sono i dati della fotocamera, ma non l’ora dello scatto.',
    seguito: una => `Cerca ${una ? 'l’originale' : 'gli originali'} nell’album <strong>Fotocamera</strong>: lì l’ora di solito c’è.`,
    spiegazione: () => 'Capita su una foto ritagliata o ri-salvata: il programma che l’ha riscritta '
      + 'ha tenuto marca e modello e ha perso l’ora.',
  },
  orologio: {
    mandabile: true,
    titolo: una => una
      ? 'L’orologio del telefono non era impostato quando questa foto è stata scattata.'
      : 'L’orologio del telefono non era impostato quando queste foto sono state scattate.',
    seguito: () => 'L’ora scritta nel file non è credibile, quindi non si usa.',
    spiegazione: una => `Se ${una ? 'la mandi' : 'le mandi'} comunque, in archivio `
      + `${una ? 'va' : 'vanno'} con la data del file e dichiarata stimata.`,
  },
};

// Dal motivo tecnico al gruppo. La corrispondenza si fa sul PREFISSO, come in
// `spiegazioneMotivo`: quattro motivi portano in coda il valore che hanno
// letto, e quel valore serve nella riga di diagnosi.
// Una riga per file: nome, peso, tipo DICHIARATO dal selettore, il motivo in
// italiano e quello tecnico. Sono i fatti che da uno screenshot non si
// indovinano, e che decidono quale dei dieci casi è.
function rigaPerche(voce) {
  const tipo = voce.file.type || 'tipo non dichiarato';
  return `<li><strong>${scappaHtml(voce.file.name || 'file')}</strong>
    <span class="tenue">— ${pesoLeggibile(voce.file.size)}, ${scappaHtml(tipo)}</span><br>
    ${scappaHtml(spiegazioneMotivo(voce.motivo))}
    <span class="tenue">(${scappaHtml(voce.motivo || 'motivo non registrato')}${
      voce.dettaglio ? ` · ${scappaHtml(voce.dettaglio)}` : ''})</span></li>`;
}

// Esportata per il collaudo: il controllo che conta è che un motivo di
// LETTURA non finisca in un gruppo mandabile — sarebbe il difetto del
// 30/09/2026 rimesso dentro, con «Aggiungi comunque» sopra una foto che l'ora
// ce l'ha. Un motivo nuovo che non si riconosce cade in `copia`, che è il
// ripiego prudente: dice «manca la data» e lascia mandare.
export function gruppoDiMotivo(motivo) {
  const testo = String(motivo || '');
  if (testo.startsWith('i byte del file non si sono potuti leggere')
    || testo.startsWith('lettura dei byte non riuscita')
    || testo.startsWith('file non leggibile')) return 'lettura';
  if (testo.startsWith('non è un JPEG')) return 'formato';
  if (testo.startsWith('EXIF presente ma senza') || testo.startsWith('DateTimeOriginal')) return 'senzaOra';
  if (testo.startsWith('data assurda') || testo.startsWith('data nel futuro')) return 'orologio';
  // Restano «nessun blocco EXIF» e la lettura EXIF finita male su byte
  // arrivati: in tutti e due i casi nel file non c'è niente da leggere, e la
  // via d'uscita è la stessa.
  return 'copia';
}

// L'id della foto inviata che si sta rimandando, o stringa vuota. Il riquadro
// sta FUORI dalla lista della coda e si ricostruisce solo quando cambia questo
// valore: dentro la lista, che si ridisegna a ogni cambio di stato di un
// invio, le correzioni appena scritte verrebbero cancellate a metà.
let rimandoAperto = '';

function assicuraStile() {
  if (document.getElementById('stile-foto')) return;
  const link = document.createElement('link');
  link.id = 'stile-foto';
  link.rel = 'stylesheet';
  link.href = './modules/foto/foto.css';
  document.head.appendChild(link);
}

function urlFoto(blob) {
  const url = URL.createObjectURL(blob);
  urlAperti.push(url);
  return url;
}

function revocaUrl() {
  for (const url of urlAperti) URL.revokeObjectURL(url);
  urlAperti = [];
}

// Il comando sta in fondo allo schermo, il messaggio in cima alla scheda: se
// non lo si porta sotto gli occhi, chi preme vede l'app non fare niente.
function portaInVista(elemento) {
  if (elemento && typeof elemento.scrollIntoView === 'function') {
    elemento.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// I livelli sulla riga della coda: sono il percorso in cui la foto finirà sul
// server, e leggerli è il solo modo che ha l'operatore di accorgersi di un
// piano sbagliato prima che l'archivio se lo porti dietro.
function scritturaLivelli(record) {
  const pezzi = [record.piano, record.unita, record.prospetto].filter(Boolean);
  return pezzi.length > 0 ? ` \u00b7 ${pezzi.join(' \u00b7 ')}` : '';
}

function pesoLeggibile(byte) {
  if (!byte) return '';
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1)} MB` : `${Math.round(byte / 1024)} KB`;
}

async function vista(el) {
  if (!impostazioniApp.autore) {
    naviga('#/benvenuto', true);
    return;
  }
  assicuraStile();
  radice = el;
  const impostazioni = impostazioniFoto();

  const notaCommessa = CANTIERI.some(c => c.codice === impostazioni.ultimaCommessa);
  const segnapostoCommessa = notaCommessa ? '' : '<option value="" selected>— scegli il cantiere —</option>';
  const opzioniCommessa = segnapostoCommessa + CANTIERI.map(c =>
    `<option value="${scappaHtml(c.codice)}"${c.codice === impostazioni.ultimaCommessa ? ' selected' : ''}>${scappaHtml(c.etichetta)}</option>`
  ).join('');

  el.innerHTML = `
    <div id="foto-contatori" class="foto-contatori"></div>
    <section class="scheda">
      <div class="campo">
        <label for="commessa">Cantiere</label>
        <select id="commessa" required>${opzioniCommessa}</select>
      </div>
      <!-- Fase (o lotto), piano, unità e prospetto: il blocco sta nella shell,
           perché è lo stesso del modulo Bolle e perché gli id sono un
           contratto con la funzione che li accende e li spegne secondo
           l'anagrafica. -->
      ${campiLivelli()}
      <p class="didascalia-alternative">Altri modi per aggiungere foto o video</p>
      <div class="azioni-alternative">
        ${fotocameraDisponibile()
          ? '<label class="btn btn-secondario btn-minore" for="input-camera">&#128247; Usa la fotocamera del telefono</label>'
          : ''}
        <label class="btn btn-secondario btn-minore" for="input-video">&#127909; Registra un video</label>
        <label class="btn btn-secondario btn-minore" for="input-galleria">&#128194; Scegli dalla galleria</label>
      </div>
      <input id="input-camera" class="nascosto" type="file" accept="image/*" capture="environment">
      <input id="input-video" class="nascosto" type="file" accept="video/*" capture="environment">
      <input id="input-galleria" class="nascosto" type="file" accept="image/*,video/*" multiple>
      <div id="avviso-foto"></div>
      <div id="avviso-senza-data"></div>
      <div id="anteprime" class="foto-anteprime"></div>
      <div class="campo" id="campo-nota">
        <label for="nota">Nota (facoltativa)</label>
        <input id="nota" type="text" maxlength="255" placeholder="Es. Getto solaio piano 3 completato">
        <p class="aiuto tenue">Vale per tutte le foto di questo invio.</p>
      </div>
    </section>
    <section class="scheda">
      <h2>Coda invii</h2>
      <div id="coda-azioni"></div>
      <ul id="lista-coda" class="foto-coda"></ul>
      <div id="riquadro-rimando"></div>
    </section>
    <p style="text-align:center"><a class="tenue" href="#/foto/impostazioni">Impostazioni del modulo Foto</a></p>
    <div class="spazio-barra" aria-hidden="true"></div>
    <div class="barra-comandi">
      <div id="avviso-invio" class="barra-avviso"></div>
      ${fotocameraDisponibile()
        ? '<button id="apri-fotocamera" class="btn btn-primario" type="button">&#128247; Scatta</button>'
        : '<label class="btn btn-primario" for="input-camera">&#128247; Scatta</label>'}
      <button id="invia" class="btn btn-successo" disabled>Invia</button>
    </div>
  `;

  el.querySelector('#commessa').addEventListener('change', () => { ridisegna(); });
  el.querySelector('#fase').addEventListener('change', () => { ridisegna(); });
  for (const id of ['#piano', '#unita', '#prospetto']) {
    el.querySelector(id).addEventListener('change', () => { ridisegna(); });
  }
  const pulsanteScatto = el.querySelector('#apri-fotocamera');
  if (pulsanteScatto) pulsanteScatto.addEventListener('click', apriScatto);
  el.querySelector('#input-camera').addEventListener('change', gestisciFile);
  el.querySelector('#input-video').addEventListener('change', gestisciFile);
  el.querySelector('#input-galleria').addEventListener('change', gestisciFile);
  el.querySelector('#invia').addEventListener('click', invia);

  await ridisegna();
  invio.avvia();
}

// Da dove arriva un file cambia cosa si sa della sua ora, ed è l'unica cosa
// che lo dice: `input-camera` è la fotocamera del telefono aperta DALL'APP —
// la foto è stata scattata in questo momento, l'ora del file dista secondi
// dallo scatto anche se l'EXIF manca. Dalla galleria no: lì un file senza EXIF
// può essere di tre mesi fa.
async function gestisciFile(evento) {
  const input = evento.target;
  const file = [...input.files];
  input.value = '';
  await aggiungiFile(file, input.id === 'input-camera' ? 'fotocamera-telefono' : 'galleria');
}

// Fotocamera interna: si scatta più volte di fila senza uscire dall'app.
// Qui non c'è raggruppamento — ogni foto è una foto — ma il gesto è lo stesso
// del modulo Bolle, così chi usa l'app impara una sola cosa.
async function apriScatto() {
  const avviso = radice.querySelector('#avviso-foto');
  let esito;
  try {
    esito = await apriFotocamera({
      titolo: 'Foto di cantiere',
      suggerimento: 'Risoluzione originale: scatta pure più foto, poi tocca Fine.',
    });
  } catch (errore) {
    avviso.innerHTML = `<p class="avviso avviso-attenzione">${scappaHtml(errore.message)}.</p>`;
    portaInVista(avviso);
    radice.querySelector('#input-camera').click();
    return;
  }
  // Fatte adesso, qui: l'ora dello scatto non va cercata nell'EXIF (un
  // fotogramma uscito da un canvas non ne ha) perché si sa già.
  await aggiungiFile(esito.file, 'fotocamera-app');
}

// L'ora di uno scatto fatto dentro l'app. Il File viene costruito nell'istante
// in cui si preme il pulsante, e `lastModified` è quell'istante: contano i
// minuti, perché con la fotocamera interna si scattano dieci foto di fila e si
// tocca Fine dopo — con l'ora del Fine risulterebbero tutte fatte insieme.
// Se il valore manca o è fuori scala si usa l'orologio di adesso: resta un'ora
// misurata, non stimata, perché lo scatto è appena avvenuto.
function oraDelloScatto(file) {
  const quando = Number(file && file.lastModified);
  const plausibile = Number.isFinite(quando) && Math.abs(Date.now() - quando) < 12 * 3600 * 1000;
  return plausibile ? timestampDispositivo(new Date(quando)) : timestampDispositivo();
}

// Sotto il 2020 la data di un file di cantiere non è una data: è un orologio
// azzerato, o un file passato per troppe mani. Meglio l'ora dell'invio, che
// almeno si sa cos'è.
const ANNO_MINIMO_RIPIEGO = 2020;

// La data di ripiego per una foto che non ha l'ora dello scatto: `lastModified`
// se è plausibile — non nel futuro, non prima del 2020 — altrimenti l'ora
// dell'invio. Regola data da Francesco il 18/09/2026. La data del file è quasi
// sempre molto più vicina allo scatto dell'ora in cui si preme Invia: una copia
// ridotta viene creata poco dopo lo scatto, e conserva quella.
function oraDiRipiego(file) {
  const quando = Number(file && file.lastModified);
  const plausibile = Number.isFinite(quando) && quando <= Date.now()
    && new Date(quando).getFullYear() >= ANNO_MINIMO_RIPIEGO;
  return plausibile ? timestampDispositivo(new Date(quando)) : timestampDispositivo();
}

// L'ora dello scatto, e se è misurata o stimata. Tre casi, che vanno tenuti
// distinti perché a valle servono distinti:
//
//  - scattata DENTRO l'app: l'istante lo conosce l'app, è lei che scatta.
//    Misurata, `scattoStimato` = 'NO'. Niente EXIF da leggere: un fotogramma
//    uscito da un canvas non ne ha.
//  - scattata dalla fotocamera del telefono aperta dall'app: l'EXIF di solito
//    c'è; se manca, la foto è comunque di un istante fa e l'ora del file dista
//    secondi. Misurata anche questa.
//  - scelta dalla galleria: l'EXIF è l'unica fonte. Se manca non si inventa
//    niente — si ferma e si chiede (`senzaData`).
//
// L'EXIF si legge PRIMA di `preparaImmagine`: la compressione dell'avanzamento
// passa per un canvas, e dal canvas l'EXIF non esce. Leggerla dopo vorrebbe
// dire non leggerla affatto.
async function oraDiScatto(file, provenienza) {
  // L'operatore ha già visto l'avviso e ha scelto di mandarla comunque:
  // l'EXIF non c'è, si è già cercato, non si rilegge.
  if (provenienza === 'ripiego') {
    return { dataScatto: oraDiRipiego(file), scattoStimato: 'SI' };
  }
  if (provenienza === 'fotocamera-app') {
    return { dataScatto: oraDelloScatto(file), scattoStimato: 'NO' };
  }
  const esito = await dataScattoDaFoto(file);
  if (esito.dataScatto) return { dataScatto: esito.dataScatto, scattoStimato: 'NO' };
  if (provenienza === 'fotocamera-telefono') {
    return { dataScatto: oraDelloScatto(file), scattoStimato: 'NO' };
  }
  return {
    dataScatto: '', scattoStimato: 'SI', senzaData: true,
    motivo: esito.motivo, dettaglio: esito.dettaglio,
  };
}

async function aggiungiFile(file, provenienza = 'galleria') {
  if (file.length === 0) return;
  const avviso = radice.querySelector('#avviso-foto');
  avviso.innerHTML = `<p class="avviso avviso-info">Preparazione di ${file.length} file&hellip;</p>`;
  const errori = [];
  const troppoGrandi = [];
  const impostazioni = impostazioniFoto();
  // Con le due fasi il tetto è molto più alto: il vincolo non è più la taglia
  // della richiesta ma il tempo di caricamento.
  const limiteMB = impostazioni.dueFasi ? impostazioni.limiteDueFasiMB : impostazioni.limiteMB;
  const limiteByte = limiteMB * 1048576;
  for (const singolo of file) {
    try {
      if (eVideo(singolo)) {
        // Il video non si comprime nel browser: se supera il tetto, si dice
        // subito invece di accodarlo e farlo ritentare a vuoto per sempre.
        if (singolo.size > limiteByte) {
          troppoGrandi.push(pesoLeggibile(singolo.size));
          continue;
        }
        const { anteprima, durata } = await anteprimaVideo(singolo);
        // Punto aperto dichiarato: l'ora di ripresa di un video sta nel
        // contenitore (`mvhd`), non nell'EXIF, e fra MP4 e MOV non è scritta
        // con le stesse convenzioni di fuso. Finché non è letta davvero, il
        // video parte con l'ora di accodamento e `scattoStimato` = 'SI'.
        await coda.aggiungiBozza(singolo, anteprima, singolo.name, TIPO_ARCHIVIO, {
          genere: 'video', estensione: estensioneDi(singolo), durata,
        });
        continue;
      }
      // **Una lettura sola, subito** (dalla 0.37.4). Da qui in poi si lavora
      // su una copia in memoria: EXIF, firma, preparazione, anteprima e copia
      // in IndexedDB leggevano ognuna il `File` del selettore, e su Android
      // quel riferimento può decadere fra una lettura e l'altra — è il caso
      // del 30/09/2026, due foto rifiutate a mezzogiorno e partite la sera
      // senza toccarle. Se la lettura non riesce nemmeno dopo i tentativi, il
      // file si mette da parte con il SUO caso: la foto è a posto e l'ora ce
      // l'ha, quindi «Aggiungi comunque» sarebbe la cosa sbagliata.
      let leggibile;
      try {
        leggibile = await fileInMemoria(singolo);
      } catch (errore) {
        if (!eLetturaNegata(errore)) throw errore;
        senzaData.push({
          file: singolo, provenienza, gruppo: 'lettura',
          motivo: `i byte del file non si sono potuti leggere: ${errore.name || 'errore'}`,
          dettaglio: descriviLettura(errore),
        });
        continue;
      }
      // Prima la data, poi la preparazione: dopo, l'EXIF non c'è più.
      const quando = await oraDiScatto(leggibile, provenienza);
      // Senza ora dello scatto la foto NON entra in coda: si mette da parte e
      // si chiede. Accodarla e stimare in silenzio è esattamente il difetto
      // misurato il 17/09/2026.
      if (quando.senzaData) {
        // Col file si tiene il MOTIVO: sono nove casi diversi, e fino alla
        // 0.37.1 uscivano a video con una frase sola. Su tre foto di Paolo
        // quella frase non distingueva «non c'è nessun EXIF» da «l'EXIF c'è
        // ma senza data» — due cause diverse, e uno screenshot che non
        // rispondeva a nessuna delle due.
        senzaData.push({
          file: leggibile, provenienza, gruppo: gruppoDiMotivo(quando.motivo),
          motivo: quando.motivo, dettaglio: quando.dettaglio,
        });
        continue;
      }
      const preparata = await preparaImmagine(leggibile);
      if (preparata.size > limiteByte) {
        troppoGrandi.push(pesoLeggibile(preparata.size));
        continue;
      }
      const anteprima = await creaAnteprima(leggibile);
      await coda.aggiungiBozza(preparata, anteprima, singolo.name, TIPO_ARCHIVIO, {
        genere: 'foto', estensione: 'jpg',
        dataScatto: quando.dataScatto, scattoStimato: quando.scattoStimato,
      });
    } catch (errore) {
      // Con la memoria piena il messaggio del browser è in inglese e nel suo
      // gergo: qui il file NON è entrato in coda, e serve che si capisca.
      if (memoriaPiena(errore)) {
        errori.push(messaggioSalvataggio(errore, 'la foto'));
        break;
      }
      // Una lettura negata che arriva fin qui — dalla decodifica, dalla copia
      // in IndexedDB — è lo stesso caso di prima e va detta allo stesso modo.
      // Fino alla 0.37.3 usciva come «Formato immagine non supportato da
      // questo dispositivo»: stessa causa, un'altra frase, e l'operatore
      // mandato a cercare un originale che aveva già in mano.
      if (eLetturaNegata(errore)) {
        senzaData.push({
          file: singolo, provenienza, gruppo: 'lettura',
          motivo: `i byte del file non si sono potuti leggere: ${errore.name || 'errore'}`,
          dettaglio: descriviLettura(errore),
        });
        continue;
      }
      errori.push(`${singolo.name || 'file'}: ${messaggioSalvataggio(errore, 'la foto')}`);
    }
  }
  const messaggi = [];
  if (troppoGrandi.length) {
    messaggi.push(`<p class="avviso avviso-attenzione">${troppoGrandi.length === 1
      ? `Un file da ${scappaHtml(troppoGrandi[0])} supera il limite di ${limiteMB} MB e non è stato aggiunto: registra un video più corto.`
      : `${troppoGrandi.length} file superano il limite di ${limiteMB} MB e non sono stati aggiunti: registra video più corti.`}</p>`);
  }
  if (errori.length) messaggi.push(`<p class="avviso avviso-errore">${scappaHtml(errori.join(' · '))}</p>`);
  avviso.innerHTML = messaggi.join('');
  await ridisegna();
}

// «Invia comunque»: le foto messe da parte entrano in coda con la data di
// ripiego e `scattoStimato` = 'SI'. Ripassano da `aggiungiFile` invece di
// avere una strada propria, così il limite di peso, la preparazione
// dell'immagine e la gestione della memoria piena restano scritti una volta.
async function accodaSenzaData() {
  // Solo i gruppi che si possono mandare: quelle che non si sono lette
  // restano da parte, perché l'ora vera è dentro il file e mandarle con una
  // stima sarebbe buttarla via.
  const attesa = senzaData.filter(voce => GRUPPI[voce.gruppo].mandabile);
  senzaData = senzaData.filter(voce => !GRUPPI[voce.gruppo].mandabile);
  await aggiungiFile(attesa.map(voce => voce.file), 'ripiego');
}

// «Riprova» sui file che non si sono letti: si ripassa da `aggiungiFile` con
// la provenienza di prima, così se stavolta la lettura riesce la foto entra in
// coda con la sua ora vera, misurata, come se il primo tentativo non fosse mai
// andato male. Se fallisce di nuovo, torna qui.
async function riprovaLettura() {
  const attesa = senzaData.filter(voce => voce.gruppo === 'lettura');
  senzaData = senzaData.filter(voce => voce.gruppo !== 'lettura');
  if (attesa.length === 0) return;
  // I file di una stessa ripassata hanno la stessa provenienza: è quella con
  // cui sono stati scelti.
  await aggiungiFile(attesa.map(voce => voce.file), attesa[0].provenienza || 'galleria');
}

async function invia() {
  const commessa = radice.querySelector('#commessa').value;
  // Facoltativa per l'avanzamento — vuota è legittima, e si ricorda anche
  // quella — obbligatoria se in attesa c'è almeno una foto da archiviare.
  const fase = radice.querySelector('#fase').value;
  if (!commessa || !fase) return;
  // Un livello che la fase pretende e che non c'è ferma l'invio: la guardia sta
  // anche qui e non solo sul pulsante, perché il pulsante lo si può premere
  // nell'istante fra due ridisegni.
  if (livelliCorrenti.mancanti.length > 0) return;
  const nota = radice.querySelector('#nota').value.trim();
  const quante = await coda.confermaBozze(commessa, impostazioniApp.autore, nota, fase, {
    piano: livelliCorrenti.piano,
    unita: livelliCorrenti.unita,
    prospetto: livelliCorrenti.prospetto,
  });
  if (quante > 0) {
    coda.incrementaScattate(quante);
    // La commessa si ricorda, la fase no (dalla 0.37.9): la fase vale per
    // QUESTO invio — anche se porta più foto — e quello dopo riparte da
    // «— scegli la fase —». Vedi `azzeraFase` in core/anagrafica.js.
    salvaImpostazioniFoto({ ultimaCommessa: commessa });
    azzeraFase(radice);
    radice.querySelector('#nota').value = '';
  }
  await ridisegna();
  invio.avvia();
}

async function eliminaBozza(id) {
  if (!window.confirm('Eliminare questa foto?')) return;
  await coda.elimina(id);
  await ridisegna();
}

async function ridisegna() {
  // Tutte le viste condividono lo stesso contenitore: la guardia giusta è la
  // presenza degli elementi di questa vista, non "è ancora nel documento".
  if (!radice || !radice.querySelector('#foto-contatori')) return;
  const vista = radice;
  revocaUrl();
  const record = await coda.elenca();
  // Leggere la coda richiede un attimo, e in quell'attimo l'operatore può
  // essere uscito dal modulo: senza questo controllo il ridisegno cerca gli
  // elementi di una vista che non c'è più e va in errore. Capita davvero,
  // perché durante il caricamento di un video i ridisegni sono continui.
  if (radice !== vista || !vista.querySelector('#foto-contatori')) return;
  const bozze = record.filter(r => r.stato === 'bozza');
  const inAttesa = record.filter(r => r.stato === 'in_coda' || r.stato === 'invio');
  const inErrore = record.filter(r => r.stato === 'errore');
  const contatori = coda.contatoriOggi();

  radice.querySelector('#foto-contatori').innerHTML = `
    <div class="foto-chip"><span class="valore">${contatori.scattate}</span><span class="etichetta">Scattate oggi</span></div>
    <div class="foto-chip"><span class="valore">${contatori.inviate}</span><span class="etichetta">Inviate oggi</span></div>
    <div class="foto-chip"><span class="valore">${inAttesa.length}</span><span class="etichetta">In attesa</span></div>
    <div class="foto-chip errore"><span class="valore">${inErrore.length}</span><span class="etichetta">Errore</span></div>
  `;

  // Il cantiere si legge qui perché da lui dipendono TUTTI i menù sotto: per
  // un'urbanizzazione al posto delle fasi ci sono i lotti, e per un edificio
  // compaiono i livelli che la fase pretende.
  const commessaScelta = radice.querySelector('#commessa').value;
  const conLotti = eUrbanizzazione(commessaScelta);
  // La fase è obbligatoria SEMPRE, dalla 0.37.0: ogni foto va in archivio, e
  // una foto d'archivio senza fase non saprebbe in quale cartella andare.
  // Prima dipendeva dalla categoria, che non esiste più.
  radice.querySelector('#aiuto-fase').textContent = conLotti
    ? 'Sul server la foto finisce nella cartella del lotto.'
    : 'Sul server la foto finisce nella cartella della fase.';

  // Fase (o lotto), piano, unità, prospetto: li accende, li spegne e li
  // ricostruisce la shell, con le regole dell'anagrafica. Torna quello che
  // partirà — piano derivato compreso — e cosa manca ancora all'appello.
  // Nessuna fase iniziale: si parte sempre da «— scegli la fase —».
  livelliCorrenti = sincronizzaLivelli(radice, commessaScelta, scappaHtml, '',
    {}, true, { faseObbligatoria: true });

  // Foto senza ora dello scatto: fermate prima dell'invio, con le due vie
  // d'uscita scritte. La prima è quella giusta e va detta per prima — l'album
  // «Fotocamera» ha l'originale con l'EXIF intatto; la seconda esiste perché
  // in cantiere non si può bloccare qualcuno su un file che non tornerà.
  const avvisoSenzaData = radice.querySelector('#avviso-senza-data');
  if (senzaData.length === 0) {
    avvisoSenzaData.innerHTML = '';
  } else {
    // **Un riquadro per CASO, con la frase del caso in testa** (dalla 0.37.4).
    // Prima la frase era una sola per tutti — «non hanno la data di scatto,
    // quasi certamente copie ridotte, cerca gli originali» — e il 30/09/2026
    // è comparsa sopra una foto che la data ce l'aveva: non si era potuta
    // leggere, l'originale era già quello, e la frase mandava a cercare una
    // cosa che non esisteva.
    const ordine = ['lettura', 'copia', 'formato', 'senzaOra', 'orologio'];
    const presenti = ordine.filter(nome => senzaData.some(voce => voce.gruppo === nome));
    const mandabili = senzaData.filter(voce => GRUPPI[voce.gruppo].mandabile);
    const ultimoMandabile = presenti.filter(nome => GRUPPI[nome].mandabile).pop();
    avvisoSenzaData.innerHTML = presenti.map(nome => {
      const gruppo = GRUPPI[nome];
      const voci = senzaData.filter(voce => voce.gruppo === nome);
      const una = voci.length === 1;
      // Le azioni comuni stanno in fondo all'ultimo riquadro mandabile: con
      // un caso solo — che è quasi sempre — il riquadro è esattamente quello
      // di prima, e con più casi i pulsanti non si ripetono.
      const azioni = [];
      if (nome === 'lettura') {
        azioni.push(`<button id="lettura-riprova" class="btn btn-secondario btn-minore" type="button">Riprova</button>`);
        azioni.push(`<button id="lettura-scarta" class="btn btn-secondario btn-minore" type="button">Lascia ${una ? 'perdere questa foto' : 'perdere queste foto'}</button>`);
      }
      if (nome === ultimoMandabile) {
        const quante = mandabili.length === 1 ? 'questa foto' : `queste ${mandabili.length} foto`;
        const unaSola = mandabili.length === 1;
        azioni.push(`<button id="senza-data-comunque" class="btn btn-secondario btn-minore" type="button">Aggiungi comunque ${quante}</button>`);
        azioni.push(`<button id="senza-data-scarta" class="btn btn-secondario btn-minore" type="button">Cerco ${unaSola ? 'l’originale' : 'gli originali'}</button>`);
      }
      return `
      <div class="avviso avviso-attenzione">
        <p><strong>${gruppo.titolo(una)}</strong> ${gruppo.seguito(una)}</p>
        <p class="tenue">${gruppo.spiegazione(una)}</p>
        <ul class="foto-perche">${voci.map(rigaPerche).join('')}</ul>
        <div class="azioni-alternative">${azioni.join('')}</div>
      </div>`;
    }).join('');
    const riprova = avvisoSenzaData.querySelector('#lettura-riprova');
    if (riprova) riprova.addEventListener('click', () => { riprovaLettura(); });
    const lasciaPerdere = avvisoSenzaData.querySelector('#lettura-scarta');
    if (lasciaPerdere) lasciaPerdere.addEventListener('click', () => {
      senzaData = senzaData.filter(voce => voce.gruppo !== 'lettura');
      ridisegna();
    });
    const comunque = avvisoSenzaData.querySelector('#senza-data-comunque');
    if (comunque) comunque.addEventListener('click', () => { accodaSenzaData(); });
    const scarta = avvisoSenzaData.querySelector('#senza-data-scarta');
    if (scarta) scarta.addEventListener('click', () => {
      senzaData = senzaData.filter(voce => !GRUPPI[voce.gruppo].mandabile);
      ridisegna();
    });
    portaInVista(avvisoSenzaData);
  }

  const anteprime = radice.querySelector('#anteprime');
  anteprime.innerHTML = bozze.map(r => {
    const video = r.genere === 'video';
    // Un video senza anteprima (formato che il browser non decodifica) resta
    // riconoscibile dall'icona: meglio un riquadro scuro con il simbolo che
    // un'immagine rotta.
    const immagine = r.anteprima
      ? `<img src="${urlFoto(r.anteprima)}" alt="Anteprima">`
      : video ? '<span class="foto-senza-anteprima">&#127909;</span>' : `<img src="${urlFoto(r.foto)}" alt="Anteprima">`;
    return `
    <div class="foto-anteprima${video ? ' e-video' : ''}">
      ${immagine}
      ${video ? '<span class="foto-play" aria-hidden="true">&#9654;</span>' : ''}
      <button class="foto-rimuovi" data-id="${r.id}" aria-label="Rimuovi">&#10005;</button>
      <span class="foto-marchio">${video ? `Video${r.durata ? ` ${durataLeggibile(r.durata)}` : ''} · ` : ''}${pesoLeggibile(r.byte)}</span>
    </div>
  `;
  }).join('');
  for (const pulsante of anteprime.querySelectorAll('.foto-rimuovi')) {
    pulsante.addEventListener('click', () => eliminaBozza(pulsante.dataset.id));
  }

  const faseScelta = livelliCorrenti.fase;
  const pulsanteInvia = radice.querySelector('#invia');
  // I livelli non sono mai facoltativi: dove la fase li pretende, senza la
  // scelta non si parte. Il ripiego non esiste di proposito — una foto
  // d'archivio senza piano non saprebbe in quale cartella andare, e una foto
  // che parte con un livello a caso è peggio di una foto ferma.
  pulsanteInvia.disabled = bozze.length === 0 || !commessaScelta
    || !faseScelta || livelliCorrenti.mancanti.length > 0;
  const quantiVideo = bozze.filter(r => r.genere === 'video').length;
  const quanteFoto = bozze.length - quantiVideo;
  const parti = [];
  if (quanteFoto) parti.push(`${quanteFoto} ${quanteFoto === 1 ? 'foto' : 'foto'}`);
  if (quantiVideo) parti.push(`${quantiVideo} ${quantiVideo === 1 ? 'video' : 'video'}`);
  pulsanteInvia.textContent = bozze.length > 0 ? `Invia ${parti.join(' e ')}` : 'Invia';
  const mancanti = [
    !commessaScelta && 'il cantiere',
    !faseScelta && (conLotti ? 'il lotto' : 'la fase'),
    ...livelliCorrenti.mancanti,
  ].filter(Boolean);
  radice.querySelector('#avviso-invio').innerHTML = bozze.length > 0 && mancanti.length > 0
    ? `<p class="avviso avviso-attenzione">Scegli ${mancanti.join(' e ')} per inviare.${
      !faseScelta ? ' Sul server le foto si ordinano per fase.' : ''}</p>`
    : '';

  const azioni = radice.querySelector('#coda-azioni');
  azioni.innerHTML = inErrore.length > 0
    ? '<button id="riprova-tutti" class="btn btn-secondario btn-piccolo">Riprova tutti</button>'
    : '';
  const riprovaTutti = azioni.querySelector('#riprova-tutti');
  if (riprovaTutti) {
    riprovaTutti.addEventListener('click', async () => {
      for (const r of inErrore) await invio.riprova(r.id);
    });
  }

  const inCoda = record.filter(r => r.stato !== 'bozza').sort((a, b) => b.creatoIl - a.creatoIl);
  const lista = radice.querySelector('#lista-coda');
  if (inCoda.length === 0) {
    lista.innerHTML = '<li class="tenue">Nessun invio ancora.</li>';
  } else {
    lista.innerHTML = inCoda.map(r => {
      const stato = ETICHETTE_STATO[r.stato] || ETICHETTE_STATO.in_coda;
      const ora = new Date(r.creatoIl).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      const messaggioErrore = r.stato === 'errore' && r.ultimoErrore
        ? `<div class="errore-msg">${scappaHtml(r.ultimoErrore)}</div>` : '';
      // Su un video di decine di MB "in corso" senza altro non dice nulla:
      // la percentuale fa capire che sta salendo e non che è bloccato.
      const percentuale = r.byte > 0 && r.byteInviati > 0
        ? Math.min(100, Math.round((r.byteInviati / r.byte) * 100)) : 0;
      const avanzamento = r.stato === 'invio' && percentuale > 0 && !r.byteCaricati
        ? `<div class="tenue">Caricato ${percentuale}%</div>` : '';
      const riprova = r.stato === 'errore'
        ? `<button class="btn btn-secondario btn-piccolo foto-riprova" data-id="${r.id}">Riprova</button>` : '';
      // «Rimanda» su OGNI foto inviata, non solo quando si è sbagliato
      // cantiere: una foto venuta male o con un dato sbagliato si corregge, e
      // una che si teme non sia arrivata si rimanda per sentirselo dire.
      // Serve la foto sul dispositivo: rimandare una miniatura al posto
      // dell'originale consegnerebbe all'ufficio una foto peggiore.
      const rimanda = r.stato === 'inviata' && r.foto
        ? `<button class="btn btn-secondario btn-piccolo foto-rimanda" data-id="${r.id}">${
          rimandoAperto === r.id ? 'Chiudi' : 'Rimanda'}</button>` : '';
      const giaPresente = r.giaPresente
        ? '<div class="tenue">Era già in raccolta: nessun doppione creato.</div>' : '';
      // Un invio interrotto da una chiusura dell'app riparte da solo: dirlo
      // evita che sembri partito due volte, e spiega perché è tornato in coda.
      const ripreso = r.ripreso
        ? '<div class="tenue">Invio interrotto da una chiusura dell’app: ripreso.</div>' : '';
      const nota = r.nota ? `<div class="tenue">${scappaHtml(r.nota)}</div>` : '';
      return `
        <li class="foto-voce">
          ${r.anteprima
            ? `<img class="foto-miniatura" src="${urlFoto(r.anteprima)}" alt="">`
            : r.genere === 'video'
              ? '<span class="foto-miniatura foto-senza-anteprima">&#127909;</span>'
              : `<img class="foto-miniatura" src="${urlFoto(r.foto)}" alt="">`}
          <div class="foto-dettagli">
            <div class="riga">
              ${Number.isInteger(r.progressivo) ? `<span class="foto-progressivo">n. ${r.progressivo}</span>` : ''}
              ${etichettaCategoria(r.tipo)
                ? `<span class="foto-tag">${scappaHtml(etichettaCategoria(r.tipo))}</span>` : ''}
              ${r.genere === 'video' ? `<span class="foto-tag">Video${r.durata ? ` ${durataLeggibile(r.durata)}` : ''}</span>` : ''}
              ${scappaHtml(etichettaCantiere(r.commessa))}${r.fase ? ` &middot; ${scappaHtml(etichettaFaseOLotto(r.fase))}` : ''}${scappaHtml(scritturaLivelli(r))} &middot; ${ora}
            </div>
            <div class="tenue">${scappaHtml(r.autore)} &middot; ${pesoLeggibile(r.byte)}</div>
            ${nota}
            ${giaPresente}
            ${ripreso}
            ${avanzamento}
            ${messaggioErrore}
          </div>
          <div class="foto-azioni">
            <span class="badge ${stato.classe}">${stato.testo}</span>
            ${riprova}
            ${rimanda}
          </div>
        </li>
      `;
    }).join('');
    for (const pulsante of lista.querySelectorAll('.foto-riprova')) {
      pulsante.addEventListener('click', () => invio.riprova(pulsante.dataset.id));
    }
    for (const pulsante of lista.querySelectorAll('.foto-rimanda')) {
      pulsante.addEventListener('click', () => {
        rimandoAperto = rimandoAperto === pulsante.dataset.id ? '' : pulsante.dataset.id;
        ridisegna();
      });
    }
  }

  disegnaRimando(record);
}

// Quello che c'è scritto nel riquadro adesso, e se differisce dall'invio
// originale. Lo leggono sia il ridisegno — per l'etichetta del pulsante — sia
// l'azione: una sola lettura, così il pulsante non può dire una cosa e fare
// l'altra.
function lettureRimando(riquadro, record) {
  const commessa = riquadro.querySelector('#r-commessa').value;
  const livelli = sincronizzaLivelli(riquadro, commessa, scappaHtml, 'r-', {
    fase: record.fase || '',
    piano: record.piano || '',
    unita: record.unita || '',
    prospetto: record.prospetto || '',
  }, true, { faseObbligatoria: true });
  const nota = riquadro.querySelector('#r-nota').value.trim();
  const uguale = (a, b) => (a || '') === (b || '');
  const cambiato = !uguale(commessa, record.commessa)
    || !uguale(livelli.fase, record.fase)
    || !uguale(livelli.piano, record.piano)
    || !uguale(livelli.unita, record.unita)
    || !uguale(livelli.prospetto, record.prospetto)
    || !uguale(nota, record.nota);
  const mancanti = [!commessa && 'il cantiere', ...livelli.mancanti].filter(Boolean);
  return { commessa, livelli, nota, cambiato, mancanti };
}

function disegnaRimando(tutti) {
  const riquadro = radice.querySelector('#riquadro-rimando');
  if (!riquadro) return;
  const record = tutti.find(r => r.id === rimandoAperto && r.stato === 'inviata');
  if (!record) {
    if (riquadro.dataset.id) {
      riquadro.dataset.id = '';
      riquadro.innerHTML = '';
    }
    return;
  }
  // Si ricostruisce solo al cambio di foto: a ogni ridisegno si aggiornano i
  // menù e il pulsante, non il markup — altrimenti una correzione a metà
  // sparirebbe perché nel frattempo è finito un invio.
  if (riquadro.dataset.id !== record.id) {
    riquadro.dataset.id = record.id;
    riquadro.innerHTML = `
      <div class="riquadro-rimando">
        <p class="titolo">Rimanda questa foto</p>
        <div class="campo">
          <label for="r-commessa">Cantiere</label>
          <select id="r-commessa">${CANTIERI.map(c =>
            `<option value="${scappaHtml(c.codice)}"${c.codice === record.commessa ? ' selected' : ''}>${scappaHtml(c.etichetta)}</option>`).join('')}</select>
        </div>
        ${campiLivelli('r-')}
        <div class="campo">
          <label for="r-nota">Nota</label>
          <input id="r-nota" type="text" maxlength="255" value="${scappaHtml(record.nota || '')}">
        </div>
        <p id="r-spiegazione" class="aiuto tenue"></p>
        <div class="azioni-alternative">
          <button id="r-manda" class="btn btn-secondario btn-minore" type="button">Rimanda</button>
        </div>
        <p id="r-esito" class="tenue"></p>
      </div>`;
    riquadro.querySelector('#r-commessa').addEventListener('change', () => { ridisegna(); });
    for (const id of ['#r-fase', '#r-piano', '#r-unita', '#r-prospetto']) {
      riquadro.querySelector(id).addEventListener('change', () => { ridisegna(); });
    }
    riquadro.querySelector('#r-nota').addEventListener('input', () => { ridisegna(); });
    riquadro.querySelector('#r-manda').addEventListener('click', () => { eseguiRimando(record.id); });
    portaInVista(riquadro);
  }

  const letture = lettureRimando(riquadro, record);
  const pulsante = riquadro.querySelector('#r-manda');
  pulsante.disabled = letture.mancanti.length > 0;
  // Le due strade sono scritte sul pulsante, non nascoste dietro un unico
  // «Rimanda»: sono due cose diverse in raccolta, e chi preme deve sapere
  // quale delle due sta facendo.
  pulsante.textContent = letture.cambiato ? 'Rimanda corretta' : 'Rimanda la stessa';
  riquadro.querySelector('#r-spiegazione').textContent = letture.mancanti.length > 0
    ? `Scegli ${letture.mancanti.join(' e ')} per rimandarla.`
    : letture.cambiato
      ? 'Invio nuovo, con un identificativo nuovo: quella già mandata resta in raccolta e va annullata dall’ufficio.'
      : 'Stesso identificativo: se era già arrivata non si crea un doppione, e l’app te lo dice.';
}

async function eseguiRimando(id) {
  const riquadro = radice.querySelector('#riquadro-rimando');
  const record = (await coda.elenca()).find(r => r.id === id);
  if (!riquadro || !record) return;
  const letture = lettureRimando(riquadro, record);
  if (letture.mancanti.length > 0) return;
  riquadro.querySelector('#r-manda').disabled = true;
  riquadro.querySelector('#r-esito').textContent = 'In coda…';
  try {
    if (letture.cambiato) {
      await coda.rimandaCorretta(id, {
        commessa: letture.commessa,
        fase: letture.livelli.fase,
        piano: letture.livelli.piano,
        unita: letture.livelli.unita,
        prospetto: letture.livelli.prospetto,
        nota: letture.nota,
        autore: impostazioniApp.autore || record.autore,
      });
      // Una foto in più che deve atterrare: va contata, altrimenti il
      // confronto «scattate contro atterrate» non torna.
      coda.incrementaScattate(1);
    } else {
      await coda.rimandaStessa(id);
    }
  } catch {
    riquadro.querySelector('#r-esito').textContent = 'Non è stato possibile rimetterla in coda: riprova.';
    riquadro.querySelector('#r-manda').disabled = false;
    return;
  }
  rimandoAperto = '';
  await ridisegna();
  invio.avvia();
}

invio.alCambiamento(() => { ridisegna(); });

export default {
  id: 'foto',
  titolo: 'Foto cantiere',
  descrizione: 'Foto di avanzamento e da archiviare, verso l\'ufficio',
  icona: '🏗️',
  registra(registraRotta) {
    registraRotta('#/foto', vista);
    registraRotta('#/foto/impostazioni', vistaImpostazioniFoto);
    registraRotta('#/foto/configura', vistaConfigura);
    registraRotta('#/foto/condividi', vistaCondividi);
    // Invio automatico al ritorno della connettività, anche fuori dalla vista.
    window.addEventListener('online', () => invio.avvia());
  },
  // Numeri per la pagina Informazioni: prima li dava solo il modulo Bolle, e
  // un telefono con foto ferme in errore compariva al supporto come «0 in
  // errore» — la pagina che serve proprio a capire cosa è bloccato.
  async stato() {
    const record = await coda.elenca().catch(() => []);
    const progressivo = await coda.progressivoRaggiunto().catch(() => 0);
    return {
      bozze: record.filter(r => r.stato === 'bozza').length,
      inAttesa: record.filter(r => r.stato === 'in_coda' || r.stato === 'invio').length,
      inErrore: record.filter(r => r.stato === 'errore').length,
      oggi: coda.contatoriOggi(),
      righe: [
        ['Numero progressivo raggiunto', progressivo ? String(progressivo) : '—'],
        // Quale copia dell'anagrafica sta girando su questo telefono. Quando
        // l'ufficio dice «ho aggiornato piani e unità» questo numero è la
        // risposta: se è quello vecchio, l'app non ha ancora la copia nuova.
        ['Anagrafica dei livelli', VERSIONE_ANAGRAFICA],
      ],
    };
  },
};
