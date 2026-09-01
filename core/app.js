// Bootstrap della shell: registro moduli, rotte, service worker.
import { avviaRouter, registraRotta, naviga } from './router.js';
import { vistaHome } from './home.js';
import { impostazioniApp, vistaBenvenuto, vistaImpostazioniApp } from './impostazioni.js';
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
for (const modulo of moduli) {
  modulo.registra(registraRotta);
}

avviaRouter(document.getElementById('vista'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(errore => {
      console.warn('Registrazione service worker non riuscita:', errore);
    });
  });
}
