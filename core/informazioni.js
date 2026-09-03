// Pagina Informazioni: cosa serve al supporto quando un operatore chiama dal
// cantiere — versione in uso, stato offline, spazio, numeri della coda.
import { impostazioniApp } from './impostazioni.js';
import * as coda from '../modules/bolle/coda.js';

export async function vistaInformazioni(el) {
  el.innerHTML = '<section class="scheda"><h2>Informazioni</h2><p class="tenue">Lettura in corso&hellip;</p></section>';

  const [versione, spazio, record, storico, progressivo] = await Promise.all([
    versioneInUso(),
    spazioUsato(),
    coda.elenca().catch(() => []),
    coda.elencaStorico().catch(() => []),
    coda.progressivoRaggiunto().catch(() => 0),
  ]);

  const oggi = coda.contatoriOggi();
  const inAttesa = record.filter(r => r.stato === 'in_coda' || r.stato === 'invio').length;
  const inErrore = record.filter(r => r.stato === 'errore').length;
  const bozze = record.filter(r => r.stato === 'bozza').length;
  const offline = 'serviceWorker' in navigator && navigator.serviceWorker.controller
    ? 'Attivo — l\'app funziona anche senza rete'
    : 'Non ancora attivo — riapri l\'app una seconda volta';

  el.innerHTML = `
    <section class="scheda">
      <h2>Informazioni</h2>
      <dl class="info-elenco">
        <dt>Versione</dt><dd>${versione}</dd>
        <dt>Operatore</dt><dd>${impostazioniApp.autore || '—'}</dd>
        <dt>Funzionamento offline</dt><dd>${offline}</dd>
        <dt>Rete in questo momento</dt><dd>${navigator.onLine ? 'connesso' : 'assente'}</dd>
        <dt>Spazio usato sul telefono</dt><dd>${spazio}</dd>
        <dt>Foto da inviare</dt><dd>${bozze}</dd>
        <dt>In coda o in errore</dt><dd>${inAttesa} in attesa, ${inErrore} in errore</dd>
        <dt>Bolle nello storico</dt><dd>${storico.length}</dd>
        <dt>Numero progressivo raggiunto</dt><dd>${progressivo || '—'}</dd>
      </dl>
      <button id="cerca-aggiornamenti" class="btn btn-secondario">Cerca aggiornamenti</button>
      <p id="esito-aggiornamento" class="tenue"></p>
    </section>
    <section class="scheda">
      <h2>Riparti col conteggio di oggi</h2>
      <p class="tenue">Da usare quando l'ufficio ha tolto da SharePoint delle bolle mandate per sbaglio e queste vanno rimandate: i contatori di oggi contano anche gli invii annullati, e non si capisce più quanti siano quelli veri.</p>
      <p class="tenue">Azzera <strong>solo i contatori del giorno</strong> e toglie dall'elenco le bolle già confermate dal server. <strong>Non</strong> tocca le foto ancora da inviare o in errore, lo storico delle bolle inviate, la numerazione progressiva.</p>
      <button id="azzera-giorno" class="btn btn-secondario">Azzera i contatori di oggi</button>
      <div id="conferma-azzeramento" class="avviso avviso-attenzione nascosto">
        <p><strong>Confermi?</strong> I contatori di oggi (${oggi.scattate} scattate, ${oggi.inviate} inviate) ripartono da zero.</p>
        <div class="azioni-riga">
          <button id="annulla-azzeramento" class="btn btn-secondario">Annulla</button>
          <button id="conferma-azzera" class="btn btn-primario">Sì, azzera</button>
        </div>
      </div>
      <p id="esito-azzeramento" class="tenue"></p>
    </section>
    <a class="btn btn-secondario" href="#/">Torna all'app</a>
  `;

  // Due passaggi, non uno: il pulsante sta in una pagina secondaria e chiede
  // conferma, così non si preme per sbaglio con i guanti.
  const riquadro = el.querySelector('#conferma-azzeramento');
  const esitoAzzera = el.querySelector('#esito-azzeramento');
  el.querySelector('#azzera-giorno').addEventListener('click', () => {
    riquadro.classList.remove('nascosto');
    esitoAzzera.textContent = '';
  });
  el.querySelector('#annulla-azzeramento').addEventListener('click', () => {
    riquadro.classList.add('nascosto');
  });
  el.querySelector('#conferma-azzera').addEventListener('click', async () => {
    riquadro.classList.add('nascosto');
    const prima = coda.azzeraContatoriOggi();
    const tolte = await coda.rimuoviInviate().catch(() => 0);
    const rimaste = (await coda.elenca().catch(() => []))
      .filter(r => r.stato !== 'inviata').length;
    esitoAzzera.textContent =
      `Conteggio ripartito da zero (erano ${prima.scattate} scattate e ${prima.inviate} inviate). `
      + `Tolte dall'elenco ${tolte} bolle già confermate; ${rimaste} foto restano sul telefono.`;
  });

  el.querySelector('#cerca-aggiornamenti').addEventListener('click', async () => {
    const esito = el.querySelector('#esito-aggiornamento');
    esito.textContent = 'Controllo in corso…';
    if (!('serviceWorker' in navigator)) {
      esito.textContent = 'Aggiornamento non disponibile su questo browser.';
      return;
    }
    try {
      const registrazione = await navigator.serviceWorker.getRegistration();
      if (registrazione) await registrazione.update();
      esito.textContent = 'Controllo eseguito: se c\'è una versione nuova compare l\'avviso in alto.';
    } catch {
      esito.textContent = 'Controllo non riuscito: riprova quando hai rete.';
    }
  });
}

// La versione non è scritta due volte: si legge dal nome della cache che il
// service worker ha davvero attiva, così non può divergere dal codice.
async function versioneInUso() {
  if (!('caches' in window)) return 'non disponibile';
  try {
    const nomi = await caches.keys();
    const cache = nomi.find(nome => nome.startsWith('llitalia-'));
    return cache ? cache.replace('llitalia-', '') : 'non ancora installata';
  } catch {
    return 'non disponibile';
  }
}

async function spazioUsato() {
  if (!navigator.storage || !navigator.storage.estimate) return 'non disponibile';
  try {
    const { usage } = await navigator.storage.estimate();
    if (!usage) return 'meno di 1 MB';
    return `${(usage / 1048576).toFixed(1)} MB`;
  } catch {
    return 'non disponibile';
  }
}
