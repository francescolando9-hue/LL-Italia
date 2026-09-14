// Una bolla su più fogli è UNA bolla. L'app deve permettere di dichiararlo
// prima dello scatto successivo — cioè quando si sa se la bolla continua — e
// deve lasciare una via d'uscita se il raggruppamento è stato fatto per
// sbaglio, senza cancellare le foto già scattate.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Bolle su più pagine',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');

    const testo = sel => pagina.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
    const aggiungi = async (file, atteso) => {
      await pagina.setInputFiles('#input-galleria', [materiale(file)]);
      await aiuto.attendi(pagina, n => document.querySelectorAll('.bolle-anteprima').length === n,
        `anteprime: ${atteso}`, 60000, atteso);
    };

    registro.titolo('Dopo la prima foto');
    await aggiungi('bolla.jpg', 1);
    registro.controlla('il riquadro delle pagine è già visibile',
      await pagina.$('#riquadro-pagine') !== null,
      'compariva solo da due foto in su, cioè dopo che la scelta era già stata fatta');
    registro.dice('cosa dice', await testo('#stato-bolla'));
    registro.dice('pulsante di invio', await testo('#invia'));
    registro.controlla('propone di aggiungere una pagina', Boolean(await pagina.$('#aggiungi-pagina')));

    registro.titolo('Si dichiara che la bolla continua');
    await pagina.click('#aggiungi-pagina');
    await aggiungi('bolla2.jpg', 2);
    registro.dice('cosa dice', await testo('#stato-bolla'));
    registro.dice('pulsante di invio', await testo('#invia'));
    const numerate = await pagina.$$eval('.bolle-pagina', e => e.map(x => x.textContent.trim()));
    registro.dice('anteprime numerate', numerate);
    registro.controlla('le pagine sono numerate a video', numerate.join(',') === 'pag. 1,pag. 2');
    registro.controlla('c\'è la via d\'uscita', Boolean(await pagina.$('#separa-pagine')),
      'se il raggruppamento è sbagliato si torna indietro senza perdere le foto');

    registro.titolo('Invio della bolla di due pagine');
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '2',
      'bolla di due pagine inviata', 60000);
    const gruppo = flow.stato.ricevuti.slice(0, 2);
    registro.dice('pagine arrivate', gruppo.map(r => `${r.pagina}/${r.pagine}`));
    registro.controlla('un solo idBolla per le due pagine',
      gruppo[0].idBolla && gruppo[0].idBolla === gruppo[1].idBolla);
    registro.controlla('numerate 1/2 e 2/2',
      gruppo.map(r => `${r.pagina}/${r.pagine}`).join(',') === '1/2,2/2');
    registro.controlla('ogni pagina ha il suo progressivo',
      gruppo[0].progressivo === 1 && gruppo[1].progressivo === 2,
      'il progressivo conta le foto, non le bolle: è quello che il runbook confronta');

    registro.titolo('La composizione si azzera da sola');
    await aggiungi('bolla.jpg', 1);
    registro.dice('cosa dice', await testo('#stato-bolla'));
    registro.controlla('la foto dopo è di nuovo una bolla singola',
      (await testo('#invia')).includes('1 bolla') && !(await testo('#invia')).includes('pagine'));
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '3',
      'bolla singola inviata', 60000);
    const singola = flow.stato.ricevuti[2];
    registro.controlla('parte come 1/1', `${singola.pagina}/${singola.pagine}` === '1/1');
    registro.controlla('con un idBolla diverso dal gruppo', singola.idBolla !== gruppo[0].idBolla);

    registro.titolo('Il ripensamento: «non sono la stessa bolla»');
    await aggiungi('bolla.jpg', 1);
    await pagina.click('#aggiungi-pagina');
    await aggiungi('bolla2.jpg', 2);
    await pagina.click('#separa-pagine');
    // Il ridisegno è asincrono: leggere il pulsante subito dopo il tocco
    // significa leggere quello di prima.
    const dopoSeparazione = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('#invia');
      const t = e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
      return t.includes('separate') ? t : false;
    }, 'pulsante aggiornato dopo la separazione', 20000).catch(() => testo('#invia'));
    registro.dice('pulsante di invio', dopoSeparazione);
    registro.controlla('tornano due bolle distinte', String(dopoSeparazione).includes('2 bolle separate'));
    registro.controlla('le foto non sono state cancellate',
      (await pagina.$$eval('.bolle-anteprima', e => e.length)) === 2);
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '5',
      'due bolle separate', 60000);
    const separate = flow.stato.ricevuti.slice(3, 5);
    registro.controlla('sono davvero due bolle',
      separate[0].idBolla !== separate[1].idBolla
      && separate.every(r => `${r.pagina}/${r.pagine}` === '1/1'));

    registro.dice('progressivi in tutto', flow.stato.ricevuti.map(r => r.progressivo));
    registro.controlla('nessun buco nella sequenza',
      flow.stato.ricevuti.map(r => r.progressivo).join(',') === '1,2,3,4,5');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
