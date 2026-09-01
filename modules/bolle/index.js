// Modulo Bolle: foto delle bolle di consegna verso il magazzino (capture-only).
// Flusso felice in 3 tocchi: foto → cantiere (ultimo usato preselezionato) → Invia.
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { naviga } from '../../core/router.js';
import { comprimiInJpeg } from './immagini.js';
import { impostazioniBolle, salvaImpostazioniBolle } from './impostazioni.js';
import * as coda from './coda.js';
import * as invio from './invio.js';

export default {
  id: 'bolle',
  titolo: 'Bolle',
  descrizione: 'Foto delle bolle di consegna verso il magazzino',
  icona: '📷',
  registra(registraRotta) {
    registraRotta('#/bolle', vista);
    // Invio automatico al ritorno della connettività, anche fuori dalla vista.
    window.addEventListener('online', () => invio.avvia());
    invio.alCambiamento(() => { ridisegna(); });
  },
};

const ETICHETTE_STATO = {
  in_coda: { testo: 'In coda', classe: 'badge-coda' },
  invio: { testo: 'Invio in corso', classe: 'badge-invio' },
  inviata: { testo: 'Inviata', classe: 'badge-inviata' },
  errore: { testo: 'Errore', classe: 'badge-errore' },
};

let radice = null;
let urlDaRevocare = [];

function assicuraStile() {
  if (!document.getElementById('stile-bolle')) {
    const collegamento = document.createElement('link');
    collegamento.id = 'stile-bolle';
    collegamento.rel = 'stylesheet';
    collegamento.href = './modules/bolle/bolle.css';
    document.head.appendChild(collegamento);
  }
}

function urlFoto(blob) {
  const url = URL.createObjectURL(blob);
  urlDaRevocare.push(url);
  return url;
}

function revocaUrl() {
  for (const url of urlDaRevocare) URL.revokeObjectURL(url);
  urlDaRevocare = [];
}

async function vista(el) {
  if (!impostazioniApp.autore) {
    naviga('#/benvenuto', true);
    return;
  }
  assicuraStile();
  radice = el;
  const impostazioni = impostazioniBolle();
  const opzioniCantiere = impostazioni.cantieri.map(c => {
    const selezionato = c === impostazioni.ultimoCantiere ? ' selected' : '';
    return `<option value="${scappaHtml(c)}"${selezionato}>${scappaHtml(c)}</option>`;
  }).join('');

  const bannerMock = impostazioni.mock
    ? '<p class="avviso avviso-attenzione">Modalità mock attiva: invii simulati, nessun dato lascia il dispositivo.</p>'
    : '';

  el.innerHTML = `
    <div id="bolle-contatori" class="bolle-contatori"></div>
    ${bannerMock}
    <section class="scheda">
      <div class="campo">
        <label for="cantiere">Cantiere</label>
        <select id="cantiere" required>${opzioniCantiere}</select>
      </div>
      <label class="btn btn-primario bolle-fotografa" for="input-camera">&#128247; Fotografa bolla</label>
      <input id="input-camera" class="nascosto" type="file" accept="image/*" capture="environment">
      <label class="btn btn-secondario bolle-galleria" for="input-galleria">Scegli dalla galleria</label>
      <input id="input-galleria" class="nascosto" type="file" accept="image/*" multiple>
      <div id="avviso-foto"></div>
      <div id="anteprime" class="bolle-anteprime"></div>
      <button id="invia" class="btn btn-successo" disabled>Invia</button>
    </section>
    <section class="scheda">
      <h2>Coda invii</h2>
      <div id="coda-azioni"></div>
      <ul id="lista-coda" class="bolle-coda"></ul>
    </section>
  `;

  el.querySelector('#input-camera').addEventListener('change', gestisciFile);
  el.querySelector('#input-galleria').addEventListener('change', gestisciFile);
  el.querySelector('#invia').addEventListener('click', invia);

  await ridisegna();
  // Invio automatico a ogni apertura del modulo.
  invio.avvia();
}

async function gestisciFile(evento) {
  const input = evento.target;
  const file = [...input.files];
  input.value = '';
  if (file.length === 0) return;
  const avviso = radice.querySelector('#avviso-foto');
  avviso.innerHTML = `<p class="avviso avviso-info">Elaborazione di ${file.length} foto&hellip;</p>`;
  const errori = [];
  for (const singolo of file) {
    try {
      const blob = await comprimiInJpeg(singolo);
      await coda.aggiungiBozza(blob, singolo.name);
    } catch (errore) {
      errori.push(`${singolo.name || 'foto'}: ${errore.message}`);
    }
  }
  avviso.innerHTML = errori.length
    ? `<p class="avviso avviso-errore">Foto non aggiunte — ${scappaHtml(errori.join('; '))}</p>`
    : '';
  await ridisegna();
}

async function invia() {
  const selezione = radice.querySelector('#cantiere');
  const cantiere = selezione ? selezione.value : '';
  if (!cantiere) return;
  const quante = await coda.confermaBozze(cantiere, impostazioniApp.autore);
  if (quante > 0) {
    coda.incrementaScattate(quante);
    salvaImpostazioniBolle({ ultimoCantiere: cantiere });
  }
  await ridisegna();
  invio.avvia();
}

async function eliminaBozza(id) {
  if (!window.confirm('Eliminare questa foto?')) return;
  await coda.elimina(id);
  await ridisegna();
}

// Ridisegna le parti dinamiche: contatori, anteprime, coda.
async function ridisegna() {
  if (!radice || !radice.isConnected) return;
  revocaUrl();
  const record = await coda.elenca();
  const bozze = record.filter(r => r.stato === 'bozza');
  const inAttesa = record.filter(r => r.stato === 'in_coda' || r.stato === 'invio');
  const inErrore = record.filter(r => r.stato === 'errore');
  const contatori = coda.contatoriOggi();

  radice.querySelector('#bolle-contatori').innerHTML = `
    <div class="bolle-chip"><span class="valore">${contatori.scattate}</span><span class="etichetta">Scattate oggi</span></div>
    <div class="bolle-chip"><span class="valore">${contatori.inviate}</span><span class="etichetta">Inviate oggi</span></div>
    <div class="bolle-chip"><span class="valore">${inAttesa.length}</span><span class="etichetta">In attesa</span></div>
    <div class="bolle-chip errore"><span class="valore">${inErrore.length}</span><span class="etichetta">Errore</span></div>
  `;

  const anteprime = radice.querySelector('#anteprime');
  anteprime.innerHTML = bozze.map(r => `
    <div class="bolle-anteprima">
      <img src="${urlFoto(r.foto)}" alt="Anteprima bolla">
      <button class="bolle-rimuovi" data-id="${r.id}" aria-label="Rimuovi foto">&#10005;</button>
    </div>
  `).join('');
  for (const pulsante of anteprime.querySelectorAll('.bolle-rimuovi')) {
    pulsante.addEventListener('click', () => eliminaBozza(pulsante.dataset.id));
  }

  const pulsanteInvia = radice.querySelector('#invia');
  pulsanteInvia.disabled = bozze.length === 0;
  pulsanteInvia.textContent = bozze.length > 0 ? `Invia (${bozze.length})` : 'Invia';

  const azioni = radice.querySelector('#coda-azioni');
  azioni.innerHTML = inErrore.length > 0
    ? '<button id="riprova-tutti" class="btn btn-secondario btn-piccolo">Riprova tutti</button>'
    : '';
  const riprovaTutti = azioni.querySelector('#riprova-tutti');
  if (riprovaTutti) {
    riprovaTutti.addEventListener('click', async () => {
      for (const record of inErrore) await invio.riprova(record.id);
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
      const riprova = r.stato === 'errore'
        ? `<button class="btn btn-secondario btn-piccolo bolle-riprova" data-id="${r.id}">Riprova</button>` : '';
      return `
        <li class="bolle-voce">
          <img class="bolle-miniatura" src="${urlFoto(r.foto)}" alt="">
          <div class="bolle-dettagli">
            <div class="riga">${scappaHtml(r.cantiere)} &middot; ${ora}</div>
            <div class="tenue">${scappaHtml(r.autore)}</div>
            ${messaggioErrore}
          </div>
          <div class="bolle-azioni">
            <span class="badge ${stato.classe}">${stato.testo}</span>
            ${riprova}
          </div>
        </li>
      `;
    }).join('');
    for (const pulsante of lista.querySelectorAll('.bolle-riprova')) {
      pulsante.addEventListener('click', () => invio.riprova(pulsante.dataset.id));
    }
  }
}
