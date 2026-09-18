// Telefono pieno: lo scatto NON entra in coda, ed è il punto in cui la
// promessa «la foto non si perde» passa nelle mani dell'operatore. Lo spazio
// si restringe per davvero, con l'override di quota del browser: simulare
// l'errore a parole proverebbe solo che la funzione che lo traduce funziona.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Memoria del telefono piena',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 25 },
    });

    const cdp = await contesto.newCDPSession(pagina);
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: app.indirizzo, quotaSize: 1024 * 1024 });
    registro.titolo('Quota del sito ridotta a 1 MB');

    const pesante = materiale('foto-pesante.jpg');
    registro.dice('foto di prova', `${(require('fs').statSync(pesante).size / 1048576).toFixed(2)} MB`);

    const messaggio = async () => pagina.evaluate(() => {
      const e = document.querySelector('#avviso-foto');
      return e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    });
    // «Preparazione»/«Elaborazione» sono i messaggi di lavoro in corso:
    // leggerli significa misurare a metà.
    const attendiEsito = (selettoreAnteprime) => aiuto.attendi(pagina, sel => {
      const a = document.querySelector('#avviso-foto');
      const pronto = a && a.textContent.trim().length > 0 && !/Preparazione|Elaborazione/.test(a.textContent);
      return pronto || document.querySelectorAll(sel).length > 0;
    }, 'esito dell\'aggiunta', 90000, selettoreAnteprime);

    registro.titolo('Modulo Foto');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');
    await pagina.selectOption('#categoria', 'ARCHIVIO');
    await pagina.selectOption('#commessa', 'MAR');
    await pagina.setInputFiles('#input-galleria', [pesante]);
    await attendiEsito('.foto-anteprima');
    const testoFoto = await messaggio();
    registro.dice('messaggio', testoFoto);
    registro.controlla('dice che la memoria è piena, in italiano',
      /Memoria del telefono piena/.test(testoFoto));
    registro.controlla('dice che la foto NON è stata salvata', /NON è stata salvata/.test(testoFoto));
    registro.controlla('e infatti non è in coda',
      (await pagina.$$eval('.foto-anteprima', e => e.length)) === 0);

    registro.titolo('Modulo Bolle');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.setInputFiles('#input-galleria', [pesante]);
    await attendiEsito('.bolle-anteprima');
    const testoBolle = await messaggio();
    registro.dice('messaggio', testoBolle);
    registro.controlla('stesso messaggio, con la parola giusta per il modulo',
      /Memoria del telefono piena/.test(testoBolle) && /la bolla/.test(testoBolle));
    registro.controlla('e infatti non è in coda',
      (await pagina.$$eval('.bolle-anteprima', e => e.length)) === 0);

    registro.titolo('Riconoscimento dell\'errore, browser per browser');
    const mappa = await pagina.evaluate(async () => {
      const m = await import('./core/errori.js');
      const casi = [
        ['QuotaExceededError (Chrome)', Object.assign(new Error('Failed to execute \'add\' on \'IDBObjectStore\''), { name: 'QuotaExceededError' })],
        ['NS_ERROR_DOM_QUOTA_REACHED (Firefox)', Object.assign(new Error('persistent storage'), { name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 1014 })],
        ['errore IndexedDB generico', Object.assign(new Error('Failed to execute \'add\' on \'IDBObjectStore\': boh'), { name: 'DataError' })],
        ['messaggio già in italiano', new Error('Formato non supportato')],
      ];
      return casi.map(([nome, e]) => [nome, m.memoriaPiena(e), m.messaggioSalvataggio(e, 'la foto')]);
    });
    for (const [nome, piena, testo] of mappa) registro.dice(nome, `piena=${piena} → ${testo}`);
    registro.controlla('riconosce la quota di Chrome', mappa[0][1] === true);
    registro.controlla('riconosce la quota di Firefox', mappa[1][1] === true);
    registro.controlla('non confonde un errore generico con la memoria piena', mappa[2][1] === false);
    registro.controlla('un errore generico esce comunque in italiano',
      /Non è stato possibile salvare/.test(mappa[2][2]));
    registro.controlla('un messaggio già in italiano passa invariato', mappa[3][2] === 'Formato non supportato');

    registro.titolo('Tolta la restrizione');
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: app.indirizzo });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');
    await pagina.selectOption('#categoria', 'AVANZAMENTO');
    await pagina.selectOption('#commessa', 'MAR');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    const rientrata = await aiuto.attendi(pagina,
      () => document.querySelectorAll('.foto-anteprima').length >= 1, 'foto in coda', 60000).catch(() => false);
    registro.controlla('la foto torna a entrare in coda', Boolean(rientrata));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
