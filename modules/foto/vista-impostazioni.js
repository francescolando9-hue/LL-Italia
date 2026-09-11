// Impostazioni del modulo Foto: endpoint del proprio flow, token, foto
// conservate sul dispositivo. L'elenco cantieri e le due categorie non si
// toccano da qui: stanno in codice, perché un valore errato arriverebbe a
// destinazione come commessa o categoria inesistente.
import { scappaHtml } from '../../core/impostazioni.js';
import {
  impostazioniFoto, salvaImpostazioniFoto, normalizzaEndpoint,
  endpointDaCorreggere, API_VERSION,
} from './impostazioni.js';
import { CATEGORIE } from './categorie.js';

export function vistaImpostazioniFoto(el) {
  const impostazioni = impostazioniFoto();
  const elencoCategorie = CATEGORIE.map(c => `<li>${scappaHtml(c.etichetta)} — <code>${scappaHtml(c.codice)}</code>${c.originale ? ', inviata a risoluzione originale' : ', compressa'}</li>`).join('');
  el.innerHTML = `
    <section class="scheda">
      <h2>Impostazioni Foto cantiere</h2>
      <form id="modulo-imp-foto">
        <div class="campo">
          <label for="endpoint">Endpoint di invio (URL)</label>
          <input id="endpoint" type="url" inputmode="url" placeholder="https://&hellip;"
                 value="${scappaHtml(impostazioni.endpoint)}">
          <p class="aiuto tenue">È l'indirizzo del flow <strong>delle foto</strong>, diverso da quello delle bolle. Contiene una firma di accesso: vive solo su questo dispositivo, mai nel repo. La versione API viene corretta in automatico a <code>${API_VERSION}</code>.</p>
        </div>
        <div class="campo">
          <label for="token">Token</label>
          <input id="token" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
                 value="${scappaHtml(impostazioni.token)}">
        </div>
        <div class="campo">
          <label for="conserva">Foto inviate da conservare (ultime N)</label>
          <input id="conserva" type="number" inputmode="numeric" min="0" step="1"
                 value="${impostazioni.conservaUltime}">
          <p class="aiuto tenue">Le foto d'archivio non sono compresse e pesano: tenerne poche sul telefono è voluto.</p>
        </div>
        <div class="campo">
          <label for="limite">Peso massimo di un invio (MB)</label>
          <input id="limite" type="number" inputmode="numeric" min="1" step="1"
                 value="${impostazioni.limiteMB}">
          <p class="aiuto tenue">Serve ai video, che non si possono comprimere sul telefono: il contenuto viaggia dentro JSON, che aggiunge un terzo al peso, e oltre una certa taglia il flow rifiuta. Un file più grande non viene accodato e l'app lo dice subito, invece di farlo ritentare a vuoto. Il valore giusto lo dice il collaudo sul flow.</p>
        </div>
        <div class="campo">
          <label class="campo-interruttore" for="due-fasi">
            <input id="due-fasi" type="checkbox" ${impostazioni.dueFasi ? 'checked' : ''}>
            Caricamento a blocchi per i file grandi
          </label>
          <p class="aiuto tenue">Da accendere <strong>solo quando il flow sa gestirlo</strong>: il telefono gli chiede dove mettere i byte e li manda a blocchi, direttamente. Serve ai video, che altrimenti non passano. Su un flow che non lo sa fare l'app lo dice con un errore chiaro, senza perdere il file.</p>
          <p class="avviso avviso-attenzione">Oggi <strong>va lasciato spento</strong>: al 10/09/2026 la sessione di caricamento non si riesce ancora ad aprire (il tenant risponde <em>403</em> alla creazione), quindi il flow non ha dove mandarti i byte. Si accende quando l'ufficio conferma che la prova sul flow è passata.</p>
        </div>
        <div class="campo">
          <label for="limite-due-fasi">Peso massimo col caricamento a blocchi (MB)</label>
          <input id="limite-due-fasi" type="number" inputmode="numeric" min="1" step="1"
                 value="${impostazioni.limiteDueFasiMB}">
          <p class="aiuto tenue">Qui il vincolo non è più la taglia della richiesta ma il tempo: un video da 200 MB su rete di cantiere è lungo da mandare.</p>
        </div>
        <div class="campo">
          <label for="blocco">Taglia dei blocchi (MB)</label>
          <input id="blocco" type="number" inputmode="numeric" min="1" step="1"
                 value="${impostazioni.bloccoMB}">
          <p class="aiuto tenue">Blocchi più piccoli ripartono meglio dopo un buco di rete, più grandi sono un po' più veloci. Il valore viene arrotondato a multipli di 320 KiB, come richiede il servizio.</p>
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto"></p>
    </section>
    <section class="scheda">
      <h2>Foto e video</h2>
      <p class="tenue">Le foto si scattano con la fotocamera dell'app (più scatti di fila) o con quella del telefono. I <strong>video</strong> si registrano sempre con la fotocamera del telefono: registrare dentro l'app darebbe formati diversi fra Android e iPhone e non userebbe l'encoder del telefono. Un video non viene compresso: parte come l'ha prodotto il telefono, quindi conta il limite di peso sopra.</p>
      <p class="tenue">Sotto il primo limite il file viaggia in una sola richiesta. Sopra, se il caricamento a blocchi è acceso, il telefono lo manda in più pezzi e <strong>riprende da dove si era interrotto</strong> invece di ricominciare: è la differenza fra un video che arriva e uno che non arriva mai.</p>
    </section>
    <section class="scheda">
      <h2>Le due categorie</h2>
      <ul class="tenue">${elencoCategorie}</ul>
    </section>
    <section class="scheda">
      <h2>Altri telefoni</h2>
      <p class="tenue">Passa indirizzo e codice a un altro telefono facendogli inquadrare un codice, senza digitare nulla. L'indirizzo del flow è lungo e firmato: copiarlo a mano è il modo più facile per perdere un carattere e passare un'ora a capire perché non funziona.</p>
      <p class="tenue">Il link è <strong>solo di questo modulo</strong>: le bolle hanno una destinazione propria e il loro link si genera dalle impostazioni di Bolle.</p>
      <a class="btn btn-secondario" href="#/foto/condividi">Configura un altro telefono</a>
    </section>
    <a class="btn btn-secondario" href="#/foto">Torna a Foto cantiere</a>
  `;

  el.querySelector('#modulo-imp-foto').addEventListener('submit', evento => {
    evento.preventDefault();
    const endpointInserito = el.querySelector('#endpoint').value.trim();
    const corretto = endpointDaCorreggere(endpointInserito);
    const conserva = parseInt(el.querySelector('#conserva').value, 10);
    const limite = parseInt(el.querySelector('#limite').value, 10);
    const limiteDue = parseInt(el.querySelector('#limite-due-fasi').value, 10);
    const blocco = parseInt(el.querySelector('#blocco').value, 10);
    const nuove = salvaImpostazioniFoto({
      dueFasi: el.querySelector('#due-fasi').checked,
      limiteDueFasiMB: Number.isInteger(limiteDue) && limiteDue >= 1
        ? limiteDue : impostazioniFoto().limiteDueFasiMB,
      bloccoMB: Number.isInteger(blocco) && blocco >= 1
        ? blocco : impostazioniFoto().bloccoMB,
      endpoint: endpointInserito,
      token: el.querySelector('#token').value.trim() || 'collaudo',
      conservaUltime: Number.isInteger(conserva) && conserva >= 0
        ? conserva : impostazioniFoto().conservaUltime,
      limiteMB: Number.isInteger(limite) && limite >= 1
        ? limite : impostazioniFoto().limiteMB,
    });
    if (endpointInserito) el.querySelector('#endpoint').value = normalizzaEndpoint(endpointInserito);
    el.querySelector('#token').value = nuove.token;
    const conferma = el.querySelector('#conferma');
    conferma.textContent = corretto
      ? `Impostazioni salvate. L'indirizzo è stato corretto a api-version=${API_VERSION}.`
      : 'Impostazioni salvate.';
    conferma.classList.remove('nascosto');
  });
}
