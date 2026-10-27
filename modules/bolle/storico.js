// Bolle inviate: calendario del mese, elenco del giorno o del mese scelto,
// apertura della foto. Legge il registro locale del dispositivo, che
// sopravvive alla potatura delle immagini a piena risoluzione.
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
import { etichettaFaseOLotto, sincronizzaLivelli, campiLivelli, faseDaRivedere } from '../../core/anagrafica.js';
import { fraseFaseDaRivedere } from '../../core/errori.js';
import * as coda from './coda.js';
import * as invio from './invio.js';

const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

let radice = null;
let righe = [];
let urlAperti = [];
// Mese mostrato dal calendario e giorno selezionato ('' = tutto il mese).
let mese = new Date();
let giornoScelto = '';
let commessaScelta = '';
// Le righe nell'ordine in cui l'elenco le mostra, e quella aperta nel visore:
// lo scorrimento (dalla 0.41.0) va da una all'altra di QUESTE, cioè dentro
// l'elenco che si sta guardando — giorno o mese, col filtro del cantiere.
let mostrate = [];
let aperta = -1;
// Ogni apertura ha un numero: con scorrimenti rapidi una lettura lenta della
// bolla di prima non deve sovrascrivere quella di adesso.
let aperturaInCorso = 0;

// **Le soglie del gesto** (scelte il 26/10/2026, da verificare sul telefono).
// - SOGLIA_GESTO_PX: un dito che scorre per cambiare bolla percorre più di
//   60 px; un tocco, o il dito che trema col guanto, molto meno.
// - RAPPORTO_GESTO: il gesto vale solo se lo spostamento orizzontale è almeno
//   il DOPPIO di quello verticale (un angolo sotto i 27 gradi circa): uno
//   scorrimento verticale per leggere la bolla non cambia mai bolla, anche se
//   il dito scivola un po' di lato.
// - FASCIA_BORDO_PX: un gesto che parte entro 32 px dal bordo sinistro o
//   destro non si prende: su Android da lì parte il gesto «indietro», e chi lo
//   fa sta chiedendo quello, non la bolla dopo.
// - Con la pagina ingrandita (`visualViewport.scale` sopra 1) il dito sposta
//   l'immagine: niente cambio di bolla. Anche un gesto a due dita non conta.
const SOGLIA_GESTO_PX = 60;
const RAPPORTO_GESTO = 2;
const FASCIA_BORDO_PX = 32;

function iso(data) {
  return data.toLocaleDateString('sv-SE');
}

// Il raggruppamento usa la data di scatto, non l'istante di invio: è quella
// che l'operatore ricorda, e per una foto accodata offline sono giorni diversi.
function giornoDi(riga) {
  return String(riga.dataInvio || '').slice(0, 10);
}

export async function vistaStorico(el) {
  radice = el;
  await coda.allineaStorico();
  righe = await coda.elencaStorico();

  const opzioniCommessa = ['<option value="">Tutti i cantieri</option>']
    .concat(CANTIERI.map(c => `<option value="${scappaHtml(c.codice)}">${scappaHtml(c.etichetta)}</option>`))
    .join('');

  el.innerHTML = `
    <section class="scheda">
      <div class="bolle-mese">
        <button id="mese-prec" class="bolle-freccia" aria-label="Mese precedente">&#8249;</button>
        <h2 id="titolo-mese"></h2>
        <button id="mese-succ" class="bolle-freccia" aria-label="Mese successivo">&#8250;</button>
      </div>
      <div class="bolle-calendario" id="calendario"></div>
      <div class="campo">
        <label for="commessa">Cantiere</label>
        <select id="commessa">${opzioniCommessa}</select>
      </div>
    </section>
    <div id="riepilogo"></div>
    <section class="scheda">
      <div id="elenco-storico"></div>
    </section>
    <a class="btn btn-secondario" href="#/bolle">Torna a Bolle</a>
    <div id="visore" class="bolle-visore nascosto">
      <button id="chiudi-visore" class="bolle-chiudi" aria-label="Chiudi">&#10005;</button>
      <div id="visore-testa" class="bolle-visore-testa">
        <div id="visore-riga"></div>
        <p id="visore-capo" class="bolle-visore-capo" aria-live="polite"></p>
      </div>
      <div id="visore-contenuto" class="bolle-visore-contenuto"></div>
    </div>
  `;

  el.querySelector('#mese-prec').addEventListener('click', () => cambiaMese(-1));
  el.querySelector('#mese-succ').addEventListener('click', () => cambiaMese(1));
  el.querySelector('#commessa').addEventListener('change', evento => {
    commessaScelta = evento.target.value;
    disegna();
  });
  el.querySelector('#chiudi-visore').addEventListener('click', chiudiVisore);
  collegaGesto(el.querySelector('#visore'));

  // Apre il calendario sul mese dell'ultimo invio: se non si manda nulla da
  // qualche giorno, è più utile del mese corrente vuoto.
  if (righe.length > 0) {
    const ultima = giornoDi(righe[0]);
    if (ultima) mese = new Date(Number(ultima.slice(0, 4)), Number(ultima.slice(5, 7)) - 1, 1);
  }
  disegna();
}

function cambiaMese(delta) {
  mese = new Date(mese.getFullYear(), mese.getMonth() + delta, 1);
  giornoScelto = '';
  disegna();
}

function filtrate() {
  return righe.filter(riga => {
    const giorno = giornoDi(riga);
    if (commessaScelta && riga.commessa !== commessaScelta) return false;
    if (giornoScelto) return giorno === giornoScelto;
    return giorno.slice(0, 7) === `${mese.getFullYear()}-${String(mese.getMonth() + 1).padStart(2, '0')}`;
  });
}

function disegna() {
  disegnaCalendario();
  disegnaElenco();
}

function disegnaCalendario() {
  radice.querySelector('#titolo-mese').textContent = `${MESI[mese.getMonth()]} ${mese.getFullYear()}`;

  // Conteggio per giorno del mese, già filtrato per cantiere.
  const perGiorno = new Map();
  for (const riga of righe) {
    if (commessaScelta && riga.commessa !== commessaScelta) continue;
    const giorno = giornoDi(riga);
    perGiorno.set(giorno, (perGiorno.get(giorno) || 0) + 1);
  }

  const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
  const giorniNelMese = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate();
  // getDay(): 0 = domenica. La settimana di cantiere parte da lunedì.
  const scarto = (primo.getDay() + 6) % 7;
  const oggi = iso(new Date());

  const celle = GIORNI.map(g => `<span class="bolle-intestazione">${g}</span>`);
  for (let i = 0; i < scarto; i += 1) celle.push('<span></span>');
  for (let numero = 1; numero <= giorniNelMese; numero += 1) {
    const giorno = iso(new Date(mese.getFullYear(), mese.getMonth(), numero));
    const quante = perGiorno.get(giorno) || 0;
    const classi = ['bolle-giorno-cella'];
    if (quante > 0) classi.push('con-bolle');
    if (giorno === giornoScelto) classi.push('scelto');
    if (giorno === oggi) classi.push('oggi');
    celle.push(`
      <button class="${classi.join(' ')}" data-giorno="${giorno}"${quante === 0 ? ' disabled' : ''}>
        <span class="numero">${numero}</span>
        ${quante > 0 ? `<span class="quante">${quante}</span>` : ''}
      </button>
    `);
  }

  const calendario = radice.querySelector('#calendario');
  calendario.innerHTML = celle.join('');
  for (const cella of calendario.querySelectorAll('.bolle-giorno-cella:not([disabled])')) {
    cella.addEventListener('click', () => {
      // Un secondo tocco sullo stesso giorno torna alla vista del mese.
      giornoScelto = giornoScelto === cella.dataset.giorno ? '' : cella.dataset.giorno;
      disegna();
    });
  }
}

function disegnaElenco() {
  const selezionate = filtrate();
  const perCommessa = new Map();
  for (const riga of selezionate) {
    perCommessa.set(riga.commessa, (perCommessa.get(riga.commessa) || 0) + 1);
  }
  const dettaglio = [...perCommessa.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([codice, quante]) => `${scappaHtml(codice)} ${quante}`)
    .join(' · ');
  const ambito = giornoScelto
    ? formattaGiorno(giornoScelto)
    : `${MESI[mese.getMonth()]} ${mese.getFullYear()}`;

  radice.querySelector('#riepilogo').innerHTML = `
    <div class="bolle-riepilogo">
      <span class="totale">${selezionate.length}</span>
      <span class="etichetta">${selezionate.length === 1 ? 'bolla' : 'bolle'} — ${scappaHtml(ambito)}${dettaglio ? ` · ${dettaglio}` : ''}</span>
      ${giornoScelto ? '<button id="tutto-mese" class="btn btn-secondario btn-piccolo">Tutto il mese</button>' : ''}
    </div>
  `;
  const tuttoMese = radice.querySelector('#tutto-mese');
  if (tuttoMese) {
    tuttoMese.addEventListener('click', () => { giornoScelto = ''; disegna(); });
  }

  const elenco = radice.querySelector('#elenco-storico');
  if (selezionate.length === 0) {
    elenco.innerHTML = '<p class="tenue">Nessuna bolla inviata nel periodo scelto.</p>';
    return;
  }

  const giorni = new Map();
  for (const riga of selezionate) {
    const giorno = giornoDi(riga);
    if (!giorni.has(giorno)) giorni.set(giorno, []);
    giorni.get(giorno).push(riga);
  }

  // L'ordine dello scorrimento è quello in cui le righe si vedono: giorno
  // per giorno, e dentro il giorno come sono elencate.
  mostrate = [...giorni.values()].flat();
  elenco.innerHTML = [...giorni.entries()].map(([giorno, delGiorno]) => `
    <h3 class="bolle-giorno">${formattaGiorno(giorno)} <span class="tenue">(${delGiorno.length})</span></h3>
    <ul class="bolle-storico">
      ${delGiorno.map(riga => `
        <li>
          <button class="bolle-riga" data-id="${scappaHtml(riga.idClient)}">
            ${contenutoRiga(riga)}
            <span class="lente" aria-hidden="true">&#128269;</span>
          </button>
        </li>
      `).join('')}
    </ul>
  `).join('');

  for (const pulsante of elenco.querySelectorAll('.bolle-riga')) {
    pulsante.addEventListener('click', () => apriBolla(pulsante.dataset.id));
  }
}

// I dati di una riga — ora, n. progressivo, pagina, cantiere, fase, operatore
// — scritti una volta: li usano l'elenco e la testa del visore, che deve dire
// di quale bolla si tratta con le stesse parole.
function contenutoRiga(riga) {
  return `<span class="ora">${scappaHtml(String(riga.dataInvio).slice(11, 16))}</span>
            <span class="cantiere">${Number.isInteger(riga.progressivo)
              ? `<span class="bolle-progressivo">n. ${riga.progressivo}</span> ` : ''}${Number(riga.pagine) > 1
              ? `<span class="bolle-pagina-riga">pag. ${riga.pagina}/${riga.pagine}</span> ` : ''}${scappaHtml(etichettaCantiere(riga.commessa))}${riga.fase ? ` · ${scappaHtml(etichettaFaseOLotto(riga.fase))}` : ''}</span>
            <span class="tenue">${scappaHtml(riga.operatore)}</span>`;
}

function apriBolla(idClient) {
  return mostraBolla(mostrate.findIndex(r => r.idClient === idClient));
}

// Bolla successiva o precedente nell'elenco mostrato. Ai due capi ci si
// ferma: niente giro dall'inizio, niente cambio di mese.
function vaiA(indice) {
  if (indice < 0 || indice >= mostrate.length || indice === aperta) return;
  mostraBolla(indice);
}

async function mostraBolla(indice) {
  const riga = mostrate[indice];
  if (!riga) return;
  const idClient = riga.idClient;
  const mia = ++aperturaInCorso;
  aperta = indice;
  const contenuto = radice.querySelector('#visore-contenuto');
  const visore = radice.querySelector('#visore');
  visore.classList.remove('nascosto');
  disegnaTesta();
  // La bolla di prima si toglie e la sua immagine si rilascia dalla memoria:
  // scorrendo una giornata intera le immagini non si accumulano. Con lei se ne
  // va una scelta nel riquadro «Cantiere o fase sbagliati?» non mandata, e il
  // riquadro della bolla nuova riparte dai suoi valori.
  liberaImmagini();
  contenuto.innerHTML = '<p class="bolle-visore-messaggio">Apertura&hellip;</p>';
  visore.scrollTop = 0;

  // Se la foto a piena risoluzione è ancora sul dispositivo si mostra quella,
  // altrimenti la miniatura conservata nello storico.
  const record = (await coda.elenca()).find(r => r.id === idClient && r.foto);
  const immagine = record ? record.foto : await coda.leggiMiniatura(idClient);
  if (mia !== aperturaInCorso) return;
  if (!immagine) {
    contenuto.innerHTML = `
      <p class="bolle-visore-messaggio">
        Questa foto non è più sul dispositivo: l'originale resta nella raccolta del magazzino.
      </p>`;
    return;
  }
  const url = URL.createObjectURL(immagine);
  urlAperti.push(url);
  contenuto.innerHTML = `<img src="${url}" alt="Bolla inviata">
    ${record ? '' : '<p class="bolle-visore-messaggio">Anteprima ridotta conservata sul telefono.</p>'}
    ${record ? riquadroCorrezione(riga) : ''}`;
  if (record) collegaCorrezione(record, riga);
}

// La testa del visore: la riga della bolla, la posizione nell'elenco e, ai
// capi, UNA frase che lo dice. Dalla 0.41.1 (decisione di Francesco del
// 27/10/2026) non ci sono più le frecce né il piede fisso che le conteneva: il
// gesto si capisce da solo, e il piede copriva la parte del riquadro dove si
// sceglie il cantiere. La frase dei capi sta qui, in un elemento che scorre
// con la pagina, e non in un elemento fisso. Con una bolla sola è la prima e
// l'ultima insieme: fino alla 0.41.0 si leggevano le due frasi una sotto
// l'altra, ora una sola.
function disegnaTesta() {
  radice.querySelector('#visore-riga').innerHTML = `<div class="bolle-riga bolle-riga-testa">${contenutoRiga(mostrate[aperta])}</div>
    <p class="bolle-visore-posizione">${aperta + 1} di ${mostrate.length}</p>`;
  radice.querySelector('#visore-capo').textContent = mostrate.length === 1 ? 'È l’unica bolla di questo elenco'
    : aperta === 0 ? 'È la prima bolla di questo elenco'
      : aperta === mostrate.length - 1 ? 'È l’ultima bolla di questo elenco' : '';
}

// Il gesto: dito verso sinistra → bolla successiva (quella sotto
// nell'elenco); verso destra → precedente. Solo un dito, solo con la pagina
// non ingrandita, solo se non parte dal bordo e se è chiaramente orizzontale.
// Ascoltatori passivi: lo scorrimento e lo zoom restano quelli del browser.
function collegaGesto(visore) {
  let inizio = null;
  const ingrandita = () => Boolean(window.visualViewport) && window.visualViewport.scale > 1.01;
  visore.addEventListener('touchstart', evento => {
    if (evento.touches.length !== 1) { inizio = null; return; }
    const tocco = evento.touches[0];
    const bordo = tocco.clientX < FASCIA_BORDO_PX || tocco.clientX > window.innerWidth - FASCIA_BORDO_PX;
    inizio = bordo || ingrandita() ? null : { x: tocco.clientX, y: tocco.clientY };
  }, { passive: true });
  visore.addEventListener('touchmove', evento => {
    if (evento.touches.length > 1) inizio = null;
  }, { passive: true });
  visore.addEventListener('touchcancel', () => { inizio = null; }, { passive: true });
  visore.addEventListener('touchend', evento => {
    if (!inizio || evento.touches.length > 0 || ingrandita()) { inizio = null; return; }
    const tocco = evento.changedTouches[0];
    const dx = tocco.clientX - inizio.x;
    const dy = tocco.clientY - inizio.y;
    inizio = null;
    if (Math.abs(dx) < SOGLIA_GESTO_PX || Math.abs(dx) < RAPPORTO_GESTO * Math.abs(dy)) return;
    vaiA(dx < 0 ? aperta + 1 : aperta - 1);
  }, { passive: true });
}

// «Cantiere o fase sbagliati?» (dalla 0.41.1; era «Cantiere sbagliato?»):
// possibile solo se la foto originale è ancora sul dispositivo, perché
// rimandare la miniatura significherebbe consegnare al magazzino una bolla meno
// leggibile dell'originale.
//
// Decisione di Francesco del 27/10/2026: si rimanda la bolla perché è
// sbagliata la fase, o il cantiere, o tutti e due. I due menù **partono dai
// valori della bolla** — il suo cantiere, che quindi è fra le voci, e la sua
// fase — e il pulsante si accende solo quando almeno uno dei due è cambiato:
// non c'è niente di preselezionato da confermare senza guardare (era il
// difetto che la 0.38.0 aveva tolto col segnaposto), perché a pulsante acceso
// qualcuno ha cambiato qualcosa. Il segnaposto «— scegli il cantiere —» resta
// solo per una bolla il cui cantiere non è più nel menù: senza, il menù
// mostrerebbe la prima voce come se fosse quella della bolla.
// Il menù della fase è lo stesso del riquadro «Rimanda questa bolla» della
// Coda invii (`sincronizzaLivelli`, prefisso `c-`): lotti su SNU e BRU, fasi
// escluse non offerte, e la regola della fase che non si perde in silenzio.
function riquadroCorrezione(riga) {
  const attuale = riga ? riga.commessa : '';
  const nelMenu = CANTIERI.some(c => c.codice === attuale);
  return `
    <div class="bolle-correzione" id="riquadro-correzione">
      <p class="titolo">Cantiere o fase sbagliati?</p>
      <p class="tenue">Rimanda la stessa foto col cantiere e la fase giusti.</p>
      <div class="campo">
        <label for="cantiere-corretto">Cantiere</label>
        <select id="cantiere-corretto">
          ${nelMenu ? '' : '<option value="" selected>— scegli il cantiere —</option>'}
          ${CANTIERI.map(c => `<option value="${scappaHtml(c.codice)}"${c.codice === attuale ? ' selected' : ''}>${scappaHtml(c.etichetta)}</option>`).join('')}
        </select>
      </div>
      ${campiLivelli('c-', false)}
      <button id="rimanda" class="btn btn-secondario btn-piccolo" type="button" disabled>Rimanda corretta</button>
      <p id="spiegazione-correzione" class="tenue"></p>
      <p id="esito-correzione" class="tenue"></p>
    </div>
  `;
}

const eLotto = codice => /^Lotto\d+$/.test(String(codice || ''));

// Quello che c'è scritto nel riquadro adesso, confrontato con la bolla. Una
// lettura sola per il pulsante, la riga sotto e la conferma: il pulsante non
// può dire una cosa e mandarne un'altra.
function letturaCorrezione(riquadro, riga) {
  const cantiereBolla = riga ? riga.commessa : '';
  const faseBolla = (riga && riga.fase) || '';
  const cantiere = riquadro.querySelector('#cantiere-corretto').value;
  const fase = sincronizzaLivelli(riquadro, cantiere, scappaHtml, 'c-',
    { fase: faseBolla }, false, { faseDallaBolla: true }).fase;
  const daRivedere = cantiere && !fase ? faseDaRivedere(cantiere, faseBolla) : null;
  const cambiaCantiere = Boolean(cantiere) && cantiere !== cantiereBolla;
  const cambiaFase = fase !== faseBolla;
  return {
    cantiere, fase, faseBolla, daRivedere, cambiaCantiere, cambiaFase,
    pronta: Boolean(cantiere) && !daRivedere && (cambiaCantiere || cambiaFase),
  };
}

// La fase a parole: «fase Murature», «Lotto 1», oppure «senza fase» quando la
// si toglie apposta.
function testoFase(fase, faseBolla) {
  if (fase) return eLotto(fase) ? etichettaFaseOLotto(fase) : `fase ${etichettaFaseOLotto(fase)}`;
  return eLotto(faseBolla) ? 'senza lotto' : 'senza fase';
}

// La domanda della conferma, con le sole parti che cambiano: il cantiere col
// codice, la fase con l'etichetta.
function domandaCorrezione(l) {
  const fase = l.cambiaFase ? testoFase(l.fase, l.faseBolla) : '';
  if (l.cambiaCantiere) return `Rimandare questa bolla su ${l.cantiere}${fase ? `, ${fase}` : ''}?`;
  return `Rimandare questa bolla ${fase.startsWith('senza') ? fase : `con ${fase}`}?`;
}

// La riga sotto il pulsante: cosa manca, o cosa cambierà.
function rigaCorrezione(l) {
  if (!l.cantiere) return 'Scegli il cantiere per rimandarla.';
  if (l.daRivedere) return fraseFaseDaRivedere(l.daRivedere);
  if (!l.cambiaCantiere && !l.cambiaFase) return 'Cambia il cantiere o la fase per rimandarla.';
  const parti = [l.cambiaCantiere && `cantiere ${l.cantiere}`, l.cambiaFase && testoFase(l.fase, l.faseBolla)];
  return `Cambia: ${parti.filter(Boolean).join(', ')}. Invio nuovo, con un identificativo nuovo.`;
}

function collegaCorrezione(record, riga) {
  const riquadro = radice.querySelector('#riquadro-correzione');
  if (!riquadro) return;
  const pulsante = riquadro.querySelector('#rimanda');
  const aggiorna = () => {
    const l = letturaCorrezione(riquadro, riga);
    pulsante.disabled = !l.pronta;
    riquadro.querySelector('#spiegazione-correzione').textContent = rigaCorrezione(l);
    return l;
  };
  riquadro.querySelector('#cantiere-corretto').addEventListener('change', aggiorna);
  riquadro.querySelector('#c-fase').addEventListener('change', aggiorna);
  aggiorna();
  pulsante.addEventListener('click', async () => {
    const l = aggiorna();
    if (!l.pronta) return;
    const esito = riquadro.querySelector('#esito-correzione');
    const conferma = window.confirm(
      `${domandaCorrezione(l)}\n\n`
      + `Attenzione: quella già inviata${riga ? ` su ${riga.commessa}` : ''} resta in magazzino `
      + 'e va annullata dall\'ufficio.');
    if (!conferma) return;
    pulsante.disabled = true;
    esito.textContent = 'Invio in corso…';
    try {
      const nuova = await coda.aggiungiBozza(
        record.foto, record.nome, record.miniatura, record.impronta, record.qualita, record.motivoQualita);
      // La pagina corretta resta la stessa pagina della stessa bolla:
      // altrimenti correggere il cantiere spezzerebbe una bolla di più pagine.
      await coda.confermaSingola(nuova.id, l.cantiere, impostazioniApp.autore || record.autore, riga, l.fase);
      coda.incrementaScattate(1);
      invio.avvia();
      esito.textContent = `In coda per ${l.cantiere}: la trovi nella coda invii, dove diventa verde a consegna avvenuta.`
        + ' Avvisa l\'ufficio di annullare quella sbagliata.';
    } catch {
      esito.textContent = 'Non è stato possibile rimandarla: riprova.';
      pulsante.disabled = false;
    }
  });
}

function chiudiVisore() {
  aperturaInCorso += 1;
  aperta = -1;
  radice.querySelector('#visore').classList.add('nascosto');
  radice.querySelector('#visore-riga').innerHTML = '';
  radice.querySelector('#visore-capo').textContent = '';
  liberaImmagini();
}

function liberaImmagini() {
  radice.querySelector('#visore-contenuto').innerHTML = '';
  for (const url of urlAperti) URL.revokeObjectURL(url);
  urlAperti = [];
}

function formattaGiorno(giorno) {
  if (!giorno) return 'Data non disponibile';
  const [anno, m, di] = giorno.split('-');
  const data = new Date(Number(anno), Number(m) - 1, Number(di));
  if (giorno === iso(new Date())) return 'Oggi';
  return data.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' });
}
