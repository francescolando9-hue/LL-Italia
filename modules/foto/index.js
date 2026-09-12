// Modulo Foto: foto di cantiere verso l'ufficio, in due categorie.
// Capture-only come Bolle: raccoglie e invia, non legge nulla del contenuto.
// La categoria si sceglie PRIMA di scattare, perché decide come l'immagine
// viene preparata: compressa per l'avanzamento, originale per l'archivio.
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { fotocameraDisponibile, apriFotocamera } from '../../core/fotocamera.js';
import { naviga } from '../../core/router.js';
import { messaggioSalvataggio, memoriaPiena } from '../../core/errori.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
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
      ${fotocameraDisponibile()
        ? '<button id="apri-fotocamera" class="btn btn-primario foto-scatta" type="button">&#128247; Scatta foto</button>'
        : ''}
      <label class="btn ${fotocameraDisponibile() ? 'btn-secondario' : 'btn-primario'} foto-scatta" for="input-camera">${fotocameraDisponibile() ? 'Usa la fotocamera del telefono' : '&#128247; Scatta foto'}</label>
      <input id="input-camera" class="nascosto" type="file" accept="image/*" capture="environment">
      <label class="btn btn-secondario foto-registra" for="input-video">&#127909; Registra un video</label>
      <input id="input-video" class="nascosto" type="file" accept="video/*" capture="environment">
      <label class="btn btn-secondario" for="input-galleria">Scegli dalla galleria</label>
      <input id="input-galleria" class="nascosto" type="file" accept="image/*,video/*" multiple>
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
  const pulsanteScatto = el.querySelector('#apri-fotocamera');
  if (pulsanteScatto) pulsanteScatto.addEventListener('click', apriScatto);
  el.querySelector('#input-camera').addEventListener('change', gestisciFile);
  el.querySelector('#input-video').addEventListener('change', gestisciFile);
  el.querySelector('#input-galleria').addEventListener('change', gestisciFile);
  el.querySelector('#invia').addEventListener('click', invia);

  await ridisegna();
  invio.avvia();
}

async function gestisciFile(evento) {
  const input = evento.target;
  const file = [...input.files];
  input.value = '';
  await aggiungiFile(file);
}

// Fotocamera interna: si scatta più volte di fila senza uscire dall'app.
// Qui non c'è raggruppamento — ogni foto è una foto — ma il gesto è lo stesso
// del modulo Bolle, così chi usa l'app impara una sola cosa.
async function apriScatto() {
  const scelta = categoria(radice.querySelector('#categoria').value);
  const avviso = radice.querySelector('#avviso-foto');
  if (!scelta) {
    avviso.innerHTML = '<p class="avviso avviso-attenzione">Scegli prima il tipo di foto: cambia come viene inviata.</p>';
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
    radice.querySelector('#input-camera').click();
    return;
  }
  await aggiungiFile(esito.file);
}

async function aggiungiFile(file) {
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
        await coda.aggiungiBozza(singolo, anteprima, singolo.name, tipo, {
          genere: 'video', estensione: estensioneDi(singolo), durata,
        });
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

  // Cambiare categoria con foto già pronte cambierebbe il significato di
  // quelle foto, non come sono state preparate: si avvisa invece di tacere.
  const tipiInAttesa = [...new Set(bozze.map(r => r.tipo))];
  radice.querySelector('#avviso-categoria').innerHTML =
    tipoScelto && tipiInAttesa.length > 0 && tipiInAttesa.some(t => t !== tipoScelto)
      ? `<p class="avviso avviso-attenzione">In attesa ci sono foto di tipo <strong>${scappaHtml(etichettaCategoria(tipiInAttesa[0]))}</strong>: partono con quel tipo, non con quello scelto adesso.</p>`
      : '';

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

  const commessaScelta = radice.querySelector('#commessa').value;
  const pulsanteInvia = radice.querySelector('#invia');
  pulsanteInvia.disabled = bozze.length === 0 || !commessaScelta;
  const quantiVideo = bozze.filter(r => r.genere === 'video').length;
  const quanteFoto = bozze.length - quantiVideo;
  const parti = [];
  if (quanteFoto) parti.push(`${quanteFoto} ${quanteFoto === 1 ? 'foto' : 'foto'}`);
  if (quantiVideo) parti.push(`${quantiVideo} ${quantiVideo === 1 ? 'video' : 'video'}`);
  pulsanteInvia.textContent = bozze.length > 0 ? `Invia ${parti.join(' e ')}` : 'Invia';
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
      // Su un video di decine di MB "in corso" senza altro non dice nulla:
      // la percentuale fa capire che sta salendo e non che è bloccato.
      const percentuale = r.byte > 0 && r.byteInviati > 0
        ? Math.min(100, Math.round((r.byteInviati / r.byte) * 100)) : 0;
      const avanzamento = r.stato === 'invio' && percentuale > 0 && !r.byteCaricati
        ? `<div class="tenue">Caricato ${percentuale}%</div>` : '';
      const riprova = r.stato === 'errore'
        ? `<button class="btn btn-secondario btn-piccolo foto-riprova" data-id="${r.id}">Riprova</button>` : '';
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
              ${scappaHtml(etichettaCantiere(r.commessa))} &middot; ${ora}
            </div>
            <div class="tenue">${scappaHtml(r.autore)} &middot; ${pesoLeggibile(r.byte)}</div>
            ${nota}
            ${avanzamento}
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
      ],
    };
  },
};
