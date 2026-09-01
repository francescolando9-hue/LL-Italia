// Impostazioni del modulo Bolle: endpoint, chiave, mock, foto conservate, cantieri.
import { scappaHtml } from '../../core/impostazioni.js';
import { impostazioniBolle, salvaImpostazioniBolle } from './impostazioni.js';
import * as coda from './coda.js';

export function vistaImpostazioniBolle(el) {
  const impostazioni = impostazioniBolle();
  el.innerHTML = `
    <section class="scheda">
      <h2>Impostazioni Bolle</h2>
      <form id="modulo-imp-bolle">
        <div class="campo">
          <label for="endpoint">Endpoint di invio (URL)</label>
          <input id="endpoint" type="url" inputmode="url" placeholder="https://&hellip;"
                 value="${scappaHtml(impostazioni.endpoint)}">
          <p class="aiuto tenue">Lo comunica Francesco. Vive solo su questo dispositivo, mai nel repo.</p>
        </div>
        <div class="campo">
          <label for="chiave">Chiave di accesso</label>
          <input id="chiave" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
                 value="${scappaHtml(impostazioni.chiave)}">
          <p class="aiuto tenue">Inviata dentro il corpo di ogni invio (campo chiave); il flow la verifica.</p>
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
        <div class="campo">
          <label for="cantieri">Cantieri (uno per riga)</label>
          <textarea id="cantieri">${scappaHtml(impostazioni.cantieri.join('\n'))}</textarea>
          <p class="aiuto tenue">Al lancio: MAR. Le altre commesse (MNG, SNZ2.1, SNZ2.2, SNU, BRU, TN1) si aggiungono quando servono.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto">Impostazioni salvate.</p>
      <a class="btn btn-secondario" href="#/bolle">Torna a Bolle</a>
    </section>
  `;

  el.querySelector('#modulo-imp-bolle').addEventListener('submit', async evento => {
    evento.preventDefault();
    const cantieri = [...new Set(
      el.querySelector('#cantieri').value
        .split(/[\n,;]+/)
        .map(voce => voce.trim())
        .filter(Boolean)
    )];
    const conserva = parseInt(el.querySelector('#conserva').value, 10);
    const nuove = salvaImpostazioniBolle({
      endpoint: el.querySelector('#endpoint').value.trim(),
      chiave: el.querySelector('#chiave').value.trim(),
      mock: el.querySelector('#mock').checked,
      conservaUltime: Number.isInteger(conserva) && conserva >= 0 ? conserva : impostazioniBolle().conservaUltime,
      cantieri: cantieri.length > 0 ? cantieri : impostazioniBolle().cantieri,
    });
    // Il nuovo limite di conservazione si applica subito.
    await coda.potaInviate(nuove.conservaUltime);
    el.querySelector('#conferma').classList.remove('nascosto');
  });
}
