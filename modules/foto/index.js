// Modulo Foto: foto di cantiere verso l'ufficio, in due categorie.
// Capture-only come Bolle: raccoglie e invia, non legge nulla del contenuto.
// La categoria si sceglie PRIMA di scattare, perché decide come l'immagine
// viene preparata: compressa per l'avanzamento, originale per l'archivio.
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { naviga } from '../../core/router.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
import { CATEGORIE, categoria, etichettaCategoria } from './categorie.js';
import { preparaImmagine, creaAnteprima } from './immagini.js';
import { impostazioniFoto, salvaImpostazioniFoto } from './impostazioni.js';
import * as coda from './coda.js';
import * as invio from './invio.js';
import { vistaImpostazioniFoto } from './vista-impostazioni.js';

const ETICHETTE_STATO = {
  in_coda: { testo: 'In coda', classe: 'badge-attesa' },
  invio: { testo: 'Invio in corso', classe: 'badge-invio' },
  inviata: { testo: 'Inviata', classe: 'badge-ok' },
  errore: { testo: 'Errore', classe: 'badge-errore' },
};

let radice = null;
let urlAperti = [];

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
      <div id="avviso-categoria"></div>
      <label class="btn btn-primario foto-scatta" for="input-camera">&#128247; Scatta foto</label>
      <input id="input-camera" class="nascosto" type="file" accept="image/*" capture="environment">
      <label class="btn btn-secondario" for="input-galleria">Scegli dalla galleria</label>
      <input id="input-galleria" class="nascosto" type="file" accept="image/*" multiple>
      <div id="avviso-foto"></div>
      <div id="anteprime" class="foto-anteprime"></div>
      <div class="campo" id="campo-nota">
        <label for="nota">Nota (facoltativa)</label>
        <input id="nota" type="text" maxlength="255" placeholder="Es. Getto solaio piano 3 completato">
        <p class="aiuto tenue">Vale per tutte le foto di questo invio.</p>
      </div>
      <div id="avviso-invio"></div>
      <button id="invia" class="btn btn-successo" disabled>Invia</button>
    </section>
    <section class="scheda">
      <h2>Coda invii</h2>
      <div id="coda-azioni"></div>
      <ul id="lista-coda" class="foto-coda"></ul>
    </section>
    <p style="text-align:center"><a class="tenue" href="#/foto/impostazioni">Impostazioni del modulo Foto</a></p>
  `;

  el.querySelector('#categoria').addEventListener('change', () => { ridisegna(); });
  el.querySelector('#commessa').addEventListener('change', () => { ridisegna(); });
  el.querySelector('#input-camera').addEventListener('change', gestisciFile);
  el.querySelector('#input-galleria').addEventListener('change', gestisciFile);
  el.querySelector('#invia').addEventListener('click', invia);

  await ridisegna();
  invio.avvia();
}

async function gestisciFile(evento) {
  const input = evento.target;
  const file = [...input.files];
  input.value = '';
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
  avviso.innerHTML = `<p class="avviso avviso-info">Preparazione di ${file.length} foto&hellip;</p>`;
  const errori = [];
  for (const singolo of file) {
    try {
      const preparata = await preparaImmagine(singolo, scelta.originale);
      const anteprima = await creaAnteprima(singolo);
      await coda.aggiungiBozza(preparata, anteprima, singolo.name, tipo);
    } catch (errore) {
      errori.push(`${singolo.name || 'foto'}: ${errore.message}`);
    }
  }
  avviso.innerHTML = errori.length > 0
    ? `<p class="avviso avviso-errore">${scappaHtml(errori.join(' · '))}</p>`
    : '';
  await ridisegna();
}

async function invia() {
  const commessa = radice.querySelector('#commessa').value;
  if (!commessa) return;
  const nota = radice.querySelector('#nota').value.trim();
  const quante = await coda.confermaBozze(commessa, impostazioniApp.autore, nota);
  if (quante > 0) {
    coda.incrementaScattate(quante);
    const tipo = radice.querySelector('#categoria').value;
    salvaImpostazioniFoto({ ultimaCommessa: commessa, ultimaCategoria: tipo });
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
  revocaUrl();
  const record = await coda.elenca();
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

  // Cambiare categoria con foto già pronte cambierebbe il significato di
  // quelle foto, non come sono state preparate: si avvisa invece di tacere.
  const tipiInAttesa = [...new Set(bozze.map(r => r.tipo))];
  radice.querySelector('#avviso-categoria').innerHTML =
    tipoScelto && tipiInAttesa.length > 0 && tipiInAttesa.some(t => t !== tipoScelto)
      ? `<p class="avviso avviso-attenzione">In attesa ci sono foto di tipo <strong>${scappaHtml(etichettaCategoria(tipiInAttesa[0]))}</strong>: partono con quel tipo, non con quello scelto adesso.</p>`
      : '';

  const anteprime = radice.querySelector('#anteprime');
  anteprime.innerHTML = bozze.map(r => `
    <div class="foto-anteprima">
      <img src="${urlFoto(r.anteprima || r.foto)}" alt="Anteprima foto">
      <button class="foto-rimuovi" data-id="${r.id}" aria-label="Rimuovi foto">&#10005;</button>
      <span class="foto-marchio">${scappaHtml(etichettaCategoria(r.tipo))} · ${pesoLeggibile(r.byte)}</span>
    </div>
  `).join('');
  for (const pulsante of anteprime.querySelectorAll('.foto-rimuovi')) {
    pulsante.addEventListener('click', () => eliminaBozza(pulsante.dataset.id));
  }

  const commessaScelta = radice.querySelector('#commessa').value;
  const pulsanteInvia = radice.querySelector('#invia');
  pulsanteInvia.disabled = bozze.length === 0 || !commessaScelta;
  pulsanteInvia.textContent = bozze.length > 0 ? `Invia ${bozze.length} foto` : 'Invia';
  radice.querySelector('#avviso-invio').innerHTML = bozze.length > 0 && !commessaScelta
    ? '<p class="avviso avviso-attenzione">Scegli il cantiere per inviare.</p>' : '';

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
      const riprova = r.stato === 'errore'
        ? `<button class="btn btn-secondario btn-piccolo foto-riprova" data-id="${r.id}">Riprova</button>` : '';
      const nota = r.nota ? `<div class="tenue">${scappaHtml(r.nota)}</div>` : '';
      return `
        <li class="foto-voce">
          <img class="foto-miniatura" src="${urlFoto(r.anteprima || r.foto)}" alt="">
          <div class="foto-dettagli">
            <div class="riga">
              <span class="foto-tag">${scappaHtml(etichettaCategoria(r.tipo))}</span>
              ${scappaHtml(etichettaCantiere(r.commessa))} &middot; ${ora}
            </div>
            <div class="tenue">${scappaHtml(r.autore)} &middot; ${pesoLeggibile(r.byte)}</div>
            ${nota}
            ${messaggioErrore}
          </div>
          <div class="foto-azioni">
            <span class="badge ${stato.classe}">${stato.testo}</span>
            ${riprova}
          </div>
        </li>
      `;
    }).join('');
    for (const pulsante of lista.querySelectorAll('.foto-riprova')) {
      pulsante.addEventListener('click', () => invio.riprova(pulsante.dataset.id));
    }
  }
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
    // Invio automatico al ritorno della connettività, anche fuori dalla vista.
    window.addEventListener('online', () => invio.avvia());
  },
};
