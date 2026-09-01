// Impostazioni di app (condivise tra i moduli), persistite in localStorage.
import { naviga } from './router.js';

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
  get autore() {
    return (leggi().autore || '').trim();
  },
  set autore(valore) {
    const dati = leggi();
    dati.autore = String(valore).trim();
    scrivi(dati);
  },
};

// Prima apertura: chiede nome e cognome prima di usare i moduli.
export function vistaBenvenuto(el) {
  el.innerHTML = `
    <section class="scheda">
      <h2>Benvenuto</h2>
      <p>Questa è l'app di cantiere del gruppo <strong>LL Italia</strong>.</p>
      <p>Prima di iniziare, inserisci nome e cognome: verranno allegati a ogni invio.</p>
      <form id="modulo-benvenuto">
        <div class="campo">
          <label for="autore">Nome e cognome</label>
          <input id="autore" name="autore" type="text" autocomplete="name"
                 placeholder="Es. Paolo Sanzarello" required>
        </div>
        <button class="btn btn-primario" type="submit">Salva e continua</button>
      </form>
    </section>
  `;
  el.querySelector('#modulo-benvenuto').addEventListener('submit', evento => {
    evento.preventDefault();
    const autore = el.querySelector('#autore').value.trim();
    if (!autore) return;
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
          <label for="autore">Nome e cognome</label>
          <input id="autore" name="autore" type="text" autocomplete="name"
                 value="${scappaHtml(impostazioniApp.autore)}" required>
          <p class="aiuto tenue">Allegato a ogni invio, condiviso tra tutti i moduli.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto">Impostazioni salvate.</p>
    </section>
  `;
  el.querySelector('#modulo-impostazioni').addEventListener('submit', evento => {
    evento.preventDefault();
    const autore = el.querySelector('#autore').value.trim();
    if (!autore) return;
    impostazioniApp.autore = autore;
    el.querySelector('#conferma').classList.remove('nascosto');
  });
}

export function scappaHtml(testo) {
  return String(testo)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
