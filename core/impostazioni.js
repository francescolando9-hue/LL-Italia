// Impostazioni di app (condivise tra i moduli), persistite in localStorage.
// L'identificativo del dispositivo fa eccezione: vive in IndexedDB
// (core/dispositivo.js), perché localStorage è più esposto alle pulizie del
// browser e un identificativo che cambia da solo spezza le sequenze in
// raccolta senza dare alcun segnale.
import { naviga } from './router.js';
import { idDispositivo } from './dispositivo.js';
import { OPERATORI, operatoreValido, riconosciOperatore } from './operatori.js';

const CHIAVE = 'llitalia.app';

function leggi() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE)) || {};
  } catch {
    return {};
  }
}

function scrivi(dati) {
  localStorage.setItem(CHIAVE, JSON.stringify(dati));
}

export const impostazioniApp = {
  // Solo un nome dell'elenco vale come operatore. Un telefono aggiornato da
  // una versione precedente aveva testo libero: se corrisponde a un nome
  // dell'elenco lo si riporta alla grafia ufficiale e si prosegue, altrimenti
  // si risponde «nessuno» e l'app richiede la scelta. Meglio una domanda in
  // più che un invio attribuito per somiglianza.
  get autore() {
    const salvato = (leggi().autore || '').trim();
    if (operatoreValido(salvato)) return salvato;
    const riconosciuto = riconosciOperatore(salvato);
    if (riconosciuto) {
      impostazioniApp.autore = riconosciuto;
      return riconosciuto;
    }
    return '';
  },
  set autore(valore) {
    const dati = leggi();
    dati.autore = String(valore).trim();
    scrivi(dati);
  },
};

// L'elenco come opzioni, con il segnaposto quando non c'è ancora una scelta:
// senza segnaposto il primo nome risulterebbe selezionato senza che nessuno
// l'abbia toccato, e basterebbe non guardare per firmare a nome di Paolo.
function opzioniOperatori(scelto) {
  const segnaposto = operatoreValido(scelto)
    ? '' : '<option value="" selected disabled>— scegli il tuo nome —</option>';
  return segnaposto + OPERATORI.map(nome =>
    `<option value="${scappaHtml(nome)}"${nome === scelto ? ' selected' : ''}>${scappaHtml(nome)}</option>`
  ).join('');
}

// Prima apertura: chiede nome e cognome prima di usare i moduli.
export function vistaBenvenuto(el) {
  el.innerHTML = `
    <section class="scheda">
      <h2>Benvenuto</h2>
      <p>Questa è l'app di cantiere del gruppo <strong>LL Italia</strong>.</p>
      <p>Prima di iniziare, scegli il tuo nome: viene allegato a ogni invio.</p>
      <form id="modulo-benvenuto">
        <div class="campo">
          <label for="autore">Il tuo nome</label>
          <select id="autore" name="autore" required>${opzioniOperatori('')}</select>
          <p class="aiuto tenue">Se il tuo nome non c'è, chiedi in ufficio: l'elenco si aggiorna dall'app, non dal telefono.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva e continua</button>
      </form>
    </section>
  `;
  el.querySelector('#modulo-benvenuto').addEventListener('submit', evento => {
    evento.preventDefault();
    const autore = el.querySelector('#autore').value;
    if (!operatoreValido(autore)) return;
    impostazioniApp.autore = autore;
    naviga('#/', true);
  });
}

// Impostazioni di app modificabili in ogni momento.
export function vistaImpostazioniApp(el) {
  el.innerHTML = `
    <section class="scheda">
      <h2>Impostazioni app</h2>
      <form id="modulo-impostazioni">
        <div class="campo">
          <label for="autore">Il tuo nome</label>
          <select id="autore" name="autore" required>${opzioniOperatori(impostazioniApp.autore)}</select>
          <p class="aiuto tenue">Allegato a ogni invio, condiviso tra tutti i moduli. L'elenco è chiuso perché in raccolta lo stesso nome scritto in due modi diventa due persone.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto">Impostazioni salvate.</p>
    </section>
    <section class="scheda">
      <h2>Questo dispositivo</h2>
      <p class="tenue">Identificativo generato alla prima apertura. Non cambia se correggi il tuo nome; l'ufficio lo usa per ricondurre a questo telefono la numerazione delle bolle.</p>
      <div class="campo">
        <label for="id-dispositivo">Identificativo</label>
        <input id="id-dispositivo" type="text" value="Lettura in corso&hellip;" readonly>
        <p class="aiuto tenue">Per un riscontro a voce bastano le prime cifre.</p>
      </div>
      <button id="copia-dispositivo" class="btn btn-secondario" type="button">Copia identificativo</button>
    </section>
    <p style="text-align:center"><a class="tenue" href="#/informazioni">Informazioni sull'app</a></p>
  `;
  el.querySelector('#modulo-impostazioni').addEventListener('submit', evento => {
    evento.preventDefault();
    const autore = el.querySelector('#autore').value;
    if (!operatoreValido(autore)) return;
    impostazioniApp.autore = autore;
    el.querySelector('#conferma').classList.remove('nascosto');
  });

  const campoId = el.querySelector('#id-dispositivo');
  const bottoneCopia = el.querySelector('#copia-dispositivo');
  idDispositivo().then(id => {
    campoId.value = id;
  }).catch(() => {
    campoId.value = 'non disponibile';
    bottoneCopia.disabled = true;
  });
  bottoneCopia.addEventListener('click', async () => {
    campoId.select();
    try {
      await navigator.clipboard.writeText(campoId.value);
      bottoneCopia.textContent = 'Copiato';
    } catch {
      // Senza permesso per gli appunti resta la selezione: si copia a mano.
      bottoneCopia.textContent = 'Copia col dito';
    }
    setTimeout(() => { bottoneCopia.textContent = 'Copia identificativo'; }, 2000);
  });
}

export function scappaHtml(testo) {
  return String(testo)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
