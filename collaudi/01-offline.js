// L'app senza rete. È il principio numero uno del progetto, quindi è il primo
// collaudo: la rete non si simula col browser — non fermerebbe le richieste
// del service worker — si SPEGNE il server che serve l'app.
const { nuovoTelefono, attendiInstallazione, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Senza rete',
  descrizione: 'Installa l\'app, spegne il server, e verifica cosa continua a funzionare.',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });

    registro.titolo('Installazione');
    const risorse = await attendiInstallazione(pagina);
    registro.dice('risorse nel precache', risorse);

    // Da qui in poi è cantiere senza campo: sparisce l'app E sparisce il
    // magazzino. Spegnere solo il primo farebbe partire gli invii lo stesso.
    await app.chiudi();
    await flow.sospendi();
    // E il telefono si mette in modalità aereo: serve a far dire «no» anche a
    // navigator.onLine, che è quello che l'app guarda per lasciare le foto in
    // coda invece di segnarle in errore. I due server spenti restano
    // indispensabili lo stesso, perché il service worker non passa da qui.
    await contesto.setOffline(true);
    registro.titolo('Server spenti e telefono senza campo');

    await pagina.goto(app.indirizzo + '/index.html#/home');
    const home = await pagina.evaluate(() => (document.getElementById('vista') || {}).textContent || '');
    registro.controlla('l\'app si apre', home.trim().length > 0);
    const tessere = await pagina.$$eval('.tessera, .tessera-titolo', e => e.length);
    registro.controlla('la home mostra le tessere dei moduli', tessere > 0, `${tessere} elementi`);

    const rotte = [
      ['#/bolle', '#bolle-contatori', 'modulo Bolle'],
      ['#/foto', '#categoria', 'modulo Foto cantiere'],
      ['#/bolle/storico', '.bolle-calendario', 'storico delle bolle'],
      ['#/impostazioni', '#autore', 'impostazioni dell\'app'],
      ['#/bolle/impostazioni', '#endpoint', 'impostazioni Bolle'],
      ['#/foto/impostazioni', '#endpoint', 'impostazioni Foto'],
      ['#/informazioni', '.info-elenco', 'pagina Informazioni'],
    ];
    for (const [rotta, selettore, nome] of rotte) {
      await pagina.goto(app.indirizzo + '/index.html' + rotta);
      let apre = false;
      try { await pagina.waitForSelector(selettore, { timeout: 8000 }); apre = true; } catch { /* non si apre */ }
      registro.controlla(`si apre ${nome}`, apre);
    }

    // Il QR serve proprio qui: due telefoni in cantiere, nessun campo. Il
    // generatore si carica a richiesta, quindi è il candidato naturale a
    // mancare dal precache — ed è esattamente quello che è successo.
    for (const [rotta, nome] of [['#/bolle/condividi', 'Bolle'], ['#/foto/condividi', 'Foto cantiere']]) {
      await pagina.goto(app.indirizzo + '/index.html' + rotta);
      await pagina.waitForSelector('#qr', { timeout: 10000 });
      const disegnato = await aiuto.attendi(pagina, () => Boolean(document.querySelector('#qr svg')),
        `QR di ${nome}`, 15000).catch(() => false);
      registro.controlla(`il QR di ${nome} si disegna senza rete`, Boolean(disegnato),
        disegnato ? '' : await pagina.$eval('#qr', e => e.textContent.trim()));
    }

    // I moduli caricati a richiesta: se uno non è in cache, offline sparisce
    // la funzione che serve, senza che nessuno se ne accorga prima.
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#bolle-contatori');
    const aRichiesta = await pagina.evaluate(async () => {
      const esiti = {};
      for (const m of ['./core/fotocamera.js', './core/vendor/qrcode.mjs', './modules/foto/caricamento.js']) {
        try { await import(m); esiti[m] = true; } catch { esiti[m] = false; }
      }
      return esiti;
    });
    for (const [modulo, ok] of Object.entries(aRichiesta)) {
      registro.controlla(`si carica ${modulo}`, ok);
    }

    registro.titolo('Una bolla scattata senza rete non si perde');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1,
      'anteprima della bolla', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    const contatori = await aiuto.attendi(pagina, () => {
      const chip = [...document.querySelectorAll('#bolle-contatori .bolle-chip')]
        .map(c => c.textContent.replace(/\s+/g, ' ').trim());
      const inAttesa = document.querySelector('#bolle-contatori .bolle-chip:nth-child(3) .valore');
      return inAttesa && inAttesa.textContent !== '0' ? chip : false;
    }, 'la bolla resta in coda', 60000);
    registro.dice('contatori', contatori);
    registro.controlla('la bolla è IN CODA, non inviata e non persa',
      contatori[1].startsWith('0') && !contatori[2].startsWith('0'),
      'in attesa, non in errore: senza campo si riprova, non si segnala un guasto');
    registro.controlla('il flow non ha ricevuto niente', flow.stato.ricevuti.length === 0,
      `${flow.stato.ricevuti.length} invii`);

    registro.titolo('Torna la rete');
    await app.riavvia();
    await flow.riprendi();
    await contesto.setOffline(false);
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    const inviate = await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'la bolla parte da sola', 90000).catch(() => false);
    registro.controlla('la bolla parte da sola al ritorno del campo', Boolean(inviate));
    registro.dice('progressivo arrivato al flow', flow.stato.ricevuti.map(r => r.progressivo));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
