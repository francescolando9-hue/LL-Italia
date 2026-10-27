// «Rimanda questa bolla» (Coda invii): la fase di una bolla non si perde in
// silenzio (dalla 0.41.1, specifica del 27/10/2026, regola 1).
//
// Il difetto: una bolla inviata con una fase che il menù non offre più — tolta
// dal master (`Interrato`), esclusa dalle app (`Marketing`), o che il cantiere
// scelto non prevede (`Strutture` su SNU, dove ci sono i lotti) — apriva il
// riquadro con il menù su «— nessuna fase —» e il pulsante ACCESO su «Rimanda
// corretta»: un tocco e la bolla ripartiva con `fase: ""`, senza che nessuno
// avesse deciso di togliergliela. Ora il pulsante resta spento finché non si
// sceglie una voce, e una frase dice il caso.
//
// I record si scrivono direttamente nel database del telefono come bolle già
// inviate, con la foto ancora sul telefono: l'app quelle fasi non le offre
// più, e non c'è altro modo di far nascere il caso.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Bolle, «Rimanda questa bolla»: la fase non si perde in silenzio',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');

    // ------------------------------------------------------------- strumenti
    const b64 = require('fs').readFileSync(materiale('bolla.jpg')).toString('base64');
    let progressivo = 600;
    // Una bolla già inviata, con la foto ancora sul telefono: è quella per cui
    // la Coda invii mostra «Rimanda».
    const iniettaInviata = async (cantiere, fase) => {
      progressivo += 1;
      const id = await pagina.evaluate(async ({ b64, cantiere, fase, progressivo }) => {
        const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
        const db = await new Promise((ok, ko) => { const r = indexedDB.open('llitalia-bolle'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
        if (!db.objectStoreNames.contains('foto')) throw new Error('database delle bolle senza archivio foto');
        const id = crypto.randomUUID();
        const adesso = Date.now();
        await new Promise((ok, ko) => {
          const tx = db.transaction('foto', 'readwrite');
          tx.objectStore('foto').put({
            id, stato: 'inviata', foto: blob, cantiere, fase, autore: 'Paolo Sanzarello', miniatura: blob,
            impronta: '', qualita: 'ok', motivoQualita: '', nome: `${id}.jpg`,
            timestampDispositivo: '2026-10-26T10:00:00+01:00', creatoIl: adesso - 120000, accodatoIl: adesso - 110000,
            tentativi: 0, ultimoErrore: '', inviatoIl: adesso - 100000, idServer: null, progressivo,
            idBolla: id, pagina: 1, pagine: 1,
          });
          tx.oncomplete = ok;
          tx.onerror = () => ko(tx.error);
        });
        db.close();
        return id;
      }, { b64, cantiere, fase, progressivo });
      await pagina.reload();
      await pagina.waitForSelector(`.bolle-rimanda[data-id="${id}"]`, { timeout: 20000 });
      return id;
    };
    const apriRimanda = async (id, cantiere) => {
      await pagina.click(`.bolle-rimanda[data-id="${id}"]`);
      await pagina.waitForSelector('#r-manda');
      await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${cantiere}|`), `riquadro di ${cantiere} pronto`,
        { prefisso: 'r-' });
    };
    const statoRiquadro = () => pagina.evaluate(() => {
      const menu = document.querySelector('#r-fase');
      const pulsante = document.querySelector('#r-manda');
      return {
        cantiere: document.querySelector('#r-cantiere').value,
        fase: menu.value,
        voce: menu.options[menu.selectedIndex] ? menu.options[menu.selectedIndex].textContent.trim() : '',
        pulsante: pulsante.textContent.trim(),
        spento: pulsante.disabled,
        frase: document.querySelector('#r-spiegazione').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    // La richiesta nuova al flow dopo `prima`, se arriva entro `limite`.
    const nuovaRichiesta = async (prima, limite = 8000) => {
      const fine = Date.now() + limite;
      while (flow.stato.ricevuti.length <= prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      return flow.stato.ricevuti[prima] || null;
    };
    const fraseAttesa = (inizio, fine) =>
      `${inizio} non è fra ${inizio.startsWith('Il lotto') ? 'quelli' : 'quelle'} che si possono scegliere per questo cantiere: ${fine} per rimandarla.`;

    // ================================================================ caso 1
    registro.titolo('Caso 1 · bolla MAR inviata con fase «Interrato» (tolta dal master)');
    const id1 = await iniettaInviata('MAR', 'Interrato');
    await apriRimanda(id1, 'MAR');
    const s1 = await statoRiquadro();
    registro.dice('riquadro appena aperto', s1);
    registro.controlla('caso 1 · il menù della fase sta su «— nessuna fase —»',
      s1.fase === '' && s1.voce === '— nessuna fase —', `«${s1.voce}»`);
    registro.controlla('caso 1 · il pulsante è spento', s1.spento === true, `${s1.pulsante} · ${s1.spento ? 'spento' : 'acceso'}`);
    const frase1 = fraseAttesa('La fase «Interrato»', 'scegli la fase');
    registro.controlla('caso 1 · sotto il pulsante la frase del caso, con «Interrato»', s1.frase === frase1, `«${s1.frase}»`);
    // Il difetto, riprodotto: se il pulsante è acceso lo si preme, e si guarda
    // cosa parte. Sul codice della 0.41.0 parte la bolla con `fase: ""`.
    const prima1 = flow.stato.ricevuti.length;
    if (!s1.spento) await pagina.click('#r-manda');
    const partita1 = s1.spento ? null : await nuovaRichiesta(prima1);
    if (partita1) registro.dice('premuto il pulsante acceso, è partito', `commessa ${partita1.commessa} · fase ${JSON.stringify(partita1.fase)}`);
    registro.controlla('caso 1 · nessuna bolla parte con la fase tolta in silenzio',
      partita1 === null, partita1 ? `partita con fase ${JSON.stringify(partita1.fase)}` : 'niente partito');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
