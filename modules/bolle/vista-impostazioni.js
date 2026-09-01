// Impostazioni del modulo Bolle: endpoint, token, mock, foto conservate.
// L'elenco cantieri non è modificabile dal dispositivo: sta in cantieri.js,
// perché un codice commessa errato arriverebbe al magazzino come inesistente.
import { scappaHtml } from '../../core/impostazioni.js';
import {
  impostazioniBolle, salvaImpostazioniBolle, normalizzaEndpoint,
  endpointDaCorreggere, API_VERSION,
} from './impostazioni.js';
import { CANTIERI } from './cantieri.js';
import * as coda from './coda.js';

export function vistaImpostazioniBolle(el) {
  const impostazioni = impostazioniBolle();
  const elencoCantieri = CANTIERI.map(c => scappaHtml(c.etichetta)).join(' · ');
  el.innerHTML = `
    <section class="scheda">
      <h2>Impostazioni Bolle</h2>
      <form id="modulo-imp-bolle">
        <div class="campo">
          <label for="endpoint">Endpoint di invio (URL)</label>
          <input id="endpoint" type="url" inputmode="url" placeholder="https://&hellip;"
                 value="${scappaHtml(impostazioni.endpoint)}">
          <p class="aiuto tenue">Lo comunica Francesco. Contiene una firma di accesso: vive solo su questo dispositivo, mai nel repo. La versione API viene corretta in automatico a <code>${API_VERSION}</code> (il designer di Power Automate mostra <code>api-version=1</code>, che il servizio rifiuta con 400).</p>
        </div>
        <div class="campo">
          <label for="token">Token</label>
          <input id="token" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
                 value="${scappaHtml(impostazioni.token)}">
          <p class="aiuto tenue">Inviato nel corpo di ogni richiesta; in collaudo vale <code>collaudo</code>.</p>
        </div>
        <div class="campo">
          <label class="campo-interruttore" for="mock">
            <input id="mock" type="checkbox" ${impostazioni.mock ? 'checked' : ''}>
            Modalità mock (invii simulati, senza backend)
          </label>
        </div>
        <div class="campo">
          <label for="conserva">Foto inviate da conservare (ultime N)</label>
          <input id="conserva" type="number" inputmode="numeric" min="0" step="1"
                 value="${impostazioni.conservaUltime}">
          <p class="aiuto tenue">Le foto confermate dal server oltre le ultime N vengono eliminate dal dispositivo.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto"></p>
      <p class="tenue">Cantieri disponibili: ${elencoCantieri}.</p>
      <a class="btn btn-secondario" href="#/bolle">Torna a Bolle</a>
    </section>
  `;

  el.querySelector('#modulo-imp-bolle').addEventListener('submit', async evento => {
    evento.preventDefault();
    const endpointInserito = el.querySelector('#endpoint').value.trim();
    const corretto = endpointDaCorreggere(endpointInserito);
    const conserva = parseInt(el.querySelector('#conserva').value, 10);
    const nuove = salvaImpostazioniBolle({
      endpoint: endpointInserito,
      token: el.querySelector('#token').value.trim() || 'collaudo',
      mock: el.querySelector('#mock').checked,
      conservaUltime: Number.isInteger(conserva) && conserva >= 0
        ? conserva : impostazioniBolle().conservaUltime,
    });
    if (endpointInserito) el.querySelector('#endpoint').value = normalizzaEndpoint(endpointInserito);
    el.querySelector('#token').value = nuove.token;
    // Il nuovo limite di conservazione si applica subito.
    await coda.potaInviate(nuove.conservaUltime);
    const conferma = el.querySelector('#conferma');
    conferma.textContent = corretto
      ? `Impostazioni salvate. Versione API dell'endpoint corretta a ${API_VERSION}.`
      : 'Impostazioni salvate.';
    conferma.classList.remove('nascosto');
  });
}
