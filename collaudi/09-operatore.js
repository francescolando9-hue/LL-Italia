// Il nome dell'operatore si sceglie da un elenco chiuso. Scritto a mano, la
// stessa persona diventa «Paolo Sanzarello», «Paolo», «Sanzarello» e ogni
// refuso possibile: in raccolta sembrano cinque persone, e qualunque conteggio
// per operatore smette di valere.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Operatore: elenco chiuso, niente refusi',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);

    registro.titolo('Prima apertura: si sceglie, non si scrive');
    // Nessun autore salvato: l'app deve mandare al benvenuto.
    await pagina.goto(app.indirizzo + '/index.html');
    await pagina.evaluate(dati => {
      localStorage.clear();
      localStorage.setItem('llitalia.bolle', JSON.stringify(dati));
    }, { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20, ultimaFase: 'Murature' });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#autore', { timeout: 20000 });

    const tipo = await pagina.$eval('#autore', e => e.tagName.toLowerCase());
    registro.controlla('il campo è un menù a tendina, non testo libero', tipo === 'select', tipo);

    const elenco = await pagina.$$eval('#autore option', o => o.map(e => ({ v: e.value, t: e.textContent.trim() })));
    const nomi = elenco.filter(o => o.v).map(o => o.t);
    registro.dice('nomi selezionabili', nomi);
    registro.controlla('ci sono i nove nomi concordati', nomi.length === 9);
    registro.controlla('nell\'ordine dato, non alfabetico',
      nomi[0] === 'Paolo Sanzarello' && nomi[nomi.length - 1] === 'Francesco Lando');

    const primo = elenco[0];
    registro.controlla('parte da un segnaposto, non da un nome',
      primo.v === '' && /scegli/i.test(primo.t), primo.t);
    registro.controlla('il segnaposto non è selezionabile come nome',
      await pagina.$eval('#autore option:first-child', e => e.disabled),
      'altrimenti basta non guardare per firmare a nome di Paolo');

    // Senza scelta non si va avanti.
    await pagina.click('#modulo-benvenuto button[type="submit"]');
    registro.controlla('senza scegliere non si prosegue',
      (await pagina.evaluate(() => localStorage.getItem('llitalia.app'))) === null,
      'nessun autore salvato');

    registro.titolo('Scelto un nome, l\'invio lo porta con sé');
    await pagina.selectOption('#autore', 'Rosario Incarbone');
    await pagina.click('#modulo-benvenuto button[type="submit"]');
    // Dopo il benvenuto si atterra in home, non su un modulo: le tessere sono
    // due, e l'app non sceglie per l'operatore.
    await pagina.waitForSelector('.tessera, .tessera-titolo', { timeout: 20000 });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere', { timeout: 20000 });
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'bolla inviata', 60000);
    registro.dice('operatore arrivato al flow', flow.stato.ricevuti[0].operatore);
    registro.controlla('è esattamente il nome dell\'elenco',
      flow.stato.ricevuti[0].operatore === 'Rosario Incarbone');

    registro.titolo('Telefono aggiornato da una versione col campo libero');
    const casi = [
      ['Paolo Sanzarello', 'Paolo Sanzarello', 'grafia esatta: si tiene'],
      ['paolo  sanzarello', 'Paolo Sanzarello', 'maiuscole e spazi doppi: si riporta alla grafia ufficiale'],
      ['P. Sanzarello', '', 'abbreviato: NON si indovina, si richiede la scelta'],
      ['Mario Rossi', '', 'nome non in elenco: si richiede la scelta'],
      ['', '', 'vuoto: si richiede la scelta'],
    ];
    for (const [salvato, atteso, perche] of casi) {
      const letto = await pagina.evaluate(async nome => {
        localStorage.setItem('llitalia.app', JSON.stringify({ autore: nome }));
        const m = await import('./core/impostazioni.js');
        return m.impostazioniApp.autore;
      }, salvato);
      registro.controlla(`«${salvato}» → ${atteso ? `«${atteso}»` : 'nessun operatore'}`,
        letto === atteso, perche);
    }

    registro.titolo('Un nome non riconosciuto riporta al benvenuto');
    await pagina.evaluate(() => localStorage.setItem('llitalia.app', JSON.stringify({ autore: 'P. Sanzarello' })));
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#autore, #categoria', { timeout: 20000 });
    const dove = await pagina.evaluate(() => location.hash);
    registro.controlla('l\'app chiede di scegliere invece di mandare un nome sbagliato',
      dove.includes('benvenuto'), dove);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
