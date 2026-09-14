// Quando il flow rifiuta. Due cose devono succedere sempre: la foto RESTA sul
// telefono, e il messaggio dice cosa guardare. Un numero di stato da solo non
// dice niente a chi è in cantiere, e un 502 in particolare non è un problema
// di rete: è il flow terminato senza eseguire nessuna Response.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Errori del flow: niente si perde, e si capisce cosa guardare',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });

    registro.titolo('Il flow risponde 502');
    flow.stato.stato = 502;
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    const messaggio = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('.errore-msg');
      return e && e.textContent.trim() ? e.textContent.trim() : false;
    }, 'messaggio di errore', 60000);
    registro.dice('messaggio a video', messaggio);
    registro.controlla('dice il numero', messaggio.includes('502'));
    registro.controlla('e dice dove guardare', messaggio.includes('cronologia del flow'),
      'un 502 non è la rete: è il flow terminato senza rispondere');
    registro.controlla('la bolla è ancora sul telefono',
      (await pagina.$$eval('.bolle-voce', e => e.length)) === 1);
    registro.controlla('non risulta inviata',
      (await pagina.$eval('#bolle-contatori .bolle-chip:nth-child(2) .valore', e => e.textContent)) === '0');

    registro.titolo('Le spiegazioni dei codici, una sola verità per i due moduli');
    const spiegazioni = await pagina.evaluate(async () => {
      const m = await import('./core/errori.js');
      return [400, 401, 403, 413, 500, 502, 504].map(s => [s, m.spiegazioneStato(s)]);
    });
    for (const [stato, testo] of spiegazioni) registro.dice(String(stato), testo.trim() || '(nessuna)');
    registro.controlla('ogni codice che capita ha una spiegazione',
      spiegazioni.every(([, t]) => t.trim().length > 0),
      'erano scritte due volte, una per modulo, e avevano già iniziato a divergere');

    registro.titolo('Sistemato il flow, la bolla parte da sola');
    flow.stato.stato = 200;
    const partita = await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'invio automatico al retry', 90000).catch(() => false);
    registro.controlla('riparte da sola col backoff, senza toccare niente', Boolean(partita));
    const arrivate = flow.stato.ricevuti.filter(r => r.idClient);
    registro.dice('progressivo arrivato', arrivate[arrivate.length - 1].progressivo);
    registro.controlla('il progressivo non è cambiato dopo l\'errore',
      arrivate[arrivate.length - 1].progressivo === 1,
      'si assegna all\'accodamento: un tentativo fallito non consuma un numero');
    registro.controlla('lo stesso idClient in tutti i tentativi',
      new Set(arrivate.map(r => r.idClient)).size === 1,
      'è quello che permette al flow di scartare i doppioni');

    registro.controllaConsole(errori, ['502']);
    await contesto.close();
  },
};
