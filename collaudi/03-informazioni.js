// La pagina Informazioni è quella che si guarda quando un operatore telefona
// dal cantiere. Deve dire i numeri di TUTTI i moduli: contava solo le bolle, e
// un telefono con foto ferme in errore risultava «0 in errore».
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Informazioni: i numeri di ogni modulo',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });

    registro.titolo('Si prepara la situazione: 1 bolla inviata, 2 foto rifiutate');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'bolla inviata', 60000);

    flow.stato.stato = 500;   // il flow rifiuta: le foto restano bloccate
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');
    await pagina.selectOption('#categoria', 'AVANZAMENTO');
    await pagina.selectOption('#commessa', 'MAR');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg'), materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 2, 'anteprime', 60000);
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#foto-contatori .foto-chip.errore .valore').textContent === '2',
      'due foto in errore', 60000);

    registro.titolo('La pagina Informazioni');
    await pagina.goto(app.indirizzo + '/index.html#/informazioni');
    await aiuto.attendi(pagina, () => !document.body.textContent.includes('Lettura in corso'), 'pronta', 20000);
    const schede = await pagina.$$eval('.scheda h2', e => e.map(x => x.textContent.trim()));
    registro.dice('schede a video', schede);
    registro.controlla('c\'è una scheda per ogni modulo',
      schede.includes('Bolle') && schede.includes('Foto cantiere'));

    const leggi = () => pagina.evaluate(() => {
      const risultato = {};
      for (const scheda of document.querySelectorAll('.scheda')) {
        const titolo = scheda.querySelector('h2') ? scheda.querySelector('h2').textContent.trim() : '';
        const dl = scheda.querySelector('.info-elenco');
        if (!dl || !['Bolle', 'Foto cantiere'].includes(titolo)) continue;
        const voci = {};
        for (const dt of dl.querySelectorAll('dt')) voci[dt.textContent.trim()] = dt.nextElementSibling.textContent.trim();
        risultato[titolo] = voci;
      }
      return risultato;
    });
    const perModulo = await leggi();
    registro.dice('Bolle', perModulo['Bolle']);
    registro.dice('Foto cantiere', perModulo['Foto cantiere']);
    registro.controlla('le foto bloccate si vedono', (perModulo['Foto cantiere'] || {}).Bloccate === '2 in errore');
    registro.controlla('le bolle non risultano bloccate', (perModulo['Bolle'] || {}).Bloccate === 'nessuna in errore');
    const colore = await pagina.evaluate(() => {
      const dd = document.querySelector('.info-elenco dd.valore-errore');
      return dd ? getComputedStyle(dd).color : '';
    });
    registro.controlla('il numero bloccate è marcato', Boolean(colore), colore);

    registro.titolo('L\'azzeramento è del modulo Bolle e tocca solo le bolle');
    registro.controlla('il riquadro di azzeramento c\'è',
      schede.some(t => t.includes('Riparti col conteggio')));
    await pagina.click('#azzera-bolle');
    await pagina.waitForSelector('#conferma-bolle:not(.nascosto)');
    await pagina.click('#conferma-azzera-bolle');
    const esito = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('#esito-bolle');
      return e && e.textContent.trim().length > 0 ? e.textContent.trim() : false;
    }, 'esito azzeramento', 20000);
    registro.dice('esito', esito);

    // Ricarica vera: un `goto` allo stesso indirizzo non ridisegna, e si
    // leggerebbe la pagina di prima credendo di leggere quella di adesso.
    await pagina.reload();
    await aiuto.attendi(pagina, () => !document.body.textContent.includes('Lettura in corso'), 'pronta', 20000);
    const dopo = await leggi();
    registro.dice('contatori nel telefono', await pagina.evaluate(
      () => localStorage.getItem('llitalia.bolle.contatori')));
    registro.controlla('le foto in errore NON sono state toccate',
      (dopo['Foto cantiere'] || {}).Bloccate === '2 in errore');
    registro.controlla('i contatori delle bolle sono ripartiti da zero',
      (dopo['Bolle'] || {}).Oggi === '0 scattate, 0 inviate', (dopo['Bolle'] || {}).Oggi);

    registro.controllaConsole(errori, ['500']);
    await contesto.close();
  },
};
