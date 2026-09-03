// Bootstrap della shell: registro moduli, rotte, service worker.
import { avviaRouter, registraRotta, naviga } from './router.js';
import { vistaHome } from './home.js';
import { impostazioniApp, vistaBenvenuto, vistaImpostazioniApp } from './impostazioni.js';
import { vistaInformazioni } from './informazioni.js';
import moduloBolle from '../modules/bolle/index.js';

// Registro dei moduli: aggiungerne uno = importarlo e aggiungerlo qui.
const moduli = [moduloBolle];

registraRotta('#/', () => {
  if (!impostazioniApp.autore) {
    naviga('#/benvenuto', true);
    return;
  }
  // Con un solo modulo l'app apre direttamente su di esso;
  // la home/launcher resta raggiungibile dal marchio in testata (#/home).
  naviga(moduli.length === 1 ? `#/${moduli[0].id}` : '#/home', true);
});
registraRotta('#/home', el => vistaHome(el, moduli));
registraRotta('#/benvenuto', vistaBenvenuto);
registraRotta('#/impostazioni', vistaImpostazioniApp);
registraRotta('#/informazioni', vistaInformazioni);
for (const modulo of moduli) {
  modulo.registra(registraRotta);
}

avviaRouter(document.getElementById('vista'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    let registrazione;
    try {
      registrazione = await navigator.serviceWorker.register('./sw.js');
    } catch (errore) {
      console.warn('Registrazione service worker non riuscita:', errore);
      return;
    }
    // Con utenti in cantiere l'aggiornamento non può dipendere da chi svuota la
    // cache: quando arriva una versione nuova si avvisa e si ricarica su richiesta.
    registrazione.addEventListener('updatefound', () => {
      const nuovo = registrazione.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', () => {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) {
          mostraAvvisoAggiornamento();
        }
      });
    });
  });
}

function mostraAvvisoAggiornamento() {
  if (document.getElementById('avviso-aggiornamento')) return;
  const barra = document.createElement('div');
  barra.id = 'avviso-aggiornamento';
  barra.className = 'barra-aggiornamento';
  barra.innerHTML = `
    <span>È disponibile una versione aggiornata dell'app.</span>
    <button type="button">Aggiorna</button>
  `;
  barra.querySelector('button').addEventListener('click', () => location.reload());
  document.body.appendChild(barra);
}
