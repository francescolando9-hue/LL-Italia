// Bolle inviate: calendario del mese, elenco del giorno o del mese scelto,
// apertura della foto. Legge il registro locale del dispositivo, che
// sopravvive alla potatura delle immagini a piena risoluzione.
import { scappaHtml } from '../../core/impostazioni.js';
import { CANTIERI, etichettaCantiere } from './cantieri.js';
import * as coda from './coda.js';

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
      <div id="visore-contenuto"></div>
    </div>
  `;

  el.querySelector('#mese-prec').addEventListener('click', () => cambiaMese(-1));
  el.querySelector('#mese-succ').addEventListener('click', () => cambiaMese(1));
  el.querySelector('#commessa').addEventListener('change', evento => {
    commessaScelta = evento.target.value;
    disegna();
  });
  el.querySelector('#chiudi-visore').addEventListener('click', chiudiVisore);

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

  elenco.innerHTML = [...giorni.entries()].map(([giorno, delGiorno]) => `
    <h3 class="bolle-giorno">${formattaGiorno(giorno)} <span class="tenue">(${delGiorno.length})</span></h3>
    <ul class="bolle-storico">
      ${delGiorno.map(riga => `
        <li>
          <button class="bolle-riga" data-id="${scappaHtml(riga.idClient)}">
            <span class="ora">${scappaHtml(String(riga.dataInvio).slice(11, 16))}</span>
            <span class="cantiere">${scappaHtml(etichettaCantiere(riga.commessa))}</span>
            <span class="tenue">${scappaHtml(riga.operatore)}</span>
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

async function apriBolla(idClient) {
  const contenuto = radice.querySelector('#visore-contenuto');
  const visore = radice.querySelector('#visore');
  visore.classList.remove('nascosto');
  contenuto.innerHTML = '<p class="bolle-visore-messaggio">Apertura&hellip;</p>';

  // Se la foto a piena risoluzione è ancora sul dispositivo si mostra quella,
  // altrimenti la miniatura conservata nello storico.
  const record = (await coda.elenca()).find(r => r.id === idClient && r.foto);
  const immagine = record ? record.foto : await coda.leggiMiniatura(idClient);
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
    ${record ? '' : '<p class="bolle-visore-messaggio">Anteprima ridotta conservata sul telefono.</p>'}`;
}

function chiudiVisore() {
  radice.querySelector('#visore').classList.add('nascosto');
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
