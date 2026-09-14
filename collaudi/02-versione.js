// La versione dichiarata deve essere quella che sta GIRANDO, non quella
// installata. La differenza non è accademica: è costata una mattina di
// «l'ho aggiornata e non funziona» su un telefono che il codice nuovo non
// aveva mai eseguito, e manda in raccolta un VersioneApp sbagliato.
const { nuovoTelefono, attendiInstallazione, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Versione in uso e versione pronta',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });
    await attendiInstallazione(pagina);

    registro.titolo('Le due costanti sono allineate');
    const versioni = await pagina.evaluate(async () => {
      const m = await import('./core/versione.js');
      return {
        codice: m.VERSIONE_CODICE,
        inUso: await m.versioneApp(),
        installata: await m.versioneInstallata(),
        aggiornamento: await m.aggiornamentoPronto(),
      };
    });
    registro.dice('versioni', versioni);
    registro.controlla('sw.js e core/versione.js dicono lo stesso numero',
      versioni.codice === versioni.installata,
      'se falliscono qui, una delle due costanti non è stata incrementata al rilascio');
    registro.controlla('nessun aggiornamento in attesa quando coincidono', versioni.aggiornamento === false);

    registro.titolo('Pacchetto nuovo sceso, pagina ancora vecchia');
    // È il caso del difetto: si finge una cache di versione superiore, come
    // dopo un aggiornamento arrivato mentre l'app era in secondo piano.
    await pagina.evaluate(() => caches.open('llitalia-9.9.9'));
    await pagina.goto(app.indirizzo + '/index.html#/informazioni');
    await aiuto.attendi(pagina, () => !document.body.textContent.includes('Lettura in corso'),
      'Informazioni pronta', 20000);
    const info = await pagina.$eval('.info-elenco', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.controlla('dichiara in uso la versione che sta girando',
      info.includes(`Versione in uso${versioni.codice}`), info.slice(0, 80));
    registro.controlla('e segnala separatamente quella pronta', info.includes('Versione pronta9.9.9'));

    await pagina.reload();
    const barra = await pagina.waitForSelector('#avviso-aggiornamento', { timeout: 15000 })
      .then(e => e.textContent(), () => '');
    registro.controlla('all\'apertura compare la barra di avviso', Boolean(barra),
      barra.replace(/\s+/g, ' ').trim());

    registro.titolo('Il payload porta la versione in esecuzione');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');
    await pagina.selectOption('#categoria', 'AVANZAMENTO');
    await pagina.selectOption('#commessa', 'MAR');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 60000);
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#foto-contatori .foto-chip:nth-child(2) .valore').textContent === '1',
      'foto inviata', 60000);
    const inviato = flow.stato.ricevuti[0] || {};
    registro.dice('versioneApp nel payload', inviato.versioneApp);
    registro.controlla('è la versione in esecuzione, non la 9.9.9 installata',
      inviato.versioneApp === versioni.codice);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
