// Configurazione trasferibile, condivisa da tutti i moduli.
//
// Un dispositivo già configurato genera un link (e il suo QR) che ne configura
// un altro. Evita di dettare a voce un URL firmato di quattrocento caratteri su
// ogni telefono di cantiere: sulle bolle una copia manuale è già costata un'ora
// di diagnosi — una lettera cambiata nel nome di un parametro e un carattere
// perso dalla firma.
//
// I dati viaggiano DENTRO l'hash dell'indirizzo, che il browser non invia al
// server: non finiscono nei log di GitHub Pages. Restano però un segreto in
// mano a chi riceve il link: va consegnato come si consegna una password.
//
// Sta nella shell perché il meccanismo è identico per ogni modulo e cambiano
// solo i testi: due copie divergerebbero, e la copia rimasta indietro sarebbe
// quella che perde un carattere della firma senza dirlo.
import { scappaHtml } from './impostazioni.js';
import { pulisciParametri } from './router.js';

function inBase64Url(testo) {
  return btoa(unescape(encodeURIComponent(testo)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function daBase64Url(testo) {
  const normale = String(testo).replaceAll('-', '+').replaceAll('_', '/');
  const riempito = normale + '='.repeat((4 - (normale.length % 4)) % 4);
  return decodeURIComponent(escape(atob(riempito)));
}

// `descrittore` porta ciò che cambia da modulo a modulo: dove tornare, come si
// leggono e si salvano le impostazioni, e le frasi da mostrare all'operatore.
export function configurazioneTrasferibile(descrittore) {
  const {
    rotta,                 // es. '#/foto'
    etichettaModulo,       // es. 'Foto cantiere', per i pulsanti di ritorno
    frasePresentazione,    // cosa contiene il link e cosa abilita
    fraseFatto,            // cosa può fare l'operatore appena configurato
    fraseAvvisoQr,         // il promemoria che il QR vale come una password
    impostazioni,          // () => impostazioni correnti del modulo
    salva,                 // (dati) => salva le impostazioni del modulo
    normalizzaEndpoint,    // (url) => url con api-version corretta
    extraDaSalvare = {},   // campi da forzare all'applicazione del link
  } = descrittore;

  function linkConfigurazione(correnti) {
    const base = `${location.origin}${location.pathname}`;
    return `${base}${rotta}/configura?e=${inBase64Url(correnti.endpoint)}&t=${inBase64Url(correnti.token)}`;
  }

  // --- Ricezione: applica la configurazione arrivata dal link ---------------

  function vistaConfigura(el, _sotto, parametri) {
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
        <a class="btn btn-secondario" href="${rotta}">Vai a ${scappaHtml(etichettaModulo)}</a>
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
    const attuali = impostazioni();

    el.innerHTML = `
      <section class="scheda">
        <h2>Configura questo telefono</h2>
        <p>${frasePresentazione}</p>
        <dl class="info-elenco">
          <dt>Destinazione</dt><dd>${scappaHtml(dominio)}</dd>
          <dt>Codice di accesso</dt><dd>${scappaHtml(tokenMascherato)}</dd>
        </dl>
        ${attuali.endpoint && attuali.endpoint !== endpoint
          ? '<p class="avviso avviso-attenzione">Questo telefono era già configurato con una destinazione diversa: applicando, quella precedente viene sostituita.</p>'
          : ''}
        <button id="applica" class="btn btn-primario">Applica configurazione</button>
        <a class="btn btn-secondario" href="${rotta}">Annulla</a>
      </section>
    `;

    el.querySelector('#applica').addEventListener('click', () => {
      salva({ endpoint, token, ...extraDaSalvare });
      // Il link non deve restare nell'indirizzo né nella cronologia del browser.
      pulisciParametri();
      el.innerHTML = `
        <section class="scheda">
          <h2>Telefono configurato</h2>
          <p>${fraseFatto}</p>
        </section>
        <a class="btn btn-primario" href="${rotta}">Vai a ${scappaHtml(etichettaModulo)}</a>
      `;
    });
  }

  // --- Invio: mostra link e QR da far inquadrare ---------------------------

  async function vistaCondividi(el) {
    const correnti = impostazioni();
    if (!correnti.endpoint) {
      el.innerHTML = `
        <section class="scheda">
          <h2>Niente da condividere</h2>
          <p>Questo telefono non è ancora configurato: inserisci indirizzo e codice nelle impostazioni, poi potrai passarli agli altri da qui.</p>
        </section>
        <a class="btn btn-secondario" href="${rotta}/impostazioni">Impostazioni del modulo</a>
      `;
      return;
    }

    const link = linkConfigurazione(correnti);
    el.innerHTML = `
      <section class="scheda">
        <h2>Configura un altro telefono</h2>
        <p>Fai inquadrare questo codice con la fotocamera dell'altro telefono: si apre l'app già pronta, senza digitare nulla.</p>
        <div id="qr" class="qr-configurazione"><p class="tenue">Generazione del codice&hellip;</p></div>
        <p class="avviso avviso-attenzione">${fraseAvvisoQr}</p>
        <button id="copia-link" class="btn btn-secondario">Copia il link</button>
        <p id="esito-copia" class="tenue"></p>
      </section>
      <a class="btn btn-secondario" href="${rotta}">Torna a ${scappaHtml(etichettaModulo)}</a>
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
      const { default: qrcode } = await import('./vendor/qrcode.mjs');
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

  return { linkConfigurazione, vistaConfigura, vistaCondividi };
}
