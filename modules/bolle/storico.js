// Storico delle bolle inviate: elenco cronologico, filtrabile per periodo e
// cantiere. Legge il registro locale del dispositivo, che sopravvive alla
// potatura delle foto.
import { scappaHtml } from '../../core/impostazioni.js';
import { CANTIERI, etichettaCantiere } from './cantieri.js';
import * as coda from './coda.js';

// Periodi predefiniti: coprono le domande vere di cantiere ("cosa ho mandato
// oggi", "questa settimana", "questo mese"), con l'intervallo libero per il resto.
const PERIODI = [
  { id: 'oggi', etichetta: 'Oggi' },
  { id: 'settimana', etichetta: 'Ultimi 7 giorni' },
  { id: 'mese', etichetta: 'Questo mese' },
  { id: 'tutto', etichetta: 'Tutto' },
];

let radice = null;
let filtro = { periodo: 'settimana', da: '', a: '', commessa: '' };

export async function vistaStorico(el) {
  radice = el;
  // Recupera le foto confermate prima che lo storico esistesse.
  await coda.allineaStorico();

  const opzioniPeriodo = PERIODI.map(p =>
    `<option value="${p.id}"${p.id === filtro.periodo ? ' selected' : ''}>${p.etichetta}</option>`).join('');
  const opzioniCommessa = ['<option value="">Tutti i cantieri</option>']
    .concat(CANTIERI.map(c =>
      `<option value="${scappaHtml(c.codice)}"${c.codice === filtro.commessa ? ' selected' : ''}>${scappaHtml(c.etichetta)}</option>`))
    .join('');

  el.innerHTML = `
    <section class="scheda">
      <h2>Bolle inviate</h2>
      <div class="campo">
        <label for="periodo">Periodo</label>
        <select id="periodo">${opzioniPeriodo}<option value="intervallo"${filtro.periodo === 'intervallo' ? ' selected' : ''}>Intervallo di date&hellip;</option></select>
      </div>
      <div id="campi-intervallo" class="bolle-intervallo${filtro.periodo === 'intervallo' ? '' : ' nascosto'}">
        <div class="campo">
          <label for="da">Dal</label>
          <input id="da" type="date" value="${scappaHtml(filtro.da)}">
        </div>
        <div class="campo">
          <label for="a">Al</label>
          <input id="a" type="date" value="${scappaHtml(filtro.a)}">
        </div>
      </div>
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
  `;

  for (const id of ['periodo', 'da', 'a', 'commessa']) {
    el.querySelector(`#${id}`).addEventListener('change', aggiornaFiltro);
  }
  await disegnaElenco();
}

async function aggiornaFiltro() {
  filtro = {
    periodo: radice.querySelector('#periodo').value,
    da: radice.querySelector('#da').value,
    a: radice.querySelector('#a').value,
    commessa: radice.querySelector('#commessa').value,
  };
  radice.querySelector('#campi-intervallo')
    .classList.toggle('nascosto', filtro.periodo !== 'intervallo');
  await disegnaElenco();
}

// Il confronto avviene sulla data del dispositivo (quando la bolla è stata
// fotografata), non sull'istante di invio: è quella che l'operatore ricorda.
function giornoDi(riga) {
  return String(riga.dataInvio || '').slice(0, 10);
}

function estremiPeriodo() {
  const oggi = new Date();
  const iso = data => data.toLocaleDateString('sv-SE');
  if (filtro.periodo === 'oggi') return [iso(oggi), iso(oggi)];
  if (filtro.periodo === 'settimana') {
    const sette = new Date(oggi);
    sette.setDate(sette.getDate() - 6);
    return [iso(sette), iso(oggi)];
  }
  if (filtro.periodo === 'mese') {
    return [iso(new Date(oggi.getFullYear(), oggi.getMonth(), 1)), iso(oggi)];
  }
  if (filtro.periodo === 'intervallo') return [filtro.da || '', filtro.a || ''];
  return ['', ''];
}

export function applicaFiltro(righe, filtroCorrente, estremi) {
  const [da, a] = estremi;
  return righe.filter(riga => {
    const giorno = giornoDi(riga);
    if (da && giorno < da) return false;
    if (a && giorno > a) return false;
    if (filtroCorrente.commessa && riga.commessa !== filtroCorrente.commessa) return false;
    return true;
  });
}

async function disegnaElenco() {
  const righe = applicaFiltro(await coda.elencaStorico(), filtro, estremiPeriodo());
  const perCommessa = new Map();
  for (const riga of righe) {
    perCommessa.set(riga.commessa, (perCommessa.get(riga.commessa) || 0) + 1);
  }
  const dettaglio = [...perCommessa.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([codice, quante]) => `${scappaHtml(codice)} ${quante}`)
    .join(' · ');

  radice.querySelector('#riepilogo').innerHTML = `
    <div class="bolle-riepilogo">
      <span class="totale">${righe.length}</span>
      <span class="etichetta">${righe.length === 1 ? 'bolla inviata' : 'bolle inviate'}${dettaglio ? ` — ${dettaglio}` : ''}</span>
    </div>
  `;

  const elenco = radice.querySelector('#elenco-storico');
  if (righe.length === 0) {
    elenco.innerHTML = '<p class="tenue">Nessuna bolla inviata nel periodo scelto.</p>';
    return;
  }

  // Raggruppate per giorno: è così che si ricostruisce una consegna.
  const giorni = new Map();
  for (const riga of righe) {
    const giorno = giornoDi(riga);
    if (!giorni.has(giorno)) giorni.set(giorno, []);
    giorni.get(giorno).push(riga);
  }

  elenco.innerHTML = [...giorni.entries()].map(([giorno, digiorno]) => `
    <h3 class="bolle-giorno">${formattaGiorno(giorno)} <span class="tenue">(${digiorno.length})</span></h3>
    <ul class="bolle-storico">
      ${digiorno.map(riga => `
        <li>
          <span class="ora">${scappaHtml(String(riga.dataInvio).slice(11, 16))}</span>
          <span class="cantiere">${scappaHtml(etichettaCantiere(riga.commessa))}</span>
          <span class="tenue">${scappaHtml(riga.operatore)}</span>
        </li>
      `).join('')}
    </ul>
  `).join('');
}

function formattaGiorno(giorno) {
  if (!giorno) return 'Data non disponibile';
  const [anno, mese, di] = giorno.split('-');
  const data = new Date(Number(anno), Number(mese) - 1, Number(di));
  const oggi = new Date().toLocaleDateString('sv-SE');
  if (giorno === oggi) return 'Oggi';
  return data.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' });
}
