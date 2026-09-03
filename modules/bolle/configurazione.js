// Configurazione trasferibile: un dispositivo già configurato genera un link
// (e il suo QR) che ne configura un altro. Evita di dettare a voce un URL
// firmato di quattrocento caratteri su ogni telefono di cantiere.
//
// I dati viaggiano DENTRO l'hash dell'indirizzo, che il browser non invia al
// server: non finiscono nei log di GitHub Pages. Restano però un segreto in
// mano a chi riceve il link: va consegnato come si consegna una password.
import { scappaHtml } from '../../core/impostazioni.js';
import { pulisciParametri } from '../../core/router.js';
import { impostazioniBolle, salvaImpostazioniBolle, normalizzaEndpoint } from './impostazioni.js';

function inBase64Url(testo) {
  return btoa(unescape(encodeURIComponent(testo)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function daBase64Url(testo) {
  const normale = String(testo).replaceAll('-', '+').replaceAll('_', '/');
  const riempito = normale + '='.repeat((4 - (normale.length % 4)) % 4);
  return decodeURIComponent(escape(atob(riempito)));
}

export function linkConfigurazione(impostazioni) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/bolle/configura?e=${inBase64Url(impostazioni.endpoint)}&t=${inBase64Url(impostazioni.token)}`;
}

// --- Ricezione: applica la configurazione arrivata dal link ------------------

export function vistaConfigura(el, _sotto, parametri) {
  let endpoint = '';
  let token = '';
  try {
    endpoint = normalizzaEndpoint(daBase64Url(parametri.get('e') || ''));
    token = daBase64Url(parametri.get('t') || '');
  } catch {
    endpoint = '';
  }

  if (!endpoint || !token) {
    el.innerHTML = `
      <section class="scheda">
        <h2>Configurazione non valida</h2>
        <p>Questo link non contiene una configurazione leggibile. Chiedi che te ne venga inviato uno nuovo, oppure inserisci i dati a mano dalle impostazioni.</p>
      </section>
      <a class="btn btn-secondario" href="#/bolle">Vai a Bolle</a>
    `;
    return;
  }

  let dominio = endpoint;
  try {
    dominio = new URL(endpoint).host;
  } catch {
    // se l'URL non è interpretabile si mostra il testo così com'è
  }
  const tokenMascherato = token.length > 6
    ? `${'•'.repeat(token.length - 4)}${token.slice(-4)}`
    : '••••';
  const attuali = impostazioniBolle();

  el.innerHTML = `
    <section class="scheda">
      <h2>Configura questo telefono</h2>
      <p>Il link contiene l'indirizzo del magazzino e il codice di accesso. Applicandolo, questo telefono potrà inviare le bolle.</p>
      <dl class="info-elenco">
        <dt>Destinazione</dt><dd>${scappaHtml(dominio)}</dd>
        <dt>Codice di accesso</dt><dd>${scappaHtml(tokenMascherato)}</dd>
      </dl>
      ${attuali.endpoint && attuali.endpoint !== endpoint
        ? '<p class="avviso avviso-attenzione">Questo telefono era già configurato con una destinazione diversa: applicando, quella precedente viene sostituita.</p>'
        : ''}
      <button id="applica" class="btn btn-primario">Applica configurazione</button>
      <a class="btn btn-secondario" href="#/bolle">Annulla</a>
    </section>
  `;

  el.querySelector('#applica').addEventListener('click', () => {
    salvaImpostazioniBolle({ endpoint, token, mock: false });
    // Il link non deve restare nell'indirizzo né nella cronologia del browser.
    pulisciParametri();
    el.innerHTML = `
      <section class="scheda">
        <h2>Telefono configurato</h2>
        <p>Puoi iniziare a mandare le bolle. Se ti viene chiesto nome e cognome, è la prima volta: scrivilo e prosegui.</p>
      </section>
      <a class="btn btn-primario" href="#/bolle">Vai a Bolle</a>
    `;
  });
}

// --- Invio: mostra link e QR da far inquadrare ------------------------------

export async function vistaCondividi(el) {
  const impostazioni = impostazioniBolle();
  if (!impostazioni.endpoint) {
    el.innerHTML = `
      <section class="scheda">
        <h2>Niente da condividere</h2>
        <p>Questo telefono non è ancora configurato: inserisci indirizzo e codice nelle impostazioni, poi potrai passarli agli altri da qui.</p>
      </section>
      <a class="btn btn-secondario" href="#/bolle/impostazioni">Impostazioni del modulo</a>
    `;
    return;
  }

  const link = linkConfigurazione(impostazioni);
  el.innerHTML = `
    <section class="scheda">
      <h2>Configura un altro telefono</h2>
      <p>Fai inquadrare questo codice con la fotocamera dell'altro telefono: si apre l'app già pronta, senza digitare nulla.</p>
      <div id="qr" class="bolle-qr"><p class="tenue">Generazione del codice&hellip;</p></div>
      <p class="avviso avviso-attenzione">Questo codice contiene il codice di accesso al magazzino: vale come una password. Mostralo solo a chi deve usare l'app e non appenderlo in bacheca.</p>
      <button id="copia-link" class="btn btn-secondario">Copia il link</button>
      <p id="esito-copia" class="tenue"></p>
    </section>
    <a class="btn btn-secondario" href="#/bolle">Torna a Bolle</a>
  `;

  el.querySelector('#copia-link').addEventListener('click', async () => {
    const esito = el.querySelector('#esito-copia');
    try {
      await navigator.clipboard.writeText(link);
      esito.textContent = 'Link copiato. Mandalo per messaggio diretto, non in un gruppo.';
    } catch {
      esito.textContent = 'Copia non riuscita: usa il codice qui sopra.';
    }
  });

  // Il generatore di QR si carica solo qui: non pesa sull'avvio dell'app.
  const contenitore = el.querySelector('#qr');
  try {
    const { default: qrcode } = await import('../../core/vendor/qrcode.mjs');
    // Correzione errori 'L': il link è lungo, e un livello più alto
    // richiederebbe una griglia più fitta, più difficile da inquadrare.
    const codice = qrcode(0, 'L');
    codice.addData(link);
    codice.make();
    contenitore.innerHTML = codice.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
  } catch {
    contenitore.innerHTML = '<p class="avviso avviso-errore">Codice non generabile su questo dispositivo: usa il pulsante per copiare il link.</p>';
  }
}
