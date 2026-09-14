// Il controllo di continuità: una sequenza per dispositivo, senza buchi, con
// un titolare stabile. È l'unica cosa che permette di dimostrare che nessuna
// bolla si è persa fra telefono e raccolta — raggruppare per «operatore», che
// è testo libero, spezzerebbe la sequenza a ogni grafia diversa del nome.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const ID_PREESISTENTE = '11111111-2222-3333-4444-555555555555';

module.exports = {
  nome: 'Continuità: progressivo e identità del dispositivo',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });

    const mandaBolla = async (cantiere = 'MAR') => {
      await pagina.goto(app.indirizzo + '/index.html#/bolle');
      await pagina.waitForSelector('#cantiere');
      // Solo le anteprime in attesa: le righe della coda sono un'altra cosa, e
      // contarle insieme faceva aspettare un numero che non arriva mai.
      const prima = await pagina.$$eval('.bolle-anteprima', e => e.length);
      await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
      await aiuto.attendi(pagina, n => document.querySelectorAll('.bolle-anteprima').length > n,
        'anteprima', 60000, prima);
      await pagina.selectOption('#cantiere', cantiere);
      await pagina.click('#invia');
    };

    registro.titolo('Un telefono che usa le bolle da prima di questa versione');
    // L'identificativo viveva nel database delle bolle: va EREDITATO. Se se ne
    // generasse uno nuovo, in raccolta comparirebbero due dispositivi dove ce
    // n'è uno, e la sequenza delle bolle già inviate risulterebbe interrotta.
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#bolle-contatori');
    await pagina.evaluate(id => new Promise(risolvi => {
      const richiesta = indexedDB.open('llitalia-bolle', 4);
      richiesta.onsuccess = () => {
        const db = richiesta.result;
        const tx = db.transaction('contatore', 'readwrite');
        tx.objectStore('contatore').put({ chiave: 'idDispositivo', valore: id });
        tx.oncomplete = () => { db.close(); risolvi(); };
      };
    }), ID_PREESISTENTE);
    await pagina.evaluate(() => { indexedDB.deleteDatabase('llitalia-dispositivo'); });
    await pagina.reload();

    await mandaBolla();
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'prima bolla inviata', 60000);
    registro.dice('idDispositivo nel payload', flow.stato.ricevuti[0].idDispositivo);
    registro.controlla('l\'identificativo è quello che il telefono aveva già',
      flow.stato.ricevuti[0].idDispositivo === ID_PREESISTENTE,
      'rigenerarlo spezzerebbe la sequenza delle bolle già in raccolta');

    const mostrato = await pagina.goto(app.indirizzo + '/index.html#/impostazioni')
      .then(() => aiuto.attendi(pagina, () => {
        const e = document.querySelector('#id-dispositivo');
        return e && e.value && !e.value.startsWith('Lettura') ? e.value : false;
      }, 'identificativo a video', 20000));
    registro.controlla('è lo stesso che si legge nelle impostazioni', mostrato === ID_PREESISTENTE, mostrato);

    registro.titolo('La sequenza non fa buchi');
    await mandaBolla('MNG');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '2',
      'seconda bolla', 60000);

    // Una bolla scartata prima dell'invio non deve consumare un numero: un
    // buco in raccolta si legge come «una bolla non è arrivata».
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.click('.bolle-rimuovi');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 0, 'scartata', 20000);
    await mandaBolla();
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '3',
      'terza bolla', 60000);

    const progressivi = flow.stato.ricevuti.map(r => r.progressivo);
    registro.dice('progressivi ricevuti dal flow', progressivi);
    registro.controlla('sono numeri, non stringhe',
      progressivi.every(p => typeof p === 'number'),
      'una stringa vuota fa fallire la scrittura della colonna e la bolla atterra senza dati');
    registro.controlla('sequenza senza buchi', progressivi.join(',') === '1,2,3',
      'una foto scartata prima dell\'invio non consuma un numero');
    registro.controlla('ogni bolla porta anche operatore e idClient',
      flow.stato.ricevuti.every(r => r.operatore && r.idClient));
    registro.controlla('tutte dallo stesso dispositivo',
      new Set(flow.stato.ricevuti.map(r => r.idDispositivo)).size === 1);

    registro.titolo('Il progressivo sopravvive al cambio di nome dell\'operatore');
    await pagina.goto(app.indirizzo + '/index.html#/impostazioni');
    await pagina.waitForSelector('#autore');
    await pagina.fill('#autore', 'P. Sanzarello');
    await pagina.click('#modulo-impostazioni button[type="submit"]');
    await mandaBolla();
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '4',
      'quarta bolla', 60000);
    const ultima = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('ultima bolla', { operatore: ultima.operatore, progressivo: ultima.progressivo });
    registro.controlla('identificativo invariato', ultima.idDispositivo === ID_PREESISTENTE);
    registro.controlla('progressivo prosegue', ultima.progressivo === 4);

    registro.titolo('Un secondo telefono ha una sequenza sua');
    const secondo = await nuovoTelefono(browser);
    await configura(secondo.pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await secondo.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await secondo.pagina.waitForSelector('#cantiere');
    await secondo.pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(secondo.pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await secondo.pagina.selectOption('#cantiere', 'MAR');
    await secondo.pagina.click('#invia');
    await aiuto.attendi(secondo.pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'bolla del secondo telefono', 60000);
    const daSecondo = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.controlla('ha un identificativo diverso', daSecondo.idDispositivo !== ID_PREESISTENTE);
    registro.controlla('e riparte da 1', daSecondo.progressivo === 1,
      'per questo il numero va sempre letto insieme a idDispositivo');
    const perOperatore = flow.stato.ricevuti.map(r => r.progressivo).join(',');
    registro.dice('raggruppando per operatore la sequenza sarebbe', perOperatore);
    registro.controlla('raggruppando per dispositivo invece torna',
      [...new Set(flow.stato.ricevuti.map(r => r.idDispositivo))]
        .every(id => flow.stato.ricevuti.filter(r => r.idDispositivo === id)
          .map(r => r.progressivo).join(',') === (id === ID_PREESISTENTE ? '1,2,3,4' : '1')));
    await secondo.contesto.close();

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
