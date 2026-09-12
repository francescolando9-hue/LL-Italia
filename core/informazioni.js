// Pagina Informazioni: cosa serve al supporto quando un operatore chiama dal
// cantiere — versione in uso, stato offline, spazio, numeri delle code.
//
// I numeri li dichiara **ogni modulo**, con `stato()` nel proprio descrittore.
// Prima li leggeva la shell, importando direttamente la coda del modulo Bolle:
// due conseguenze, entrambe cattive. La shell dipendeva da un modulo, cioè
// esattamente quello che l'architettura vieta; e con due moduli in uso la
// pagina mostrava solo i numeri delle bolle — un telefono con tre foto ferme
// in errore compariva al supporto come «0 in errore», proprio nella pagina che
// esiste per capire cosa è bloccato.
import { impostazioniApp, scappaHtml } from './impostazioni.js';
import { versioneApp, versioneInstallata } from './versione.js';

export async function vistaInformazioni(el, moduli = []) {
  el.innerHTML = '<section class="scheda"><h2>Informazioni</h2><p class="tenue">Lettura in corso&hellip;</p></section>';

  const conStato = moduli.filter(m => typeof m.stato === 'function');
  const [versione, installata, spazio, stati] = await Promise.all([
    versioneApp(),
    versioneInstallata(),
    spazioUsato(),
    // Un modulo che non risponde non deve lasciare la pagina in caricamento:
    // al supporto serve il resto dei dati, e serve vedere che quel modulo non
    // ha risposto.
    Promise.all(conStato.map(m => Promise.resolve()
      .then(() => m.stato())
      .catch(() => null))),
  ]);

  const offline = 'serviceWorker' in navigator && navigator.serviceWorker.controller
    ? 'Attivo — l\'app funziona anche senza rete'
    : 'Non ancora attivo — riapri l\'app una seconda volta';

  const schedeModuli = conStato.map((modulo, indice) => {
    const stato = stati[indice];
    const titolo = scappaHtml(modulo.titolo || modulo.id);
    if (!stato) {
      return `
        <section class="scheda">
          <h2>${titolo}</h2>
          <p class="avviso avviso-attenzione">Numeri non leggibili su questo telefono: apri il modulo e riprova.</p>
        </section>`;
    }
    const extra = (stato.righe || [])
      .map(([etichetta, valore]) => `<dt>${scappaHtml(etichetta)}</dt><dd>${scappaHtml(valore)}</dd>`)
      .join('');
    // Il numero in errore è quello per cui si telefona: va marcato, non
    // annegato fra gli altri.
    const errore = stato.inErrore > 0
      ? `<dd class="valore-errore">${stato.inErrore} in errore</dd>`
      : '<dd>nessuna in errore</dd>';
    return `
      <section class="scheda">
        <h2>${titolo}</h2>
        <dl class="info-elenco">
          <dt>Da inviare (non ancora confermate)</dt><dd>${stato.bozze}</dd>
          <dt>In coda</dt><dd>${stato.inAttesa}</dd>
          <dt>Bloccate</dt>${errore}
          <dt>Oggi</dt><dd>${(stato.oggi || {}).scattate || 0} scattate, ${(stato.oggi || {}).inviate || 0} inviate</dd>
          ${extra}
        </dl>
      </section>`;
  }).join('');

  // L'azzeramento dei contatori lo dichiara il modulo che ne ha bisogno, con i
  // propri testi: la shell non sa cosa significhi «bolla annullata dall'ufficio».
  const conAzzeramento = moduli.filter(m => m.azzeraGiorno && typeof m.azzeraGiorno.esegui === 'function');
  const schedeAzzeramento = conAzzeramento.map(modulo => {
    const stato = stati[conStato.indexOf(modulo)] || {};
    const oggi = stato.oggi || { scattate: 0, inviate: 0 };
    const id = scappaHtml(modulo.id);
    return `
      <section class="scheda">
        <h2>${scappaHtml(modulo.azzeraGiorno.titolo)}</h2>
        ${(modulo.azzeraGiorno.spiegazione || []).map(t => `<p class="tenue">${t}</p>`).join('')}
        <button id="azzera-${id}" class="btn btn-secondario">Azzera i contatori di oggi</button>
        <div id="conferma-${id}" class="avviso avviso-attenzione nascosto">
          <p><strong>Confermi?</strong> I contatori di oggi (${oggi.scattate} scattate, ${oggi.inviate} inviate) ripartono da zero.</p>
          <div class="azioni-riga">
            <button id="annulla-${id}" class="btn btn-secondario">Annulla</button>
            <button id="conferma-azzera-${id}" class="btn btn-primario">Sì, azzera</button>
          </div>
        </div>
        <p id="esito-${id}" class="tenue"></p>
      </section>`;
  }).join('');

  el.innerHTML = `
    <section class="scheda">
      <h2>Informazioni</h2>
      <dl class="info-elenco">
        <dt>Versione in uso</dt><dd>${versione}</dd>${installata && installata !== versione
          ? `<dt>Versione pronta</dt><dd>${installata} — <strong>chiudi e riapri l'app</strong>, o tocca Aggiorna nella barra in alto: finché non lo fai sta girando la ${versione}</dd>`
          : ''}
        <dt>Operatore</dt><dd>${scappaHtml(impostazioniApp.autore || '—')}</dd>
        <dt>Funzionamento offline</dt><dd>${offline}</dd>
        <dt>Rete in questo momento</dt><dd>${navigator.onLine ? 'connesso' : 'assente'}</dd>
        <dt>Spazio usato sul telefono</dt><dd>${spazio}</dd>
      </dl>
      <button id="cerca-aggiornamenti" class="btn btn-secondario">Cerca aggiornamenti</button>
      <p id="esito-aggiornamento" class="tenue"></p>
    </section>
    ${schedeModuli}
    ${schedeAzzeramento}
    <a class="btn btn-secondario" href="#/">Torna all'app</a>
  `;

  // Due passaggi, non uno: il pulsante sta in una pagina secondaria e chiede
  // conferma, così non si preme per sbaglio con i guanti.
  conAzzeramento.forEach(modulo => {
    const riquadro = el.querySelector(`#conferma-${modulo.id}`);
    const esito = el.querySelector(`#esito-${modulo.id}`);
    el.querySelector(`#azzera-${modulo.id}`).addEventListener('click', () => {
      riquadro.classList.remove('nascosto');
      esito.textContent = '';
    });
    el.querySelector(`#annulla-${modulo.id}`).addEventListener('click', () => {
      riquadro.classList.add('nascosto');
    });
    el.querySelector(`#conferma-azzera-${modulo.id}`).addEventListener('click', async () => {
      riquadro.classList.add('nascosto');
      try {
        esito.textContent = await modulo.azzeraGiorno.esegui();
      } catch {
        esito.textContent = 'Azzeramento non riuscito: riapri il modulo e riprova.';
      }
    });
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
      esito.textContent = 'Controllo eseguito: se c\'è una versione nuova compare l\'avviso in alto. Finché non la applichi, la versione qui sopra è quella che sta davvero girando.';
    } catch {
      esito.textContent = 'Controllo non riuscito: riprova quando hai rete.';
    }
  });
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
