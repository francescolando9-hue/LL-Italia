// Modulo Foto: foto di cantiere verso l'ufficio, in due categorie.
// Capture-only come Bolle: raccoglie e invia, non legge nulla del contenuto.
// La categoria si sceglie PRIMA di scattare, perché decide come l'immagine
// viene preparata: compressa per l'avanzamento, originale per l'archivio.
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { fotocameraDisponibile, apriFotocamera } from '../../core/fotocamera.js';
import { naviga } from '../../core/router.js';
import { messaggioSalvataggio, memoriaPiena } from '../../core/errori.js';
import { timestampDispositivo } from '../../core/orario.js';
import { dataScattoDaFoto } from '../../core/exif.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
import {
  sincronizzaLivelli, campiLivelli, etichettaFaseOLotto, eUrbanizzazione, VERSIONE_ANAGRAFICA,
} from '../../core/anagrafica.js';
import { CATEGORIE, categoria, etichettaCategoria } from './categorie.js';
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

// La fase è obbligatoria SOLO per le foto da archiviare (deciso da Francesco
// il 15/09/2026), perché sul server finiscono nella cartella della fase e una
// foto senza fase non saprebbe dove andare. Per l'avanzamento resta
// facoltativa: quelle restano in raccolta e non si smistano. Lo stabilisce il
// ridisegno, che è l'unico a sapere cosa c'è in attesa, e se lo ricorda qui
// per `invia()`.
let faseObbligatoria = false;

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
let senzaData = [];

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

  const notaCategoria = CATEGORIE.some(c => c.codice === impostazioni.ultimaCategoria);
  const segnapostoCategoria = notaCategoria ? '' : '<option value="" selected>— scegli il tipo di foto —</option>';
  const opzioniCategoria = segnapostoCategoria + CATEGORIE.map(c =>
    `<option value="${scappaHtml(c.codice)}"${c.codice === impostazioni.ultimaCategoria ? ' selected' : ''}>${scappaHtml(c.etichetta)}</option>`
  ).join('');

  el.innerHTML = `
    <div id="foto-contatori" class="foto-contatori"></div>
    <section class="scheda">
      <div class="campo">
        <label for="categoria">Tipo di foto</label>
        <select id="categoria" required>${opzioniCategoria}</select>
        <p id="aiuto-categoria" class="aiuto tenue"></p>
      </div>
      <div class="campo">
        <label for="commessa">Cantiere</label>
        <select id="commessa" required>${opzioniCommessa}</select>
      </div>
      <!-- Fase (o lotto), piano, unità e prospetto: il blocco sta nella shell,
           perché è lo stesso del modulo Bolle e perché gli id sono un
           contratto con la funzione che li accende e li spegne secondo
           l'anagrafica. -->
      ${campiLivelli()}
      <div id="avviso-categoria"></div>
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

  el.querySelector('#categoria').addEventListener('change', () => { ridisegna(); });
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
  const scelta = categoria(radice.querySelector('#categoria').value);
  const avviso = radice.querySelector('#avviso-foto');
  if (!scelta) {
    avviso.innerHTML = '<p class="avviso avviso-attenzione">Scegli prima il tipo di foto: cambia come viene inviata.</p>';
    portaInVista(avviso);
    return;
  }
  let esito;
  try {
    esito = await apriFotocamera({
      titolo: `Foto — ${scelta.breve}`,
      suggerimento: scelta.originale
        ? 'Risoluzione originale: scatta pure più foto, poi tocca Fine.'
        : 'Scatta pure più foto di fila, poi tocca Fine.',
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
  return { dataScatto: '', scattoStimato: 'SI', senzaData: true, motivo: esito.motivo };
}

async function aggiungiFile(file, provenienza = 'galleria') {
  if (file.length === 0) return;
  const tipo = radice.querySelector('#categoria').value;
  const scelta = categoria(tipo);
  const avviso = radice.querySelector('#avviso-foto');
  // La categoria decide la preparazione dell'immagine, quindi va scelta prima:
  // senza, non si saprebbe se comprimere o tenere l'originale.
  if (!scelta) {
    avviso.innerHTML = '<p class="avviso avviso-attenzione">Scegli prima il tipo di foto: cambia come viene inviata.</p>';
    return;
  }
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
        await coda.aggiungiBozza(singolo, anteprima, singolo.name, tipo, {
          genere: 'video', estensione: estensioneDi(singolo), durata,
        });
        continue;
      }
      // Prima la data, poi la preparazione: dopo, l'EXIF non c'è più.
      const quando = await oraDiScatto(singolo, provenienza);
      // Senza ora dello scatto la foto NON entra in coda: si mette da parte e
      // si chiede. Accodarla e stimare in silenzio è esattamente il difetto
      // misurato il 17/09/2026.
      if (quando.senzaData) {
        senzaData.push(singolo);
        continue;
      }
      const preparata = await preparaImmagine(singolo, scelta.originale);
      if (preparata.size > limiteByte) {
        troppoGrandi.push(pesoLeggibile(preparata.size));
        continue;
      }
      const anteprima = await creaAnteprima(singolo);
      await coda.aggiungiBozza(preparata, anteprima, singolo.name, tipo, {
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
// avere una strada propria, così il limite di peso, la preparazione secondo
// la categoria e la gestione della memoria piena restano scritti una volta.
async function accodaSenzaData() {
  const attesa = senzaData;
  senzaData = [];
  await aggiungiFile(attesa, 'ripiego');
}

async function invia() {
  const commessa = radice.querySelector('#commessa').value;
  // Facoltativa per l'avanzamento — vuota è legittima, e si ricorda anche
  // quella — obbligatoria se in attesa c'è almeno una foto da archiviare.
  const fase = radice.querySelector('#fase').value;
  if (!commessa || (faseObbligatoria && !fase)) return;
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
    const tipo = radice.querySelector('#categoria').value;
    salvaImpostazioniFoto({ ultimaCommessa: commessa, ultimaCategoria: tipo, ultimaFase: fase });
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

  const tipoScelto = radice.querySelector('#categoria').value;
  const scelta = categoria(tipoScelto);
  radice.querySelector('#aiuto-categoria').textContent = scelta
    ? scelta.originale
      ? 'Inviata a risoluzione originale: pesa di più e con poca rete parte più lentamente.'
      : 'Compressa per partire veloce anche con poca rete.'
    : '';

  // Il cantiere si legge qui perché da lui dipendono TUTTI i menù sotto: per
  // un'urbanizzazione al posto delle fasi ci sono i lotti, e per un edificio
  // compaiono i livelli che la fase pretende.
  const commessaScelta = radice.querySelector('#commessa').value;
  const conLotti = eUrbanizzazione(commessaScelta);
  radice.querySelector('#aiuto-fase').textContent =
    tipoScelto === 'ARCHIVIO' || bozze.some(r => r.tipo === 'ARCHIVIO')
      ? conLotti
        ? 'Obbligatorio per le foto da archiviare: sul server finiscono nella cartella del lotto.'
        : 'Obbligatoria per le foto da archiviare: sul server finiscono nella cartella della fase.'
      : '';

  // Fase (o lotto), piano, unità, prospetto: li accende, li spegne e li
  // ricostruisce la shell, con le regole dell'anagrafica. Torna quello che
  // partirà — piano derivato compreso — e cosa manca ancora all'appello.
  livelliCorrenti = sincronizzaLivelli(radice, commessaScelta, scappaHtml, '',
    { fase: impostazioniFoto().ultimaFase });

  // Cambiare categoria con foto già pronte cambierebbe il significato di
  // quelle foto, non come sono state preparate: si avvisa invece di tacere.
  const tipiInAttesa = [...new Set(bozze.map(r => r.tipo))];
  radice.querySelector('#avviso-categoria').innerHTML =
    tipoScelto && tipiInAttesa.length > 0 && tipiInAttesa.some(t => t !== tipoScelto)
      ? `<p class="avviso avviso-attenzione">In attesa ci sono foto di tipo <strong>${scappaHtml(etichettaCategoria(tipiInAttesa[0]))}</strong>: partono con quel tipo, non con quello scelto adesso.</p>`
      : '';

  // Foto senza ora dello scatto: fermate prima dell'invio, con le due vie
  // d'uscita scritte. La prima è quella giusta e va detta per prima — l'album
  // «Fotocamera» ha l'originale con l'EXIF intatto; la seconda esiste perché
  // in cantiere non si può bloccare qualcuno su un file che non tornerà.
  const avvisoSenzaData = radice.querySelector('#avviso-senza-data');
  if (senzaData.length === 0) {
    avvisoSenzaData.innerHTML = '';
  } else {
    const una = senzaData.length === 1;
    avvisoSenzaData.innerHTML = `
      <div class="avviso avviso-attenzione">
        <p><strong>${una ? 'Questa foto non ha' : `Queste ${senzaData.length} foto non hanno`} la data di scatto.</strong>
        Cerca ${una ? 'l’originale' : 'gli originali'} nell’album <strong>Fotocamera</strong>: lì la data c’è.</p>
        <p class="tenue">${una ? 'È' : 'Sono'} quasi certamente ${una ? 'una copia ridotta' : 'copie ridotte'}
        (Google Foto, WhatsApp). ${una ? 'Non è' : 'Non sono'} ancora in coda: se ${una ? 'la mandi' : 'le mandi'}
        comunque, in archivio ${una ? 'va' : 'vanno'} con la data del file e dichiarata stimata.</p>
        <div class="azioni-alternative">
          <button id="senza-data-comunque" class="btn btn-secondario btn-minore" type="button">Aggiungi comunque ${una ? 'questa foto' : `queste ${senzaData.length} foto`}</button>
          <button id="senza-data-scarta" class="btn btn-secondario btn-minore" type="button">Cerco ${una ? 'l’originale' : 'gli originali'}</button>
        </div>
      </div>`;
    avvisoSenzaData.querySelector('#senza-data-comunque')
      .addEventListener('click', () => { accodaSenzaData(); });
    avvisoSenzaData.querySelector('#senza-data-scarta')
      .addEventListener('click', () => { senzaData = []; ridisegna(); });
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
      <span class="foto-marchio">${video ? 'Video' : scappaHtml(etichettaCategoria(r.tipo))}${
        video && r.durata ? ` ${durataLeggibile(r.durata)}` : ''} · ${pesoLeggibile(r.byte)}</span>
    </div>
  `;
  }).join('');
  for (const pulsante of anteprime.querySelectorAll('.foto-rimuovi')) {
    pulsante.addEventListener('click', () => eliminaBozza(pulsante.dataset.id));
  }

  const faseScelta = livelliCorrenti.fase;
  // A decidere è ciò che sta per PARTIRE, non la categoria selezionata adesso:
  // un invio può contenere foto accodate con categorie diverse, e la fase vale
  // per tutte quelle dell'invio.
  faseObbligatoria = bozze.some(r => r.tipo === 'ARCHIVIO');
  const pulsanteInvia = radice.querySelector('#invia');
  // I livelli non sono mai facoltativi: dove la fase li pretende, senza la
  // scelta non si parte. Il ripiego non esiste di proposito — una foto
  // d'archivio senza piano non saprebbe in quale cartella andare, e una foto
  // che parte con un livello a caso è peggio di una foto ferma.
  pulsanteInvia.disabled = bozze.length === 0 || !commessaScelta
    || (faseObbligatoria && !faseScelta) || livelliCorrenti.mancanti.length > 0;
  const quantiVideo = bozze.filter(r => r.genere === 'video').length;
  const quanteFoto = bozze.length - quantiVideo;
  const parti = [];
  if (quanteFoto) parti.push(`${quanteFoto} ${quanteFoto === 1 ? 'foto' : 'foto'}`);
  if (quantiVideo) parti.push(`${quantiVideo} ${quantiVideo === 1 ? 'video' : 'video'}`);
  pulsanteInvia.textContent = bozze.length > 0 ? `Invia ${parti.join(' e ')}` : 'Invia';
  const mancanti = [
    !commessaScelta && 'il cantiere',
    faseObbligatoria && !faseScelta && (conLotti ? 'il lotto' : 'la fase'),
    ...livelliCorrenti.mancanti,
  ].filter(Boolean);
  radice.querySelector('#avviso-invio').innerHTML = bozze.length > 0 && mancanti.length > 0
    ? `<p class="avviso avviso-attenzione">Scegli ${mancanti.join(' e ')} per inviare.${
      faseObbligatoria && !faseScelta ? ' Le foto da archiviare si ordinano per fase sul server.' : ''}</p>`
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
              <span class="foto-tag">${scappaHtml(etichettaCategoria(r.tipo))}</span>
              ${r.genere === 'video' ? `<span class="foto-tag">Video${r.durata ? ` ${durataLeggibile(r.durata)}` : ''}</span>` : ''}
              ${scappaHtml(etichettaCantiere(r.commessa))}${r.fase ? ` &middot; ${scappaHtml(etichettaFaseOLotto(r.fase))}` : ''}${scappaHtml(scritturaLivelli(r))} &middot; ${ora}
            </div>
            <div class="tenue">${scappaHtml(r.autore)} &middot; ${pesoLeggibile(r.byte)}</div>
            ${nota}
            ${giaPresente}
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
  });
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
